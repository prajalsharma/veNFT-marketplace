import { NextResponse } from "next/server";
import { encodeFunctionData, decodeFunctionResult, parseAbi } from "viem";
import { CONTRACTS } from "@/lib/contracts";

// Dollar value of what has moved through Vezo, priced at the time it happened.
//
// MEZO's price has moved a lot since launch, so "all MEZO ever traded × today's
// price" says little. Here every sale is valued at MEZO's price in the hour it
// settled, and every veMEZO position brought to market is valued at the price
// in the hour it was first listed, with its locked amount read on-chain at the
// listing block (positions get merged, split or withdrawn later, so today's
// locked() would understate it).
//
// Sources: sales and listings from the Goldsky subgraph, hourly prices from
// CoinGecko's market_chart/range, locked amounts from archive eth_calls.
// Nothing here is hardcoded market data.

export const dynamic = "force-dynamic";

const PAGE = 1000;
const MAX_PAGES = 20;
const HOUR = 3_600_000;
// CoinGecko returns hourly points only for ranges up to 90 days.
const CHUNK_SEC = 85 * 86_400;
const HEADERS = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

const m = CONTRACTS.mainnet;
const MEZO = m.MEZO.toLowerCase();
const MUSD = m.MUSD.toLowerCase();
const VEMEZO = m.veMEZO.toLowerCase();
const RPC = m.rpcUrl;

const LOCKED_ABI = parseAbi([
  "struct LockedBalance { int128 amount; uint256 end; bool isPermanent; uint256 boost; }",
  "function locked(uint256 tokenId) view returns (LockedBalance)",
]);

export interface MarketValue {
  status: "ok" | "unavailable";
  /** MEZO paid across all sales, and its USD value at each sale's time. */
  mezoTraded: number;
  mezoTradedUsd: number;
  /** MUSD paid across all sales (a dollar stablecoin, counted at $1). */
  musdTraded: number;
  /** MEZO locked in every veMEZO position listed on Vezo (each counted once,
   *  at its first listing), and its USD value at that time. */
  mezoListed: number;
  mezoListedUsd: number;
  positionsListed: number;
  generatedAt: number;
}

// ── Caches ──────────────────────────────────────────────────────────────────
// Closed price windows and past-block reads never change, so they are kept for
// the life of the instance. Only the window touching "now" is refetched.
const priceChunks = new Map<number, [number, number][]>();
const lockedAt = new Map<string, number>();
let memo: { at: number; body: MarketValue } | null = null;
const MEMO_MS = 10 * 60_000;
// After a failed rebuild, wait before hitting upstream again: query-string
// variants bypass the CDN, and retrying on every miss would keep CoinGecko's
// free rate limit tripped.
let failedAt = 0;
const RETRY_MS = 60_000;

async function gql<T>(url: string, query: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`subgraph ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors || !json.data) throw new Error("subgraph query error");
  return json.data;
}

type Ev = { type: string; price: string | null; paymentToken: string | null; collection: string | null; tokenId: string | null; blockNumber: string; timestamp: string };

async function events(url: string): Promise<Ev[]> {
  const out: Ev[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await gql<{ activityEvents: Ev[] }>(
      url,
      `{ activityEvents(first: ${PAGE}, skip: ${page * PAGE}, orderBy: id, where: { type_in: ["sale", "bidAccepted", "listed"] }) { type price paymentToken collection tokenId blockNumber timestamp } }`
    );
    out.push(...d.activityEvents);
    if (d.activityEvents.length < PAGE) break;
  }
  return out;
}

async function priceWindow(from: number, now: number): Promise<[number, number][]> {
  const to = from + CHUNK_SEC;
  const closed = to < now - 3600;
  const hit = priceChunks.get(from);
  if (hit && closed) return hit;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/mezo/market_chart/range?vs_currency=usd&from=${from}&to=${Math.min(to, now)}`,
    {
      headers: { Accept: "application/json", "User-Agent": "Vezo-Exchange/1.0" },
      // Closed windows never change: keep them in Next's shared data cache so
      // every instance and deploy reuses them instead of spending CoinGecko's
      // small free rate limit. Only 200 responses are cached. The open window
      // refreshes hourly, matching the hourly points it returns.
      ...(closed ? { cache: "force-cache" as const } : { next: { revalidate: 3600 } }),
    }
  );
  if (!res.ok) {
    if (hit) return hit;
    throw new Error(`coingecko ${res.status}`);
  }
  const prices = ((await res.json()) as { prices?: [number, number][] }).prices ?? [];
  if (closed) priceChunks.set(from, prices);
  return prices;
}

/** Hourly MEZO/USD from `startSec` to now, sorted by time. */
async function mezoPrices(startSec: number): Promise<[number, number][]> {
  const now = Math.floor(Date.now() / 1000);
  // Align windows so closed ones keep the same cache key across requests.
  const first = Math.floor(startSec / CHUNK_SEC) * CHUNK_SEC;
  const all: [number, number][] = [];
  for (let f = first; f < now; f += CHUNK_SEC) all.push(...(await priceWindow(f, now)));
  return all.sort((a, b) => a[0] - b[0]);
}

/** Price at the point nearest to `ms`, or null if none is within 3 hours. */
function priceAt(series: [number, number][], ms: number): number | null {
  let lo = 0, hi = series.length - 1;
  if (hi < 0) return null;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid][0] < ms) lo = mid + 1;
    else hi = mid;
  }
  const near = [lo - 1, lo].filter((i) => i >= 0 && i < series.length)
    .reduce((a, b) => (Math.abs(series[a][0] - ms) <= Math.abs(series[b][0] - ms) ? a : b));
  return Math.abs(series[near][0] - ms) <= 3 * HOUR ? series[near][1] : null;
}

/** locked(tokenId).amount at each block, in MEZO. One JSON-RPC batch. */
async function lockedAmounts(reqs: { tokenId: string; block: string }[]): Promise<void> {
  const todo = reqs.filter((r) => !lockedAt.has(`${r.tokenId}@${r.block}`));
  for (let i = 0; i < todo.length; i += 50) {
    const slice = todo.slice(i, i + 50);
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(
        slice.map((r, id) => ({
          jsonrpc: "2.0",
          id,
          method: "eth_call",
          params: [
            { to: VEMEZO, data: encodeFunctionData({ abi: LOCKED_ABI, functionName: "locked", args: [BigInt(r.tokenId)] }) },
            "0x" + BigInt(r.block).toString(16),
          ],
        }))
      ),
    });
    if (!res.ok) throw new Error(`rpc ${res.status}`);
    const out = (await res.json()) as { id: number; result?: `0x${string}`; error?: unknown }[];
    if (!Array.isArray(out)) throw new Error("rpc batch unsupported");
    for (const o of out) {
      if (!o.result) throw new Error("rpc call failed");
      const lb = decodeFunctionResult({ abi: LOCKED_ABI, functionName: "locked", data: o.result });
      const r = slice[o.id];
      lockedAt.set(`${r.tokenId}@${r.block}`, Number(lb.amount) / 1e18);
    }
  }
}

function unavailable(): MarketValue {
  return { status: "unavailable", mezoTraded: 0, mezoTradedUsd: 0, musdTraded: 0, mezoListed: 0, mezoListedUsd: 0, positionsListed: 0, generatedAt: Date.now() };
}

export async function GET() {
  if (memo && Date.now() - memo.at < MEMO_MS) return NextResponse.json(memo.body, { headers: HEADERS });
  if (Date.now() - failedAt < RETRY_MS) {
    return memo
      ? NextResponse.json(memo.body, { headers: HEADERS })
      : NextResponse.json(unavailable(), { headers: { "Cache-Control": "public, s-maxage=30" } });
  }
  const url = process.env.SUBGRAPH_URL || process.env.NEXT_PUBLIC_SUBGRAPH_URL;
  if (!url) return NextResponse.json(unavailable(), { headers: { "Cache-Control": "public, s-maxage=60" } });

  try {
    const evs = await events(url);
    if (evs.length === 0) throw new Error("no events");
    const start = Math.min(...evs.map((e) => Number(e.timestamp)));
    const series = await mezoPrices(start);

    let mezoTraded = 0, mezoTradedUsd = 0, musdTraded = 0;
    for (const e of evs) {
      if ((e.type !== "sale" && e.type !== "bidAccepted") || !e.price) continue;
      const tok = (e.paymentToken ?? "").toLowerCase();
      const amt = Number(BigInt(e.price)) / 1e18;
      if (tok === MUSD) musdTraded += amt;
      if (tok !== MEZO) continue;
      const px = priceAt(series, Number(e.timestamp) * 1000);
      if (px === null) throw new Error("price gap");
      mezoTraded += amt;
      mezoTradedUsd += amt * px;
    }

    // First listing of each veMEZO position.
    const firstListing = new Map<string, Ev>();
    for (const e of evs) {
      if (e.type !== "listed" || (e.collection ?? "").toLowerCase() !== VEMEZO || !e.tokenId) continue;
      const prev = firstListing.get(e.tokenId);
      if (!prev || Number(e.blockNumber) < Number(prev.blockNumber)) firstListing.set(e.tokenId, e);
    }
    const reqs = [...firstListing.values()].map((e) => ({ tokenId: e.tokenId!, block: e.blockNumber }));
    await lockedAmounts(reqs);

    let mezoListed = 0, mezoListedUsd = 0;
    for (const e of firstListing.values()) {
      const amt = lockedAt.get(`${e.tokenId}@${e.blockNumber}`) ?? 0;
      const px = priceAt(series, Number(e.timestamp) * 1000);
      if (px === null) throw new Error("price gap");
      mezoListed += amt;
      mezoListedUsd += amt * px;
    }

    const body: MarketValue = {
      status: "ok",
      mezoTraded,
      mezoTradedUsd,
      musdTraded,
      mezoListed,
      mezoListedUsd,
      positionsListed: firstListing.size,
      generatedAt: Date.now(),
    };
    memo = { at: Date.now(), body };
    return NextResponse.json(body, { headers: HEADERS });
  } catch {
    failedAt = Date.now();
    if (memo) return NextResponse.json(memo.body, { headers: HEADERS });
    return NextResponse.json(unavailable(), { headers: { "Cache-Control": "public, s-maxage=30" } });
  }
}
