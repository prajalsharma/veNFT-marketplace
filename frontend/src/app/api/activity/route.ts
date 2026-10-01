import { NextRequest, NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/contracts";
import { computeDiscountBpsNumber } from "@/lib/computeDiscount";

// Activity feed with discounts AS OF EACH EVENT.
//
// A discount compares a price with what the position held at that moment.
// Reading today's value instead is wrong in both directions: a position its
// buyer later merged into looks far cheaper than it was (veMEZO #836 showed
// 51.6% off; it sold at 2.2%), and one later withdrawn loses its discount
// entirely. So each event's intrinsic value is read at the block before it.
//
// That is ~100 historical reads per feed, which the public RPC rate-limits when
// a browser fires them in parallel. Here they run server-side, in JSON-RPC
// batches, once per event ever: past state is immutable, so results live in a
// process-wide cache, and the whole response is edge-cached for 60s.

export const revalidate = 60;

const RPC = CONTRACTS.mainnet.rpcUrl;
const ADAPTER = CONTRACTS.mainnet.adapter;
const VEBTC = CONTRACTS.mainnet.veBTC.toLowerCase();
const BTC = CONTRACTS.mainnet.BTC;
const MEZO = CONTRACTS.mainnet.MEZO;
const BATCH = 20;

/** "collection:tokenId:block" -> [intrinsicValue, lockEnd] at block-1. Never changes. */
const HISTORICAL = new Map<string, [bigint, bigint]>();

type Ev = {
  id: string; type: string; listingId: string | null; collection: string | null; tokenId: string | null;
  price: string | null; paymentToken: string | null; from: string | null; to: string | null;
  blockNumber: string; timestamp: string; txHash: string;
};

const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

async function readHistorical(keys: string[]): Promise<void> {
  const todo = keys.filter((k) => !HISTORICAL.has(k));
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const body = chunk.map((k, j) => {
      const [coll, tok, blk] = k.split(":");
      return {
        jsonrpc: "2.0",
        id: j,
        method: "eth_call",
        params: [
          { to: ADAPTER, data: "0x67423c2b" + pad(coll!) + pad(BigInt(tok!).toString(16)) },
          "0x" + (BigInt(blk!) - 1n).toString(16),
        ],
      };
    });
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) continue; // leave unresolved; a later request fills it in
      const out = (await res.json()) as { id: number; result?: string }[];
      for (const r of Array.isArray(out) ? out : []) {
        const k = chunk[r.id];
        if (!k || !r.result || r.result.length < 130) continue;
        HISTORICAL.set(k, [BigInt("0x" + r.result.slice(2, 66)), BigInt("0x" + r.result.slice(66, 130))]);
      }
    } catch {
      /* transient: the row renders without a discount and resolves next time */
    }
  }
}

export async function GET(req: NextRequest) {
  const url = process.env.SUBGRAPH_URL || process.env.NEXT_PUBLIC_SUBGRAPH_URL;
  const raw = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);
  const limit = Number.isFinite(raw) ? Math.min(200, Math.max(1, raw)) : 100;
  if (!url) return NextResponse.json({ status: "unavailable", events: [] });

  try {
    const query = `{ activityEvents(first: ${limit}, orderBy: timestamp, orderDirection: desc, where: { type_in: ["listed","sale","cancelled"] }) {
      id type listingId collection tokenId price paymentToken from to blockNumber timestamp txHash
    } }`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`subgraph ${res.status}`);
    const json = (await res.json()) as { data?: { activityEvents: Ev[] }; errors?: unknown };
    if (!json.data || json.errors) throw new Error("subgraph query error");
    const rows = json.data.activityEvents;

    const keyOf = (r: Ev) => `${(r.collection ?? "").toLowerCase()}:${r.tokenId}:${r.blockNumber}`;
    await readHistorical(
      Array.from(new Set(rows.filter((r) => r.type !== "cancelled" && r.collection && r.tokenId).map(keyOf)))
    );

    const events = rows.map((r) => {
      const iv = HISTORICAL.get(keyOf(r));
      const priceWei = BigInt(r.price ?? "0");
      const isVeBTC = (r.collection ?? "").toLowerCase() === VEBTC;
      const discountBps =
        r.type !== "cancelled" && iv && priceWei > 0n
          ? computeDiscountBpsNumber(iv[0], isVeBTC ? BTC : MEZO, priceWei, r.paymentToken ?? "", iv[1])
          : null;
      return {
        type: r.type,
        listingId: r.listingId ?? "0",
        collection: isVeBTC ? "veBTC" : "veMEZO",
        tokenId: r.tokenId ?? "0",
        price: r.price ?? "0",
        paymentToken: r.paymentToken ?? "",
        discountBps,
        from: r.from ?? "",
        to: r.to ?? null,
        blockNumber: r.blockNumber,
        transactionHash: r.txHash,
        timestamp: Number(r.timestamp) * 1000,
      };
    });

    return NextResponse.json(
      { status: "ok", events },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ status: "unavailable", events: [] }, { headers: { "Cache-Control": "public, s-maxage=15" } });
  }
}
