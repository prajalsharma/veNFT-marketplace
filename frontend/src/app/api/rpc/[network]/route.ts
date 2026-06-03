import { NextRequest, NextResponse } from "next/server";

// Server-side RPC proxy — eliminates CORS issues.
// validationcloud.io and rpc.test.mezo.org do not set CORS headers for
// vezoexchange.vercel.app, so browser fetch calls fail. Proxying here means
// the RPC call happens server-side (no CORS restriction) and we relay the
// JSON-RPC response back to the client.

const RPC_URLS: Record<string, string> = {
  mainnet:
    process.env.RPC_MAINNET ||
    "https://mainnet.mezo.public.validationcloud.io",
  testnet:
    process.env.RPC_TESTNET || "https://rpc.test.mezo.org",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { network: string } }
) {
  const rpcUrl = RPC_URLS[params.network];
  if (!rpcUrl) {
    return NextResponse.json({ error: "Unknown network" }, { status: 400 });
  }

  try {
    const body = await req.text();
    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "RPC proxy error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
