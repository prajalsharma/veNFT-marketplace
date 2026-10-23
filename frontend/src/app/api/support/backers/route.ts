import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { loadStreams, loadStreamsOf, STREAMS_LIVE } from "@/lib/backerStreamsServer";

// Recurring support streams with their raw clocks, so the page can tick each
// streamed amount locally.
//   GET /api/support/backers               — streams that have paid (board)
//   GET /api/support/backers?backer=0x…    — every stream of one wallet,
//                                            for its pause and cancel controls

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!STREAMS_LIVE) return NextResponse.json({ live: false, streams: [] });
  const contract = CONTRACTS.mainnet.backerStreams;
  const backer = new URL(req.url).searchParams.get("backer");
  try {
    if (backer) {
      if (!isAddress(backer)) return NextResponse.json({ error: "bad address" }, { status: 400 });
      const streams = await loadStreamsOf(backer);
      return NextResponse.json(
        { live: true, contract, streams, at: Math.floor(Date.now() / 1000) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const streams = await loadStreams();
    return NextResponse.json(
      { live: true, contract, streams, at: Math.floor(Date.now() / 1000) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ live: true, contract, streams: [], error: true });
  }
}
