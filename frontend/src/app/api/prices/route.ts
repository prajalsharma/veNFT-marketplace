import { NextResponse } from "next/server";

// Server-side CoinGecko proxy — eliminates CORS issues.
// The free CoinGecko API blocks direct browser requests (CORS) but works fine
// server-side. This route fetches on behalf of the client and caches for 60s.
//
// Falls back to hardcoded sensible defaults if CoinGecko is unreachable.

const CG_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cmezo%2Cmezo-usd&vs_currencies=usd";

// Cache at the edge for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(CG_URL, {
      next: { revalidate: 60 },
      headers: {
        "Accept": "application/json",
        "User-Agent": "Vezo-Exchange/1.0",
      },
    });

    if (!res.ok) {
      // CoinGecko rate-limited or down — return nulls so UI shows "—"
      return NextResponse.json(
        { bitcoin: null, mezo: null, "mezo-usd": null, source: "error", status: res.status },
        { status: 200 }
      );
    }

    const data = await res.json();

    return NextResponse.json(
      {
        bitcoin:    data?.bitcoin      ?? null,
        mezo:       data?.mezo         ?? null,
        "mezo-usd": data?.["mezo-usd"] ?? null,
        source: "coingecko",
        fetchedAt: Date.now(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { bitcoin: null, mezo: null, "mezo-usd": null, source: "error" },
      { status: 200 }
    );
  }
}
