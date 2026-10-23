import { NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/contracts";
import { SUPPORT_ADDRESS, decodeGraffiti } from "@/lib/support";
import { priceSeries, priceAt, type CoinId, type Series } from "@/lib/priceHistory";
import { countedAmount, isRunning, loadStreams } from "@/lib/backerStreamsServer";

// Supporter board data — rebuilt entirely from public chain data.
//
// 1. Blockscout lists every ERC-20 Transfer into SUPPORT_ADDRESS (the BTC and
//    MEZO precompiles emit standard Transfer events, so all three tokens show
//    up here), plus plain native BTC sends via the transactions endpoint.
// 2. The RPC gives us each donation transaction's input data, from which we
//    decode the optional "vezo:<name>" / "vezo:anon" graffiti the donate flow
//    appends to the transfer calldata.
//
// What counts as support. The wallet is also used to manage the funds (swaps,
// approvals), so "anything that arrives" is not enough:
//   a. Someone else signed it. Tokens that land in a transaction the support
//      wallet sent itself (swap output, refunds) are our own money moving.
//   b. It is worth at least MIN_USD when it arrived. Dust and gas top-ups
//      are not contributions.
//   c. The sender is not one of our own wallets (SUPPORT_IGNORE_SENDERS).
//
// No database anywhere: names, amounts, and ranks are all reconstructable by
// anyone from the explorer. Cached for 60s at the edge.

// Rendered per request, cached at the edge for a minute. This used to be
// ISR (revalidate = 60), which serves the stored copy and refreshes it in the
// background, so on a quiet route the first visitor after a lull saw figures
// from the last visit, days old. A short shared cache keeps it fresh and cheap.
export const dynamic = "force-dynamic";

const EXPLORER_API = "https://api.explorer.mezo.org/api/v2";
const RPC = CONTRACTS.mainnet.rpcUrl;
// 50 items a page. Stream payouts from the recurring support contract also
// land here (and are dropped below), so the window has room for many of them.
const MAX_PAGES = 40;
const MIN_USD = 1;
// Used only when price history can't be loaded, so the floor still applies.
const MIN_UNITS: Record<"BTC" | "MEZO" | "MUSD", bigint> = {
  BTC: 10n ** 13n, // 0.00001 BTC
  MEZO: 100n * 10n ** 18n,
  MUSD: 10n ** 18n,
};
// Our own wallets (gas top-ups, moving funds in). Server-only, comma separated.
const IGNORED_SENDERS = new Set(
  [
    // Recurring support pays out from its contract; those streams are listed
    // in their own section, so they are not counted again here.
    CONTRACTS.mainnet.backerStreams,
    ...(process.env.SUPPORT_IGNORE_SENDERS ?? "").split(","),
  ]
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
);

const TOKEN_BY_ADDR: Record<string, "BTC" | "MEZO" | "MUSD"> = {
  [CONTRACTS.mainnet.BTC.toLowerCase()]: "BTC",
  [CONTRACTS.mainnet.MEZO.toLowerCase()]: "MEZO",
  [CONTRACTS.mainnet.MUSD.toLowerCase()]: "MUSD",
};

interface RawDonation {
  hash: string;
  from: string;
  token: "BTC" | "MEZO" | "MUSD";
  value: bigint;
  timestamp: string | null;
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    // Blockscout 404s for addresses it has never seen — that's just "no donations yet".
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toQuery(params: Record<string, unknown> | null | undefined): string {
  if (!params) return "";
  return (
    "&" +
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&")
  );
}

async function fetchPaged(path: string, filterQuery: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let next: Record<string, unknown> | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchJson(`${EXPLORER_API}${path}?${filterQuery}${toQuery(next)}`);
    if (!data) break;
    items.push(...((data.items as Record<string, unknown>[] | undefined) ?? []));
    next = (data.next_page_params as Record<string, unknown> | null) ?? null;
    if (!next) break;
  }
  return items;
}

/** Batch eth_getTransactionByHash: graffiti from the input, and who signed it. */
async function fetchTxs(hashes: string[]): Promise<Map<string, { input: string; from: string }>> {
  const inputs = new Map<string, { input: string; from: string }>();
  const CHUNK = 20;
  for (let i = 0; i < hashes.length; i += CHUNK) {
    const batch = hashes.slice(i, i + CHUNK).map((h, j) => ({
      jsonrpc: "2.0",
      id: j,
      method: "eth_getTransactionByHash",
      params: [h],
    }));
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(batch),
        next: { revalidate: 3600 }, // tx inputs are immutable
      });
      if (!res.ok) continue;
      const results = (await res.json()) as { id: number; result?: { hash: string; input: string; from: string } }[];
      for (const r of Array.isArray(results) ? results : []) {
        if (r?.result?.hash && typeof r.result.input === "string") {
          inputs.set(r.result.hash.toLowerCase(), {
            input: r.result.input,
            from: String(r.result.from ?? "").toLowerCase(),
          });
        }
      }
    } catch {
      // names degrade to short addresses; amounts are unaffected
    }
  }
  return inputs;
}

export async function GET() {
  const addr = SUPPORT_ADDRESS.toLowerCase();

  const [transfers, txs, sent] = await Promise.all([
    fetchPaged(`/addresses/${SUPPORT_ADDRESS}/token-transfers`, "filter=to"),
    fetchPaged(`/addresses/${SUPPORT_ADDRESS}/transactions`, "filter=to"),
    fetchPaged(`/addresses/${SUPPORT_ADDRESS}/transactions`, "filter=from"),
  ]);
  // Rule a: transactions the support wallet signed itself.
  const selfSent = new Set(sent.map((t) => String(t.hash ?? "").toLowerCase()).filter(Boolean));

  const donations = new Map<string, RawDonation>();

  for (const t of transfers) {
    const token = t.token as Record<string, unknown> | undefined;
    const tokenAddr = String(token?.address_hash ?? token?.address ?? "").toLowerCase();
    const sym = TOKEN_BY_ADDR[tokenAddr];
    const to = (t.to as Record<string, unknown> | undefined)?.hash;
    const from = (t.from as Record<string, unknown> | undefined)?.hash;
    const total = t.total as Record<string, unknown> | undefined;
    const hash = String(t.transaction_hash ?? t.tx_hash ?? "").toLowerCase();
    if (!sym || !hash || !from || String(to).toLowerCase() !== addr) continue;
    if (selfSent.has(hash) || IGNORED_SENDERS.has(String(from).toLowerCase())) continue;
    let value: bigint;
    try {
      value = BigInt(String(total?.value ?? "0"));
    } catch {
      continue;
    }
    if (value <= 0n) continue;
    donations.set(`${hash}:${tokenAddr}`, {
      hash,
      from: String(from).toLowerCase(),
      token: sym,
      value,
      timestamp: (t.timestamp as string | undefined) ?? null,
    });
  }

  // Plain native BTC sends (someone pasting the address into a wallet). If the
  // precompile also logged a Transfer for the same tx, the hash check skips it.
  const loggedHashes = new Set([...donations.values()].map((d) => d.hash));
  for (const t of txs) {
    const hash = String(t.hash ?? "").toLowerCase();
    const from = (t.from as Record<string, unknown> | undefined)?.hash;
    const to = (t.to as Record<string, unknown> | undefined)?.hash;
    if (!hash || loggedHashes.has(hash) || !from) continue;
    if (String(to).toLowerCase() !== addr) continue;
    if (selfSent.has(hash) || IGNORED_SENDERS.has(String(from).toLowerCase())) continue;
    if (t.status && t.status !== "ok") continue;
    let value: bigint;
    try {
      value = BigInt(String(t.value ?? "0"));
    } catch {
      continue;
    }
    if (value <= 0n) continue;
    donations.set(`${hash}:native`, {
      hash,
      from: String(from).toLowerCase(),
      token: "BTC",
      value,
      timestamp: (t.timestamp as string | undefined) ?? null,
    });
  }

  const candidates = [...donations.values()].sort(
    (a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()
  );

  const txInfo = await fetchTxs([...new Set(candidates.map((d) => d.hash))]);
  // Rule a again, from the node: covers a self-sent tx the explorer list missed.
  const signedByOthers = candidates.filter((d) => txInfo.get(d.hash)?.from !== addr);

  interface Donor {
    address: string;
    name: string | null;
    anon: boolean;
    BTC: bigint;
    MEZO: bigint;
    MUSD: bigint;
    count: number;
    firstAt: string | null;
    lastAt: string | null;
    usd: number;
    /** Supports through a recurring stream. */
    monthly: boolean;
  }
  const donors = new Map<string, Donor>();

  // Each contribution is valued at its token's price in the hour it arrived,
  // the same rule as the marketplace figures. If history can't be loaded the
  // dollar fields are null and the page falls back to live prices.
  const COIN: Record<RawDonation["token"], CoinId> = { BTC: "bitcoin", MEZO: "mezo", MUSD: "mezo-usd" };
  const secOf = (d: RawDonation) => Math.floor(new Date(d.timestamp ?? Date.now()).getTime() / 1000);
  let usdOk = true;
  const series: Partial<Record<RawDonation["token"], Series>> = {};
  try {
    for (const t of ["BTC", "MEZO", "MUSD"] as const) {
      const ts = signedByOthers.filter((d) => d.token === t).map(secOf);
      if (ts.length) series[t] = await priceSeries(COIN[t], ts);
    }
  } catch {
    usdOk = false;
  }
  const usdOf = (d: RawDonation): number | null => {
    if (!usdOk) return null;
    // Within the last hour CoinGecko may not have a point yet: use the latest.
    const s = series[d.token] ?? [];
    const px = priceAt(s, secOf(d) * 1000) ?? (s.length && Date.now() - s[s.length - 1][0] < 6 * 3_600_000 ? s[s.length - 1][1] : null);
    if (px === null) { usdOk = false; return null; }
    return (Number(d.value) / 1e18) * px;
  };
  // Rule b: value every candidate first; prices are all-or-nothing (usdOk).
  const valued = signedByOthers.map((d) => ({ d, v: usdOf(d) }));
  const all = valued
    .filter(({ d, v }) => (usdOk && v !== null ? v >= MIN_USD : d.value >= MIN_UNITS[d.token]))
    .map(({ d }) => d);
  const usdByTx = new Map(valued.map(({ d, v }) => [`${d.hash}:${d.token}`, v]));

  const totalsUsd = { BTC: 0, MEZO: 0, MUSD: 0 };

  for (const d of all) {
    const v = usdOk ? usdByTx.get(`${d.hash}:${d.token}`) ?? null : null;
    if (v !== null) totalsUsd[d.token] += v;
    const donor = donors.get(d.from) ?? {
      address: d.from,
      name: null,
      anon: false,
      BTC: 0n,
      MEZO: 0n,
      MUSD: 0n,
      count: 0,
      // `all` is oldest first, so the first contribution seen is the earliest.
      firstAt: d.timestamp,
      lastAt: null,
      usd: 0,
      monthly: false,
    };
    donor[d.token] += d.value;
    donor.usd += v ?? 0;
    donor.count += 1;
    donor.lastAt = d.timestamp ?? donor.lastAt;
    // Latest graffiti wins, so a donor can rename (or go anonymous) later.
    const g = decodeGraffiti(txInfo.get(d.hash)?.input);
    if (g) {
      donor.anon = g.anon;
      donor.name = g.anon ? null : g.name;
    }
    donors.set(d.from, donor);
  }

  // Recurring support counts in the same board and the same total, under the
  // backer's address, valued at today's price. A running stream counts the
  // deposit its backer committed; a paused, canceled or finished one counts
  // what actually reached Vezo. The stream contract's own payouts were left
  // out above, so nothing counts twice.
  let streamCount = 0;
  try {
    // Vezo's own wallets never count as supporters, as with one-off transfers.
    // loadStreams already applies the listing rule (running, or paid MIN_LISTED).
    const streams = (await loadStreams()).filter((st) => st.backer !== addr && !IGNORED_SENDERS.has(st.backer));
    const nowSec = Math.floor(Date.now() / 1000);
    const latest: Partial<Record<RawDonation["token"], number | null>> = {};
    for (const t of ["BTC", "MEZO", "MUSD"] as const) {
      if (!streams.some((st) => st.token === t)) continue;
      try {
        const sr = series[t] ?? (await priceSeries(COIN[t], [nowSec]));
        latest[t] = priceAt(sr, nowSec * 1000) ?? (sr.length ? sr[sr.length - 1][1] : null);
      } catch { latest[t] = null; }
    }
    for (const st of streams) {
      const amt = countedAmount(st);
      const px = latest[st.token];
      const v = px ? (Number(amt) / 1e18) * px : null;
      if (v === null) usdOk = false; else totalsUsd[st.token] += v;
      const donor = donors.get(st.backer) ?? {
        address: st.backer, name: null, anon: false, BTC: 0n, MEZO: 0n, MUSD: 0n,
        count: 0, firstAt: st.createdAt, lastAt: st.createdAt, usd: 0, monthly: true,
      };
      donor[st.token] += amt;
      donor.usd += v ?? 0;
      donor.count += 1;
      donor.monthly = true;
      if (!donor.name && !donor.anon && st.name) donor.name = st.name;
      if (st.createdAt && (!donor.firstAt || st.createdAt < donor.firstAt)) donor.firstAt = st.createdAt;
      // A running stream is paying right now, so it counts as the latest
      // activity. A finished one keeps the Active status on-chain, so it doesn't.
      if (isRunning(st)) donor.lastAt = new Date().toISOString();
      donors.set(st.backer, donor);
      streamCount += 1;
    }
  } catch {
    // Streams unavailable: the board still shows one-off contributions.
  }

  const totals = { BTC: 0n, MEZO: 0n, MUSD: 0n };
  for (const d of donors.values()) {
    totals.BTC += d.BTC;
    totals.MEZO += d.MEZO;
    totals.MUSD += d.MUSD;
  }

  return NextResponse.json({
    address: SUPPORT_ADDRESS,
    donors: [...donors.values()].map((d) => ({
      ...d,
      BTC: d.BTC.toString(),
      MEZO: d.MEZO.toString(),
      MUSD: d.MUSD.toString(),
      usd: usdOk ? d.usd : null,
    })),
    totals: { BTC: totals.BTC.toString(), MEZO: totals.MEZO.toString(), MUSD: totals.MUSD.toString() },
    // Dollar value at the time of each contribution; null if prices were unavailable.
    totalsUsd: usdOk ? totalsUsd : null,
    totalUsd: usdOk ? totalsUsd.BTC + totalsUsd.MEZO + totalsUsd.MUSD : null,
    donationCount: all.length + streamCount,
    updatedAt: Date.now(),
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } });
}
