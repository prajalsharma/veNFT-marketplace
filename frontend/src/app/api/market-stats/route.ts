import { NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/contracts";

// All-time marketplace statistics, derived from the Goldsky subgraph.
//
// The subgraph indexes every Listed / Purchased / Cancelled / Bid event from
// the VeNFTMarketplace and VeNFTBidding contracts. Historical KPIs (sales,
// volume, average sale price, participants, total listings) are computed here
// from those events, server-side, once per minute, so every visitor gets the
// same cached answer and no client paginates the index.
//
// Live figures (what is buyable right now) deliberately do NOT come from here:
// the subgraph's `active` flag cannot see a listing die when its NFT is
// withdrawn or transferred, so live counts come from /api/listings, which
// checks ownership on-chain.
//
// Validated against the Dune dashboard (dune.com/vezo/vezo) at build time:
// sales, MEZO and MUSD volume match exactly.

export const revalidate = 60;

const PAGE = 1000;
const MAX_PAGES = 20; // 20k events: far beyond current volume, bounded on purpose

type Token = "BTC" | "MEZO" | "MUSD";

function tokenOf(addr: string | null | undefined): Token | null {
  const a = (addr ?? "").toLowerCase();
  const m = CONTRACTS.mainnet;
  if (a === m.BTC.toLowerCase()) return "BTC";
  if (a === m.MEZO.toLowerCase()) return "MEZO";
  if (a === m.MUSD.toLowerCase()) return "MUSD";
  return null;
}

async function gql<T>(url: string, query: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`subgraph ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors || !json.data) throw new Error("subgraph query error");
  return json.data;
}

async function paginate<R>(url: string, entity: string, fields: string): Promise<R[]> {
  const out: R[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await gql<Record<string, R[]>>(
      url,
      `{ ${entity}(first: ${PAGE}, skip: ${page * PAGE}, orderBy: id) { ${fields} } }`
    );
    const rows = data[entity] ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export interface MarketStats {
  status: "ok" | "unavailable";
  totalSales: number;
  totalListings: number;
  volume: Record<Token, string>; // human units, decimal strings
  averageSale: Record<Token, string | null>; // null when no sales in that token
  salesByToken: Record<Token, number>;
  participants: number;
  sellers: number;
  buyers: number;
  firstEventAt: number | null; // unix seconds
  indexedBlock: number | null;
  indexedAt: number | null; // unix seconds of the last indexed block
  generatedAt: number; // unix ms
}

const zero = (): Record<Token, string> => ({ BTC: "0", MEZO: "0", MUSD: "0" });

function unavailable(): MarketStats {
  return {
    status: "unavailable",
    totalSales: 0,
    totalListings: 0,
    volume: zero(),
    averageSale: { BTC: null, MEZO: null, MUSD: null },
    salesByToken: { BTC: 0, MEZO: 0, MUSD: 0 },
    participants: 0,
    sellers: 0,
    buyers: 0,
    firstEventAt: null,
    indexedBlock: null,
    indexedAt: null,
    generatedAt: Date.now(),
  };
}

const fmtUnits = (wei: bigint): string => {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
};

export async function GET() {
  const url = process.env.SUBGRAPH_URL || process.env.NEXT_PUBLIC_SUBGRAPH_URL;
  if (!url) {
    return NextResponse.json(unavailable(), { headers: { "Cache-Control": "public, s-maxage=60" } });
  }

  try {
    const [events, listings, meta] = await Promise.all([
      paginate<{ type: string; price: string | null; paymentToken: string | null; from: string | null; to: string | null; timestamp: string }>(
        url,
        "activityEvents",
        "type price paymentToken from to timestamp"
      ),
      paginate<{ seller: string; buyer: string | null }>(url, "listings", "seller buyer"),
      gql<{ _meta: { block: { number: number; timestamp: number | null } } }>(url, "{ _meta { block { number timestamp } } }"),
    ]);

    const volume: Record<Token, bigint> = { BTC: 0n, MEZO: 0n, MUSD: 0n };
    const salesByToken: Record<Token, number> = { BTC: 0, MEZO: 0, MUSD: 0 };
    const participants = new Set<string>();
    let firstEventAt: number | null = null;

    for (const e of events) {
      if (e.from) participants.add(e.from.toLowerCase());
      if (e.to) participants.add(e.to.toLowerCase());
      const ts = Number(e.timestamp);
      if (Number.isFinite(ts) && (firstEventAt === null || ts < firstEventAt)) firstEventAt = ts;
      if (e.type === "sale" || e.type === "bidAccepted") {
        const t = tokenOf(e.paymentToken);
        if (!t || !e.price) continue;
        volume[t] += BigInt(e.price);
        salesByToken[t] += 1;
      }
    }

    const averageSale = {} as Record<Token, string | null>;
    (Object.keys(volume) as Token[]).forEach((t) => {
      averageSale[t] = salesByToken[t] > 0 ? fmtUnits(volume[t] / BigInt(salesByToken[t])) : null;
    });

    const body: MarketStats = {
      status: "ok",
      totalSales: salesByToken.BTC + salesByToken.MEZO + salesByToken.MUSD,
      totalListings: events.filter((e) => e.type === "listed").length,
      volume: { BTC: fmtUnits(volume.BTC), MEZO: fmtUnits(volume.MEZO), MUSD: fmtUnits(volume.MUSD) },
      averageSale,
      salesByToken,
      participants: participants.size,
      sellers: new Set(listings.map((l) => l.seller.toLowerCase())).size,
      buyers: new Set(listings.filter((l) => l.buyer).map((l) => l.buyer!.toLowerCase())).size,
      firstEventAt,
      indexedBlock: meta._meta.block.number ?? null,
      indexedAt: meta._meta.block.timestamp ?? null,
      generatedAt: Date.now(),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    // The index is a dependency, not the product: fail soft with an explicit
    // status the UI can render honestly, never zeros dressed up as data.
    return NextResponse.json(unavailable(), { headers: { "Cache-Control": "public, s-maxage=15" } });
  }
}
