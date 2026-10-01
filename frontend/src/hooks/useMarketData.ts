"use client";

/**
 * Market data layer.
 *
 * Components consume these typed hooks and never build queries themselves.
 * Two sources, kept semantically separate on purpose:
 *
 *   LIVE      useLiveMarket()    What can be bought right now. From
 *                                /api/listings, which verifies on-chain that
 *                                each seller still owns and has approved the
 *                                position.
 *
 *   ALL-TIME  useMarketHistory() What has happened since launch. From
 *                                /api/market-stats, computed from the Goldsky
 *                                subgraph's indexed events and cached 60s.
 *
 * Every hook returns an explicit status so each surface can render loading,
 * empty, stale and failure deliberately instead of guessing from nulls.
 */

import { useMemo, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useActiveListings, type Listing } from "./useMarketplace";
import { usePriceTicker } from "./usePriceTicker";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import type { MarketStats } from "@/app/api/market-stats/route";

export type DataStatus = "loading" | "ready" | "empty" | "stale" | "error";

// ─── Live market ─────────────────────────────────────────────────────────────

export interface LiveMarket {
  status: DataStatus;
  listings: Listing[];
  /** Best discount first; listings without a computable discount go last. */
  byDiscount: Listing[];
  count: number;
  avgDiscountPct: number | null;
  floor: { veBTC: Listing | null; veMEZO: Listing | null };
  refetch: () => void;
}

export function useLiveMarket(): LiveMarket {
  const { listings, isLoading, isError, refetch } = useActiveListings();
  const prices = usePriceTicker();

  return useMemo(() => {
    const open = listings.filter((l) => l.active);
    const byDiscount = [...open].sort((a, b) => {
      const da = a.discountBps === null ? -Infinity : Number(a.discountBps);
      const db = b.discountBps === null ? -Infinity : Number(b.discountBps);
      return db - da;
    });
    const priced = open.filter((l) => l.discountBps !== null);
    const avgDiscountPct = priced.length
      ? priced.reduce((s, l) => s + Number(l.discountBps), 0) / priced.length / 100
      : null;

    const usd = (l: Listing) => {
      const unit = prices[getPaymentTokenSymbol(l.paymentToken) as "BTC" | "MEZO" | "MUSD"];
      return unit ? unit * parseFloat(formatEther(l.price)) : null;
    };
    const floorOf = (c: "veBTC" | "veMEZO") => {
      const group = open.filter((l) => l.collection === c);
      if (!group.length) return null;
      const withUsd = group.map((l) => ({ l, v: usd(l) }));
      if (withUsd.every((x) => x.v !== null)) {
        return withUsd.reduce((a, b) => (b.v! < a.v! ? b : a)).l;
      }
      // Feed unavailable: only comparable when every listing shares a currency.
      const sym = getPaymentTokenSymbol(group[0]!.paymentToken);
      if (!group.every((l) => getPaymentTokenSymbol(l.paymentToken) === sym)) return null;
      return group.reduce((a, b) => (b.price < a.price ? b : a));
    };

    const status: DataStatus = isLoading
      ? "loading"
      : isError && open.length === 0
        ? "error"
        : isError
          ? "stale"
          : open.length === 0
            ? "empty"
            : "ready";

    return {
      status,
      listings: open,
      byDiscount,
      count: open.length,
      avgDiscountPct,
      floor: { veBTC: floorOf("veBTC"), veMEZO: floorOf("veMEZO") },
      refetch: () => void refetch(),
    };
  }, [listings, isLoading, isError, refetch, prices]);
}

// ─── All-time history ────────────────────────────────────────────────────────

export interface MarketHistory {
  status: DataStatus;
  stats: MarketStats | null;
}

/** The index is considered stale when its last block is older than this. */
const STALE_AFTER_S = 30 * 60;

export function useMarketHistory(): MarketHistory {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-stats"],
    queryFn: async (): Promise<MarketStats> => {
      const res = await fetch("/api/market-stats");
      if (!res.ok) throw new Error(`market-stats ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return useMemo(() => {
    if (isLoading && !data) return { status: "loading", stats: null };
    if (!data || data.status === "unavailable") return { status: isError || data ? "error" : "loading", stats: null };
    const nowS = Math.floor(Date.now() / 1000);
    const stale = data.indexedAt !== null && nowS - data.indexedAt > STALE_AFTER_S;
    if (data.totalListings === 0 && data.totalSales === 0) return { status: "empty", stats: data };
    return { status: stale ? "stale" : "ready", stats: data };
  }, [data, isLoading, isError]);
}

// ─── Number transitions ──────────────────────────────────────────────────────

/**
 * Eases a displayed number toward its target when real data changes. Starts at
 * the target on first render (no counting up from zero on load, which reads as
 * a gimmick) and respects prefers-reduced-motion.
 */
export function useTweenedNumber(target: number | null, durationMs = 600): number | null {
  const [value, setValue] = useState<number | null>(target);
  const from = useRef<number | null>(target);
  useEffect(() => {
    if (target === null) { setValue(null); from.current = null; return; }
    const start = from.current;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (start === null || start === target || reduce) { setValue(target); from.current = target; return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// ─── Formatting shared by every KPI surface ──────────────────────────────────

export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 4 : 2 });
}
