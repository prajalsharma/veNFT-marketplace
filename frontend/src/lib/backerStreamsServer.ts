// Server-side reader for VezoBackerStreams, shared by the support board and
// the recurring support section.
//
// Two reads, built so spam cannot hide anything that matters:
//
// 1. A wallet's own streams (`loadStreamsOf`) are found by the indexed
//    `backer` topic of StreamCreated, with no size floor and no cap. However
//    many streams others open, a supporter always sees their own streams and
//    their pause and cancel buttons.
//
// 2. The public board (`loadStreams`) walks StreamCreated logs newest first,
//    filtered by event signature, so other events and old spam cannot push new
//    streams out. Streams below the smallest deposit, and streams canceled
//    before they paid MIN_LISTED, are dropped from the logs alone. The rest are
//    read from the contract in batches. A running stream is listed at once
//    (its deposit is locked and paying Vezo every second); a paused, canceled
//    or finished one only if it actually paid MIN_LISTED, so paused spam never
//    takes a slot.
//
// Residual, accepted: a flood bigger than the scan budget (thousands of
// streams, each costing gas, or locked deposits for the unpaid kind) can still
// push older board rows out of view. Funds are never affected, and each
// supporter's own streams stay visible through read 1.

import { createPublicClient, decodeEventLog, encodeEventTopics, http, pad, type Hex } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { BACKER_STREAMS_ABI, MIN_INDEXED, MIN_LISTED, STREAM_STATUS, type StreamStatus } from "@/lib/backerStreams";

const M = CONTRACTS.mainnet;
const EXPLORER_V2 = "https://api.explorer.mezo.org/api/v2";
const LOGS_API = "https://api.explorer.mezo.org/api";
const ZERO = "0x0000000000000000000000000000000000000000";
const MAX_LOG_PAGES = 60;   // 50 logs a page, newest first
const MAX_CANDIDATES = 600; // streams read from the contract per board refresh
const MAX_LISTED = 300;     // rows the board keeps

export type Sym = "BTC" | "MEZO" | "MUSD";
const SYMBOL: Record<string, Sym> = {
  [M.BTC.toLowerCase()]: "BTC",
  [M.MEZO.toLowerCase()]: "MEZO",
  [M.MUSD.toLowerCase()]: "MUSD",
};
const TOPIC_CREATED = encodeEventTopics({ abi: BACKER_STREAMS_ABI, eventName: "StreamCreated" })[0];
const TOPIC_CANCELED = encodeEventTopics({ abi: BACKER_STREAMS_ABI, eventName: "StreamCanceled" })[0];

export interface StreamRow {
  id: string;
  backer: string;
  name: string | null;
  token: Sym;
  deposit: string;
  withdrawn: string;
  streamed: string;
  duration: number;
  accrued: number;
  runStart: number;
  status: StreamStatus;
  endsAt: number | null;
  createdAt: string | null;
}

export const STREAMS_LIVE = M.backerStreams !== ZERO;

interface RawLog { topics: Hex[]; data: Hex; at: string | null; block: bigint | null }
interface Created { id: bigint; backer: string; name: string; token: Sym; deposit: bigint; at: string | null; block: bigint | null }

/** Newest-first logs of one event type (explorer v2 filters by topic). */
async function logsNewestFirst(topic0: Hex, maxPages: number): Promise<RawLog[]> {
  const out: RawLog[] = [];
  let next: Record<string, unknown> | null = null;
  for (let page = 0; page < maxPages; page++) {
    const cursor = next ? "&" + new URLSearchParams(Object.entries(next).map(([k, v]) => [k, String(v)])).toString() : "";
    const res = await fetch(`${EXPLORER_V2}/addresses/${M.backerStreams}/logs?topic=${topic0}${cursor}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (res.status === 404) break;
    if (!res.ok) throw new Error(`explorer ${res.status}`);
    const body = (await res.json()) as {
      items?: { topics: (Hex | null)[]; data: Hex; block_number?: number | null; block_timestamp?: string | null }[];
      next_page_params?: Record<string, unknown> | null;
    };
    for (const l of body.items ?? []) {
      if (l.topics[0]?.toLowerCase() !== topic0.toLowerCase()) continue; // the filter is the server's; trust but check
      // The v2 log list leaves block_timestamp out; readRows fills it from the block.
      out.push({ topics: l.topics.filter(Boolean) as Hex[], data: l.data, at: l.block_timestamp ?? null, block: l.block_number != null ? BigInt(l.block_number) : null });
    }
    next = body.next_page_params ?? null;
    if (!next) break;
  }
  return out;
}

/** Every StreamCreated for one backer, via the indexed backer topic. */
async function createdLogsOf(backer: `0x${string}`): Promise<RawLog[]> {
  const topic2 = pad(backer.toLowerCase() as Hex, { size: 32 });
  const url = `${LOGS_API}?module=logs&action=getLogs&address=${M.backerStreams}&topic0=${TOPIC_CREATED}&topic2=${topic2}&topic0_2_opr=and&fromBlock=0&toBlock=latest`;
  const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`explorer ${res.status}`);
  const body = (await res.json()) as { result?: unknown };
  const rows = Array.isArray(body.result) ? (body.result as { topics: (Hex | null)[]; data: Hex; timeStamp?: string; blockNumber?: string }[]) : [];
  return rows.map((r) => ({
    topics: r.topics.filter(Boolean) as Hex[],
    data: r.data,
    at: r.timeStamp ? new Date(parseInt(r.timeStamp, 16) * 1000).toISOString() : null,
    block: r.blockNumber ? BigInt(r.blockNumber) : null,
  }));
}

function decodeCreated(l: RawLog): Created | null {
  try {
    const ev = decodeEventLog({ abi: BACKER_STREAMS_ABI, eventName: "StreamCreated", data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    const token = SYMBOL[ev.args.token.toLowerCase()];
    if (!token) return null;
    return { id: ev.args.id, backer: ev.args.backer.toLowerCase(), name: ev.args.name, token, deposit: ev.args.deposit, at: l.at, block: l.block };
  } catch {
    return null;
  }
}

async function readRows(list: Created[]): Promise<StreamRow[]> {
  // viem batches these concurrent calls into JSON-RPC batch requests.
  const client = createPublicClient({ transport: http(M.rpcUrl, { batch: { batchSize: 150 } }) });
  // Start times missing from the logs come from their blocks, one read per block.
  const blockTime = new Map<bigint, Promise<string | null>>();
  const timeOf = (b: bigint) => {
    if (!blockTime.has(b)) {
      blockTime.set(b, client.getBlock({ blockNumber: b }).then((x) => new Date(Number(x.timestamp) * 1000).toISOString(), () => null));
    }
    return blockTime.get(b)!;
  };
  return Promise.all(list.map(async (c) => {
    const [s, streamed, endsAt, at] = await Promise.all([
      client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "getStream", args: [c.id] }),
      client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "streamedOf", args: [c.id] }),
      client.readContract({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: "endsAt", args: [c.id] }),
      c.at || c.block === null ? Promise.resolve(c.at) : timeOf(c.block),
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
      createdAt: at,
    };
  }));
}

/** One wallet's streams, all of them, newest first. */
export async function loadStreamsOf(backer: `0x${string}`): Promise<StreamRow[]> {
  if (!STREAMS_LIVE) return [];
  const created = (await createdLogsOf(backer)).map(decodeCreated).filter((c): c is Created => !!c);
  created.sort((a, b) => (a.id < b.id ? 1 : -1));
  return readRows(created);
}

/** Still paying out right now: active and not past its end. */
export function isRunning(r: StreamRow, nowSec = Math.floor(Date.now() / 1000)): boolean {
  return r.status === "Active" && !!r.endsAt && r.endsAt > nowSec;
}

/**
 * What a stream counts for on the board: a running stream counts the whole
 * deposit the backer committed; any other counts only what reached Vezo.
 */
export function countedAmount(r: StreamRow): bigint {
  return isRunning(r) ? BigInt(r.deposit) : BigInt(r.streamed);
}

/** Running streams, and others that paid at least MIN_LISTED, newest first. */
export async function loadStreams(): Promise<StreamRow[]> {
  if (!STREAMS_LIVE) return [];
  const [createdRaw, canceledRaw] = await Promise.all([
    logsNewestFirst(TOPIC_CREATED, MAX_LOG_PAGES),
    logsNewestFirst(TOPIC_CANCELED, MAX_LOG_PAGES),
  ]);

  const paidAtCancel = new Map<bigint, bigint>();
  for (const l of canceledRaw) {
    try {
      const ev = decodeEventLog({ abi: BACKER_STREAMS_ABI, eventName: "StreamCanceled", data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      paidAtCancel.set(ev.args.id, ev.args.streamedTotal);
    } catch { /* malformed */ }
  }

  const candidates: Created[] = [];
  for (const l of createdRaw) {
    const c = decodeCreated(l);
    if (!c || c.deposit < MIN_INDEXED[c.token]) continue;
    const paid = paidAtCancel.get(c.id);
    if (paid !== undefined && paid < MIN_LISTED[c.token]) continue; // canceled before it really paid
    candidates.push(c);
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  // The contract, not the logs, decides the status and what has been paid:
  // paused and unpaid streams are dropped here, before any cap on rows.
  const rows = await readRows(candidates);
  const now = Math.floor(Date.now() / 1000);
  return rows.filter((r) => isRunning(r, now) || BigInt(r.streamed) >= MIN_LISTED[r.token]).slice(0, MAX_LISTED);
}
