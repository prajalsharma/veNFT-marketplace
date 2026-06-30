"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { createPublicClient, http, formatEther, parseAbiItem, type AbiEvent } from "viem";
import { useNetwork } from "./useNetwork";
import { mezoMainnet, mezoTestnet } from "@/lib/wagmi";
import { computeDiscountBpsNumber } from "@/lib/computeDiscount";

export interface ActivityEvent {
  type: "sale" | "listed" | "cancelled";
  listingId: bigint;
  collection: "veBTC" | "veMEZO";
  tokenId: bigint;
  price: string;
  paymentToken: string;
  /** Discount in basis points (e.g. 500 = 5% OFF). Negative = premium. null if not computable. */
  discountBps: number | null;
  from: string;
  to: string | null;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number | null;
}

// Build absolute proxy URLs at call time so window.location.origin is available.
// Module-level code can run during SSR bundling; window is only safe inside hooks/effects.
function getRpcUrls(chainId: number): string[] {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (chainId === 31612) return [`${origin}/api/rpc/mainnet`];
  return [`${origin}/api/rpc/testnet`];
}

// How far back to look and how many blocks per chunk.
// Mainnet: scan the last 200k blocks (~8 days at ~3.5 s/block).
// Testnet: scan the last 200k blocks — scanning from genesis causes RPC timeouts on Mezo.
const LOOK_BACK_BLOCKS_MAINNET = 200_000n;
const LOOK_BACK_BLOCKS_TESTNET = 200_000n;
const CHUNK_SIZE = 2_000n;

// ── Adapter ABI (getIntrinsicValue only) ─────────────────────────────────────
const ADAPTER_ABI_IV = [
  {
    name: "getIntrinsicValue",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "collection", type: "address" },
      { name: "tokenId",    type: "uint256" },
    ],
    outputs: [
      { name: "amount",  type: "uint256" },
      { name: "lockEnd", type: "uint256" },
    ],
  },
] as const;

// ── Token address constants ───────────────────────────────────────────────────
const BTC_ADDR  = "0x7b7c000000000000000000000000000000000000";
const MEZO_ADDR = "0x7b7c000000000000000000000000000000000001";

// Discount calculation delegates to computeDiscount.ts. Cross-token listings
// intentionally return null until a reliable oracle-backed comparison exists.

// Typed event ABIs
const LISTED_EVENT    = parseAbiItem("event Listed(uint256 indexed listingId, address indexed seller, address indexed collection, uint256 tokenId, uint256 price, address paymentToken)");
const PURCHASED_EVENT = parseAbiItem("event Purchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price)");
const CANCELLED_EVENT = parseAbiItem("event Cancelled(uint256 indexed listingId)");

function getPaymentSymbol(token: string, musd: string): string {
  const lower = token.toLowerCase();
  if (lower === "0x7b7c000000000000000000000000000000000000") return "BTC";
  if (lower === "0x7b7c000000000000000000000000000000000001") return "MEZO";
  if (lower === musd.toLowerCase()) return "MUSD";
  if (!token) return "—";
  return token.slice(0, 6) + "…";
}

type AnyClient = ReturnType<typeof createPublicClient>;

/** Try each RPC URL in sequence; return the first successful result */
async function withFallback<T>(
  chainId: number,
  fn: (client: AnyClient) => Promise<T>
): Promise<T> {
  const urls = getRpcUrls(chainId);
  const chain = chainId === 31612 ? mezoMainnet : mezoTestnet;
  let lastErr: unknown;
  for (const url of urls) {
    const client = createPublicClient({ chain, transport: http(url) });
    try {
      return await fn(client);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Fetch logs in CHUNK_SIZE slices to stay within RPC range limits */
async function fetchLogsChunked(
  chainId: number,
  address: `0x${string}`,
  event: any,
  fromBlock: bigint,
  toBlock: bigint
): Promise<ReturnType<AnyClient["getLogs"]> extends Promise<infer R> ? R : never> {
  const allLogs: any[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
    const chunk = await withFallback(chainId, (client) =>
      client.getLogs({ address, event, fromBlock: start, toBlock: end } as any)
    );
    allLogs.push(...chunk);
    start = end + 1n;
  }
  return allLogs as any;
}

// ── Subgraph activity (preferred when NEXT_PUBLIC_SUBGRAPH_URL is set) ────────
// One GraphQL query instead of chunked getLogs — dodges Mezo's getLogs block
// limit entirely. Intrinsic value is still read live per token for the discount.
async function fetchActivityFromSubgraph(
  url: string,
  limit: number,
  chainId: number,
  adapter: string,
  veBTC: string,
  musd: string,
): Promise<ActivityEvent[]> {
  const query = `{ activityEvents(first: ${limit}, orderBy: timestamp, orderDirection: desc, where: { type_in: ["listed","sale","cancelled"] }) {
    type listingId collection tokenId price paymentToken from to blockNumber timestamp txHash
  } }`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`subgraph ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error("subgraph query error");
  const rows = json.data.activityEvents as Record<string, string>[];

  // Intrinsic value per unique (collection, tokenId) for the discount column.
  const ivMap = new Map<string, bigint>();
  const lockMap = new Map<string, bigint>();
  const pairs = Array.from(new Set(rows.map((r) => `${r.collection.toLowerCase()}:${r.tokenId}`)))
    .map((k) => { const [c, t] = k.split(":"); return { key: k, collection: c, tokenId: BigInt(t) }; });
  const ivResults = await Promise.allSettled(
    pairs.map((p) =>
      withFallback(chainId, (client) =>
        client.readContract({
          address: adapter as `0x${string}`,
          abi: ADAPTER_ABI_IV,
          functionName: "getIntrinsicValue",
          args: [p.collection as `0x${string}`, p.tokenId],
        })
      )
    )
  );
  pairs.forEach((p, i) => {
    const r = ivResults[i];
    if (r.status === "fulfilled") {
      const [amount, lockEnd] = r.value as [bigint, bigint];
      ivMap.set(p.key, amount);
      lockMap.set(p.key, lockEnd);
    }
  });

  return rows.map((r) => {
    const collLower = r.collection.toLowerCase();
    const isVeBTC = collLower === veBTC.toLowerCase();
    const key = `${collLower}:${r.tokenId}`;
    const iv = ivMap.get(key) ?? 0n;
    const priceWei = BigInt(r.price ?? "0");
    const nftTokenAddr = isVeBTC ? BTC_ADDR : MEZO_ADDR;
    return {
      type: r.type as "sale" | "listed" | "cancelled",
      listingId: BigInt(r.listingId ?? "0"),
      collection: isVeBTC ? "veBTC" : "veMEZO",
      tokenId: BigInt(r.tokenId),
      price: parseFloat(formatEther(priceWei)).toFixed(4),
      paymentToken: getPaymentSymbol(r.paymentToken ?? "", musd),
      discountBps: computeDiscountBpsNumber(iv, nftTokenAddr, priceWei, r.paymentToken ?? "", lockMap.get(key)),
      from: r.from ?? "",
      to: r.to ?? null,
      blockNumber: BigInt(r.blockNumber),
      transactionHash: r.txHash,
      timestamp: r.timestamp ? Number(r.timestamp) * 1000 : null,
    } as ActivityEvent;
  });
}

export function useActivityFeed(limit = 50) {
  const { contracts, chainId } = useNetwork();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceAddress = contracts.marketplace as `0x${string}`;
  const isDeployed =
    marketplaceAddress !== "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    if (!publicClient || !isDeployed) return;

    let cancelled = false;

    async function fetchEvents() {
      setIsLoading(true);
      setError(null);

      try {
        // Preferred: read activity from the subgraph index (one query, no getLogs
        // block-limit). Falls through to the on-chain scan if unset or it fails.
        const subUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
        if (subUrl) {
          try {
            const evs = await fetchActivityFromSubgraph(
              subUrl, limit, chainId, contracts.adapter, contracts.veBTC, contracts.MUSD
            );
            // Only use the subgraph once it has data; while syncing it returns []
            // so we fall through to getLogs.
            if (evs.length > 0) {
              if (!cancelled) setEvents(evs);
              return;
            }
          } catch {
            // fall through to getLogs
          }
        }

        // Get current block number via fallback-aware client
        const latestBlock = await withFallback(chainId, (client) =>
          client.getBlockNumber()
        );
        // Both testnet and mainnet scan the last N blocks to avoid RPC range limits.
        const isTestnet = chainId === 31611;
        const lookBack = isTestnet ? LOOK_BACK_BLOCKS_TESTNET : LOOK_BACK_BLOCKS_MAINNET;
        const fromBlock = latestBlock > lookBack ? latestBlock - lookBack : 0n;

        if (cancelled) return;

        // Fetch all three event types in parallel using chunked requests
        const [listedLogs, purchasedLogs, cancelledLogs] = await Promise.all([
          fetchLogsChunked(chainId, marketplaceAddress, LISTED_EVENT,    fromBlock, latestBlock),
          fetchLogsChunked(chainId, marketplaceAddress, PURCHASED_EVENT, fromBlock, latestBlock),
          fetchLogsChunked(chainId, marketplaceAddress, CANCELLED_EVENT, fromBlock, latestBlock),
        ]);

        if (cancelled) return;

        // Collect unique block numbers to fetch timestamps
        const blockNumbers = new Set<bigint>();
        [...listedLogs, ...purchasedLogs, ...cancelledLogs].forEach((log: any) => {
          if (log.blockNumber != null) blockNumbers.add(log.blockNumber);
        });

        // Fetch block timestamps (capped to avoid rate limits)
        const blockTimestamps = new Map<bigint, number>();
        const blockArr = Array.from(blockNumbers).slice(0, 100);
        const blockData = await Promise.allSettled(
          blockArr.map((bn) =>
            withFallback(chainId, (client) => client.getBlock({ blockNumber: bn }))
          )
        );
        blockArr.forEach((bn, i) => {
          const result = blockData[i];
          if (result.status === "fulfilled") {
            blockTimestamps.set(bn, Number(result.value.timestamp) * 1000);
          }
        });

        if (cancelled) return;

        // ── Fetch intrinsic values from adapter for unique (collection, tokenId) pairs ──
        // Build a deduplicated map keyed by "collection:tokenId"
        const ivMap = new Map<string, bigint>();
        const lockEndMap = new Map<string, bigint>();
        const adapterAddress = contracts.adapter as `0x${string}`;
        const isAdapterReady =
          !!adapterAddress &&
          adapterAddress !== "0x0000000000000000000000000000000000000000";

        if (isAdapterReady) {
          // Collect unique pairs from all log types
          const pairs: { collection: string; tokenId: bigint; key: string }[] = [];
          const seen = new Set<string>();

          const collectPair = (collection: string, tokenId: bigint) => {
            if (!collection || tokenId === undefined) return;
            const key = `${collection.toLowerCase()}:${tokenId}`;
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push({ collection, tokenId, key });
            }
          };

          for (const log of listedLogs as any[]) {
            const a = log.args ?? {};
            collectPair(String(a.collection ?? ""), a.tokenId ?? 0n);
          }
          for (const log of purchasedLogs as any[]) {
            const a = log.args ?? {};
            const ll = (listedLogs as any[]).find((l: any) => l.args?.listingId === a.listingId);
            if (ll) collectPair(String(ll.args?.collection ?? ""), ll.args?.tokenId ?? 0n);
          }
          for (const log of cancelledLogs as any[]) {
            const a = log.args ?? {};
            const ll = (listedLogs as any[]).find((l: any) => l.args?.listingId === a.listingId);
            if (ll) collectPair(String(ll.args?.collection ?? ""), ll.args?.tokenId ?? 0n);
          }

          // Batch fetch intrinsic values; silently ignore failures per token
          const ivResults = await Promise.allSettled(
            pairs.map(({ collection, tokenId }) =>
              withFallback(chainId, (client) =>
                client.readContract({
                  address: adapterAddress,
                  abi: ADAPTER_ABI_IV,
                  functionName: "getIntrinsicValue",
                  args: [collection as `0x${string}`, tokenId],
                })
              )
            )
          );

          pairs.forEach(({ key }, i) => {
            const res = ivResults[i];
            if (res.status === "fulfilled") {
              const [amount, lockEnd] = res.value as [bigint, bigint];
              ivMap.set(key, amount);
              lockEndMap.set(key, lockEnd);
            }
          });
        }

        if (cancelled) return;

        const allEvents: ActivityEvent[] = [];

        for (const log of listedLogs as any[]) {
          const args = log.args ?? {};
          const isVeBTC =
            String(args.collection ?? "").toLowerCase() ===
            contracts.veBTC.toLowerCase();
          const nftTokenAddr = isVeBTC ? BTC_ADDR : MEZO_ADDR;
          const ivKey = `${String(args.collection ?? "").toLowerCase()}:${args.tokenId ?? 0n}`;
          const iv = ivMap.get(ivKey) ?? 0n;
          const priceRaw = (args.price as bigint) ?? 0n;
          allEvents.push({
            type: "listed",
            listingId: args.listingId ?? 0n,
            collection: isVeBTC ? "veBTC" : "veMEZO",
            tokenId: args.tokenId ?? 0n,
            price: parseFloat(formatEther(priceRaw)).toFixed(4),
            paymentToken: getPaymentSymbol(args.paymentToken ?? "", contracts.MUSD),
            discountBps: computeDiscountBpsNumber(iv, nftTokenAddr, priceRaw, args.paymentToken ?? "", lockEndMap.get(ivKey)),
            from: args.seller ?? "",
            to: null,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash ?? "",
            timestamp: log.blockNumber ? (blockTimestamps.get(log.blockNumber) ?? null) : null,
          });
        }

        for (const log of purchasedLogs as any[]) {
          const args = log.args ?? {};
          const listedLog = (listedLogs as any[]).find(
            (l: any) => l.args?.listingId === args.listingId
          );
          const listedArgs = listedLog?.args ?? {};
          const collection =
            String(listedArgs.collection ?? "").toLowerCase() ===
            contracts.veBTC.toLowerCase()
              ? "veBTC"
              : "veMEZO";
          const nftTokenAddr = collection === "veBTC" ? BTC_ADDR : MEZO_ADDR;
          const ivKey = `${String(listedArgs.collection ?? "").toLowerCase()}:${listedArgs.tokenId ?? 0n}`;
          const iv = ivMap.get(ivKey) ?? 0n;
          const priceRaw = (args.price as bigint) ?? 0n;

          allEvents.push({
            type: "sale",
            listingId: args.listingId ?? 0n,
            collection,
            tokenId: listedArgs.tokenId ?? 0n,
            price: parseFloat(formatEther(priceRaw)).toFixed(4),
            paymentToken: getPaymentSymbol(listedArgs.paymentToken ?? "", contracts.MUSD),
            discountBps: computeDiscountBpsNumber(iv, nftTokenAddr, priceRaw, listedArgs.paymentToken ?? "", lockEndMap.get(ivKey)),
            from: args.seller ?? "",
            to: args.buyer ?? null,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash ?? "",
            timestamp: log.blockNumber ? (blockTimestamps.get(log.blockNumber) ?? null) : null,
          });
        }

        for (const log of cancelledLogs as any[]) {
          const args = log.args ?? {};
          const listedLog = (listedLogs as any[]).find(
            (l: any) => l.args?.listingId === args.listingId
          );
          const listedArgs = listedLog?.args ?? {};
          const collection =
            String(listedArgs.collection ?? "").toLowerCase() ===
            contracts.veBTC.toLowerCase()
              ? "veBTC"
              : "veMEZO";
          const nftTokenAddr = collection === "veBTC" ? BTC_ADDR : MEZO_ADDR;
          const ivKey = `${String(listedArgs.collection ?? "").toLowerCase()}:${listedArgs.tokenId ?? 0n}`;
          const iv = ivMap.get(ivKey) ?? 0n;
          const priceRaw = (listedArgs.price as bigint) ?? 0n;

          allEvents.push({
            type: "cancelled",
            listingId: args.listingId ?? 0n,
            collection,
            tokenId: listedArgs.tokenId ?? 0n,
            price: parseFloat(formatEther(priceRaw)).toFixed(4),
            paymentToken: getPaymentSymbol(listedArgs.paymentToken ?? "", contracts.MUSD),
            discountBps: computeDiscountBpsNumber(iv, nftTokenAddr, priceRaw, listedArgs.paymentToken ?? "", lockEndMap.get(ivKey)),
            from: listedArgs.seller ?? "",
            to: null,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash ?? "",
            timestamp: log.blockNumber ? (blockTimestamps.get(log.blockNumber) ?? null) : null,
          });
        }

        // Sort by block number descending, then cap
        allEvents.sort((a, b) =>
          a.blockNumber > b.blockNumber ? -1 : a.blockNumber < b.blockNumber ? 1 : 0
        );

        if (!cancelled) {
          setEvents(allEvents.slice(0, limit));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load activity");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [publicClient, marketplaceAddress, isDeployed, chainId, contracts.veBTC, contracts.MUSD, contracts.adapter, limit]);

  return { events, isLoading, error, isDeployed };
}
