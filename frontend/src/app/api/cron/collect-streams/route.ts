import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACTS } from "@/lib/contracts";
import { BACKER_STREAMS_ABI } from "@/lib/backerStreams";

// Daily auto-payout for recurring support (Vercel Cron, see vercel.json).
//
// A stream's money waits in VezoBackerStreams until someone calls
// withdraw(id). Anyone may call it and it always pays RECIPIENT, the support
// wallet, so this job signs with a small keeper wallet that only pays gas
// (KEEPER_PRIVATE_KEY). It cannot send the money anywhere else.
//
//   GET /api/cron/collect-streams   Authorization: Bearer $CRON_SECRET

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const M = CONTRACTS.mainnet;
const MAX_SCAN = 1000;      // newest stream ids checked per run
const MAX_PAYOUTS = 25;     // withdraw calls per run (each waits for its receipt)
const RPC = process.env.KEEPER_RPC_URL || M.rpcUrl; // override only for fork tests

const chain = defineChain({
  id: M.chainId,
  name: "Mezo",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.KEEPER_PRIVATE_KEY as Hex | undefined;
  if (!key) return NextResponse.json({ error: "KEEPER_PRIVATE_KEY is not set" }, { status: 500 });

  const account = privateKeyToAccount(key);
  const pub = createPublicClient({ chain, transport: http(RPC, { batch: { batchSize: 150 } }) });
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });

  const next = await pub.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "nextStreamId" });
  const ids: bigint[] = [];
  for (let i = next - 1n; i >= 1n && ids.length < MAX_SCAN; i--) ids.push(i);
  const owed = await Promise.all(ids.map(async (id) => ({
    id,
    amount: await pub.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "withdrawableOf", args: [id] }),
  })));
  // Biggest first, so a run that hits the cap still collects what matters most.
  const due = owed.filter((o) => o.amount > 0n).sort((a, b) => (a.amount < b.amount ? 1 : -1)).slice(0, MAX_PAYOUTS);

  const paid: { id: string; amount: string; tx: string }[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const o of due) {
    try {
      const hash = await wallet.writeContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "withdraw", args: [o.id] });
      const r = await pub.waitForTransactionReceipt({ hash, timeout: 30_000 });
      if (r.status !== "success") throw new Error("reverted");
      paid.push({ id: o.id.toString(), amount: o.amount.toString(), tx: hash });
    } catch (e) {
      failed.push({ id: o.id.toString(), error: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }

  const gas = await pub.getBalance({ address: account.address });
  const result = { keeper: account.address, keeperBalanceWei: gas.toString(), scanned: ids.length, paid, failed };
  console.log("[collect-streams]", JSON.stringify(result));
  return NextResponse.json(result, { status: failed.length ? 207 : 200, headers: { "Cache-Control": "no-store" } });
}
