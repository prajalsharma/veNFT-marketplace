import { NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, encodeEventTopics, http, type Hex } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { BACKER_STREAMS_ABI, MIN_INDEXED, MIN_LISTED, STREAM_STATUS } from "@/lib/backerStreams";

// Project plans, rebuilt from chain data on every request (cached a minute at
// the edge).
//
// Two event types are the index: StreamCreated (id, backer, token, deposit,
// project name — names live only here) and StreamCanceled (what a plan paid in
// total). They are fetched by event signature from the explorer's logs API
// (public RPC getLogs is capped at 10k blocks), so other events — a pause and
// resume loop, say — can never push them out of the scan.
//
// Only plans worth reading reach the contract: the deposit must reach a real
// tier, and a plan canceled before it paid MIN_LISTED is dropped from the logs
// alone. A flood of tiny or create-then-cancel plans costs the board nothing.
// The page shows what has streamed, never the deposit.

export const dynamic = "force-dynamic";

const M = CONTRACTS.mainnet;
const LOGS_API = "https://api.explorer.mezo.org/api";
const ZERO = "0x0000000000000000000000000000000000000000";
const PAGE = 1000;
const MAX_PAGES = 20;
const MAX_READ = 300; // newest plans read from the contract per request
type Sym = "BTC" | "MEZO" | "MUSD";
const SYMBOL: Record<string, Sym> = {
  [M.BTC.toLowerCase()]: "BTC",
  [M.MEZO.toLowerCase()]: "MEZO",
  [M.MUSD.toLowerCase()]: "MUSD",
};
const TOPIC_CREATED = encodeEventTopics({ abi: BACKER_STREAMS_ABI, eventName: "StreamCreated" })[0];
const TOPIC_CANCELED = encodeEventTopics({ abi: BACKER_STREAMS_ABI, eventName: "StreamCanceled" })[0];

async function logsByTopic(topic0: Hex): Promise<{ topics: Hex[]; data: Hex }[]> {
  const out: { topics: Hex[]; data: Hex }[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${LOGS_API}?module=logs&action=getLogs&address=${M.backerStreams}&topic0=${topic0}&fromBlock=0&toBlock=latest&page=${page}&offset=${PAGE}`;
    const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`explorer ${res.status}`);
    const body = (await res.json()) as { status?: string; message?: string; result?: unknown };
    if (!Array.isArray(body.result)) {
      if (/no logs found/i.test(body.message ?? "")) break;
      throw new Error(body.message ?? "explorer error");
    }
    const rows = body.result as { topics: (Hex | null)[]; data: Hex }[];
    for (const r of rows) out.push({ topics: r.topics.filter(Boolean) as Hex[], data: r.data });
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function GET() {
  if (M.backerStreams === ZERO) return NextResponse.json({ live: false, streams: [] });
  const client = createPublicClient({ transport: http(M.rpcUrl, { batch: true }) });
  try {
    const [createdRaw, canceledRaw] = await Promise.all([logsByTopic(TOPIC_CREATED), logsByTopic(TOPIC_CANCELED)]);

    const paidAtCancel = new Map<bigint, bigint>();
    for (const l of canceledRaw) {
      try {
        const ev = decodeEventLog({ abi: BACKER_STREAMS_ABI, eventName: "StreamCanceled", data: l.data, topics: l.topics as [Hex, ...Hex[]] });
        paidAtCancel.set(ev.args.id, ev.args.streamedTotal);
      } catch { /* malformed */ }
    }

    const created: { id: bigint; name: string; token: Sym }[] = [];
    for (const l of createdRaw) {
      try {
        const ev = decodeEventLog({ abi: BACKER_STREAMS_ABI, eventName: "StreamCreated", data: l.data, topics: l.topics as [Hex, ...Hex[]] });
        const token = SYMBOL[ev.args.token.toLowerCase()];
        if (!token || ev.args.deposit < MIN_INDEXED[token]) continue;
        const paid = paidAtCancel.get(ev.args.id);
        if (paid !== undefined && paid < MIN_LISTED[token]) continue; // canceled before it really paid
        created.push({ id: ev.args.id, name: ev.args.name, token });
      } catch { /* malformed */ }
    }
    created.sort((a, b) => (a.id < b.id ? 1 : -1));

    const rows = await Promise.all(created.slice(0, MAX_READ).map(async (c) => {
      const [s, streamed, endsAt] = await Promise.all([
        client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "getStream", args: [c.id] }),
        client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "streamedOf", args: [c.id] }),
        client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "endsAt", args: [c.id] }),
      ]);
      return {
        id: c.id.toString(),
        backer: s.backer.toLowerCase(),
        name: c.name || null,
        token: c.token,
        deposit: s.deposit.toString(),
        withdrawn: s.withdrawn.toString(),
        streamed: streamed.toString(),
        duration: Number(s.duration),
        accrued: Number(s.accrued),
        runStart: Number(s.runStart),
        status: STREAM_STATUS[s.status],
        endsAt: Number(endsAt) || null,
      };
    }));
    return NextResponse.json(
      { live: true, contract: M.backerStreams, streams: rows, at: Math.floor(Date.now() / 1000) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ live: true, contract: M.backerStreams, streams: [], error: true });
  }
}
