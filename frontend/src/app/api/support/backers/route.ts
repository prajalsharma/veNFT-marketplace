import { NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/contracts";
import { loadStreams, STREAMS_LIVE } from "@/lib/backerStreamsServer";

// Recurring support streams with their raw clocks, so the page can tick each
// streamed amount locally and show a wallet its own streams. Cached a minute.

export const dynamic = "force-dynamic";

export async function GET() {
  if (!STREAMS_LIVE) return NextResponse.json({ live: false, streams: [] });
  const contract = CONTRACTS.mainnet.backerStreams;
  try {
    const streams = await loadStreams();
    return NextResponse.json(
      { live: true, contract, streams, at: Math.floor(Date.now() / 1000) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ live: true, contract, streams: [], error: true });
  }
}
