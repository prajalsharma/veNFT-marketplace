import { NextResponse } from "next/server";

// Server-side CoinGecko proxy — eliminates CORS issues.
// The free CoinGecko API blocks direct browser requests (CORS) but works fine
// server-side. This route fetches on behalf of the client and caches for 60s.
//
// Returns nulls if CoinGecko is unreachable; the UI then shows "—".

const CG_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cmezo%2Cmezo-usd&vs_currencies=usd&include_24hr_change=true";

// Always run fresh on the server; the CDN caches each response for 60s
// (Cache-Control below). ISR here served day-old prices on a quiet route, and
// these prices now drive the estimated discount on cross-currency listings.
export const dynamic = "force-dynamic";

// Per-instance memo: query-string variants bypass the CDN cache, so without
// this every miss would hit CoinGecko and could exhaust its free rate limit.
const MEMO_MS = 30_000;
let memo: { at: number; body: Record<string, unknown> } | null = null;
const HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" };

export async function GET() {
  if (memo && Date.now() - memo.at < MEMO_MS) {
    return NextResponse.json(memo.body, { status: 200, headers: HEADERS });
  }
  try {
    const res = await fetch(CG_URL, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Vezo-Exchange/1.0",
      },
    });

    if (!res.ok) {
      // CoinGecko rate-limited or down: last good prices if recent (10 min),
      // otherwise nulls so the UI shows "—" and drops the estimates.
      if (memo && Date.now() - memo.at < 600_000) return NextResponse.json(memo.body, { status: 200 });
      return NextResponse.json(
        { bitcoin: null, mezo: null, "mezo-usd": null, source: "error", status: res.status },
        { status: 200 }
      );
    }

    const data = await res.json();
    const body = {
      bitcoin:    data?.bitcoin      ?? null,
      mezo:       data?.mezo         ?? null,
      "mezo-usd": data?.["mezo-usd"] ?? null,
      source: "coingecko",
      fetchedAt: Date.now(),
    };
    memo = { at: Date.now(), body };
    return NextResponse.json(body, { status: 200, headers: HEADERS });
  } catch {
    return NextResponse.json(
      { bitcoin: null, mezo: null, "mezo-usd": null, source: "error" },
      { status: 200 }
    );
  }
}
