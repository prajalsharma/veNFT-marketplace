import { NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/contracts";
import { SUPPORT_ADDRESS, decodeGraffiti } from "@/lib/support";

// Supporter board data — rebuilt entirely from public chain data.
//
// 1. Blockscout lists every ERC-20 Transfer into SUPPORT_ADDRESS (the BTC and
//    MEZO precompiles emit standard Transfer events, so all three tokens show
//    up here), plus plain native BTC sends via the transactions endpoint.
// 2. The RPC gives us each donation transaction's input data, from which we
//    decode the optional "vezo:<name>" / "vezo:anon" graffiti the donate flow
//    appends to the transfer calldata.
//
// No database anywhere: names, amounts, and ranks are all reconstructable by
// anyone from the explorer. Cached for 60s at the edge.

export const revalidate = 60;

const EXPLORER_API = "https://api.explorer.mezo.org/api/v2";
const RPC = CONTRACTS.mainnet.rpcUrl;
const MAX_PAGES = 6; // 50 items/page — lifts trivially if the board outgrows it

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
      next: { revalidate: 60 },
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

/** Batch eth_getTransactionByHash to recover graffiti from donation inputs. */
async function fetchInputs(hashes: string[]): Promise<Map<string, string>> {
  const inputs = new Map<string, string>();
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
      const results = (await res.json()) as { id: number; result?: { hash: string; input: string } }[];
      for (const r of Array.isArray(results) ? results : []) {
        if (r?.result?.hash && typeof r.result.input === "string") {
          inputs.set(r.result.hash.toLowerCase(), r.result.input);
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

  const [transfers, txs] = await Promise.all([
    fetchPaged(`/addresses/${SUPPORT_ADDRESS}/token-transfers`, "filter=to"),
    fetchPaged(`/addresses/${SUPPORT_ADDRESS}/transactions`, "filter=to"),
  ]);

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

  const all = [...donations.values()].sort(
    (a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()
  );

  const inputs = await fetchInputs([...new Set(all.map((d) => d.hash))]);

  interface Donor {
    address: string;
    name: string | null;
    anon: boolean;
    BTC: bigint;
    MEZO: bigint;
    MUSD: bigint;
    count: number;
    lastAt: string | null;
  }
  const donors = new Map<string, Donor>();

  for (const d of all) {
    const donor = donors.get(d.from) ?? {
      address: d.from,
      name: null,
      anon: false,
      BTC: 0n,
      MEZO: 0n,
      MUSD: 0n,
      count: 0,
      lastAt: null,
    };
    donor[d.token] += d.value;
    donor.count += 1;
    donor.lastAt = d.timestamp ?? donor.lastAt;
    // Latest graffiti wins, so a donor can rename (or go anonymous) later.
    const g = decodeGraffiti(inputs.get(d.hash));
    if (g) {
      donor.anon = g.anon;
      donor.name = g.anon ? null : g.name;
    }
    donors.set(d.from, donor);
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
    })),
    totals: { BTC: totals.BTC.toString(), MEZO: totals.MEZO.toString(), MUSD: totals.MUSD.toString() },
    donationCount: all.length,
    updatedAt: Date.now(),
  });
}
