"use client";

/**
 * BestDealsCarousel — homepage section showing top 3 listings by discount.
 *
 * Data comes from the wagmi marketplace hooks (same source as MarketplaceClient)
 * so no extra RPC calls are made — just a filtered/sorted view.
 *
 * Rules:
 *  – 0 active listings  → renders nothing
 *  – 1-3 listings       → shows all of them
 *  – >3 listings        → shows top 3 by discount (intrinsicValue - price)
 *  – Expired / inactive listings are filtered out
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { TrendingUp, ChevronLeft, ChevronRight, Zap, Tag, ArrowRight } from "lucide-react";
import { useMarketplace, useListing, Listing } from "@/hooks/useMarketplace";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { DiscountBadge } from "./DiscountBadge";
import { CountdownCompact } from "./CountdownTimer";

// ── Deal card ─────────────────────────────────────────────────────────────────

function DealCard({ listing }: { listing: Listing }) {
  const isVeBTC     = listing.collection === "veBTC";
  const accentColor = isVeBTC ? "#F7931A" : "#4A90E2";
  const accentBg    = isVeBTC ? "rgba(247,147,26,0.1)"  : "rgba(74,144,226,0.1)";
  const accentBord  = isVeBTC ? "rgba(247,147,26,0.22)" : "rgba(74,144,226,0.22)";

  const formattedPrice     = parseFloat(formatEther(listing.price)).toFixed(5);
  const formattedIntrinsic = parseFloat(formatEther(listing.intrinsicValue)).toFixed(5);
  const discountPct        = (Number(listing.discountBps) / 100).toFixed(1);

  return (
    <Link href="/marketplace" className="block h-full">
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.25 }}
        className="group relative flex flex-col h-full rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden cursor-pointer hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-300"
      >
        {/* Accent top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />

        {/* Corner glow */}
        <div
          className="absolute top-0 right-0 w-40 h-40 opacity-40 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, ${accentColor}18 0%, transparent 70%)` }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: accentBg, border: `1px solid ${accentBord}` }}
            >
              <Zap className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-[13px] font-bold leading-none">
                {listing.collection}{" "}
                <span style={{ color: accentColor }}>#{listing.tokenId.toString()}</span>
              </p>
              <p className="text-[10px] text-white/25 font-mono mt-1 leading-none">
                {listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}
              </p>
            </div>
          </div>
          <DiscountBadge discountBps={Number(listing.discountBps)} />
        </div>

        {/* Intrinsic value */}
        <div className="px-5 pb-4">
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/30 mb-1">Intrinsic Value</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[1.75rem] font-bold tabular-nums tracking-tight leading-none">
              {formattedIntrinsic}
            </span>
            <span className="text-sm font-bold text-white/35">{isVeBTC ? "BTC" : "MEZO"}</span>
          </div>
        </div>

        <div className="mx-5 h-px bg-white/[0.055]" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-white/30">Ask Price</span>
            </div>
            <p className="text-[13px] font-bold tabular-nums text-emerald-400 leading-none">
              {formattedPrice}{" "}
              <span className="text-white/30 font-medium text-[11px]">{getPaymentTokenSymbol(listing.paymentToken)}</span>
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-white/30">Discount</span>
            </div>
            <p className="text-[13px] font-bold tabular-nums text-emerald-400 leading-none">
              {discountPct}% OFF
            </p>
          </div>

          <div className="col-span-2 rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
            <CountdownCompact lockEnd={listing.lockEnd} />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto px-4 pb-4">
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[13px] font-bold text-white/60 group-hover:bg-[#F7931A] group-hover:text-black group-hover:border-transparent transition-all duration-200">
            View Deal
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Listing resolver (same pattern as MarketplaceClient) ──────────────────────

function ListingResolver({
  listingId,
  onResolved,
}: {
  listingId: number;
  onResolved: (id: number, listing: Listing | null) => void;
}) {
  const { listing, isLoading } = useListing(listingId);
  useEffect(() => {
    if (!isLoading) onResolved(listingId, listing);
  }, [isLoading, listing, listingId, onResolved]);
  return null;
}

// ── BestDealsCarousel ─────────────────────────────────────────────────────────

export default function BestDealsCarousel() {
  const { nextListingId } = useMarketplace();

  const allIds = useMemo(
    () => Array.from({ length: nextListingId }, (_, i) => i),
    [nextListingId]
  );

  const [listingMap, setListingMap] = useState<Record<number, Listing>>({});

  const handleResolved = useCallback((id: number, listing: Listing | null) => {
    if (!listing) return;
    setListingMap((prev) => {
      const ex = prev[id];
      if (
        ex &&
        ex.active === listing.active &&
        ex.price === listing.price &&
        ex.discountBps === listing.discountBps
      )
        return prev;
      return { ...prev, [id]: listing };
    });
  }, []);

  // Filter active, non-expired, positive discount → sort by discount desc → top 3
  const deals = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return Object.values(listingMap)
      .filter((l) => {
        const notExpired = Number(l.lockEnd) === 0 || Number(l.lockEnd) > now;
        return l.active && notExpired && l.discountBps > 0n;
      })
      .sort((a, b) => (a.discountBps > b.discountBps ? -1 : 1))
      .slice(0, 3);
  }, [listingMap]);

  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance carousel only on mobile (1 card visible at a time)
  const startAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % Math.max(deals.length, 1));
    }, 4000);
  }, [deals.length]);

  useEffect(() => {
    if (deals.length > 1) startAuto();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [deals.length, startAuto]);

  // Silently resolve all listings (no UI rendered)
  if (nextListingId === 0) return null;

  return (
    <>
      {/* Resolve all listings in the background */}
      {allIds.map((id) => (
        <ListingResolver key={id} listingId={id} onResolved={handleResolved} />
      ))}

      {/* Only render section once we have deals */}
      {deals.length > 0 && (
        <section className="py-20 px-6 border-t border-white/[0.055]">
          <div className="max-w-7xl mx-auto">

            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-emerald-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Best Deals Right Now
                </p>
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-tight">
                  Top discounted{" "}
                  <span className="gradient-text">positions</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {deals.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setActiveIndex((i) => (i - 1 + deals.length) % deals.length);
                        startAuto();
                      }}
                      className="w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white hover:border-white/[0.14] transition-all sm:hidden"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveIndex((i) => (i + 1) % deals.length);
                        startAuto();
                      }}
                      className="w-9 h-9 rounded-xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white hover:border-white/[0.14] transition-all sm:hidden"
                      aria-label="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                <Link
                  href="/marketplace"
                  className="hidden sm:flex items-center gap-2 text-[13px] font-bold text-white/40 hover:text-white/80 transition-colors"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Desktop: show all cards in a grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((listing, i) => (
                <motion.div
                  key={listing.listingId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <DealCard listing={listing} />
                </motion.div>
              ))}
            </div>

            {/* Mobile: single-card carousel with AnimatePresence */}
            <div className="sm:hidden overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.28 }}
                >
                  <DealCard listing={deals[activeIndex]} />
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              {deals.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {deals.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveIndex(i); startAuto(); }}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === activeIndex
                          ? "w-5 bg-[#F7931A]"
                          : "w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile "view all" link */}
            <div className="sm:hidden mt-6 text-center">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 text-[13px] font-bold text-white/40 hover:text-white/80 transition-colors"
              >
                View all listings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
