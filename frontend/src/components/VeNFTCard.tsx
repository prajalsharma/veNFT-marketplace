"use client";

import { formatEther } from "viem";
import { motion } from "framer-motion";
import { Zap, Clock, CalendarDays, TrendingDown, Tag, ArrowRight } from "lucide-react";
import { DiscountBadge } from "./DiscountBadge";
import { CountdownCompact } from "./CountdownTimer";
import { getPaymentTokenSymbol } from "@/lib/tokens";

interface VeNFTCardProps {
  listingId: number;
  collection: "veBTC" | "veMEZO";
  tokenId: bigint;
  price: bigint;
  paymentToken: string;
  intrinsicValue: bigint;
  lockEnd: bigint;
  votingPower: bigint;
  discountBps: bigint;
  seller: string;
  active?: boolean;
  onBuy?: () => void;
}

export function VeNFTCard({
  listingId,
  collection,
  tokenId,
  price,
  paymentToken,
  intrinsicValue,
  lockEnd,
  votingPower,
  discountBps,
  seller,
  active = true,
  onBuy,
}: VeNFTCardProps) {
  const isVeBTC = collection === "veBTC";
  const lockEndSec  = Number(lockEnd);
  const isPermanent = lockEndSec === 0;
  const isExpired   = !isPermanent && lockEndSec <= Math.floor(Date.now() / 1000);

  const formattedPrice       = parseFloat(formatEther(price)).toFixed(5);
  const formattedIntrinsic   = parseFloat(formatEther(intrinsicValue)).toFixed(5);
  const formattedVotingPower = parseFloat(formatEther(votingPower)).toFixed(2);

  const lockExpiryDate = isPermanent ? null : new Date(lockEndSec * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const accentColor = isVeBTC ? "#F7931A" : "#4A90E2";
  const accentBg    = isVeBTC ? "rgba(247,147,26,0.1)"  : "rgba(74,144,226,0.1)";
  const accentBord  = isVeBTC ? "rgba(247,147,26,0.22)" : "rgba(74,144,226,0.22)";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`group relative flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden transition-all duration-300 hover:border-white/[0.1] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] ${isExpired ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Accent top-edge line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      {/* Ambient glow corner */}
      <div
        className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${accentColor}12 0%, transparent 70%)` }}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg, border: `1px solid ${accentBord}` }}
          >
            <Zap className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-none">
              {collection}{" "}
              <span style={{ color: accentColor }}>#{tokenId.toString()}</span>
            </p>
            <p className="text-[10px] text-white/25 font-mono mt-1 leading-none">
              {seller.slice(0, 6)}…{seller.slice(-4)}
            </p>
          </div>
        </div>
        <DiscountBadge discountBps={Number(discountBps)} />
      </div>

      {/* ── Intrinsic value hero ── */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/30 mb-1.5">Intrinsic Value</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[2rem] font-bold tabular-nums tracking-tight leading-none" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {formattedIntrinsic}
          </span>
          <span className="text-sm font-bold text-white/35">{isVeBTC ? "BTC" : "MEZO"}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/[0.055]" />

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {/* Voting power */}
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3 h-3" style={{ color: accentColor }} />
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/30">Voting Power</span>
          </div>
          <p className="text-[13px] font-bold tabular-nums leading-none">{formattedVotingPower}</p>
        </div>

        {/* Listing price */}
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/30">Ask Price</span>
          </div>
          <p className="text-[13px] font-bold tabular-nums leading-none text-emerald-400">
            {formattedPrice}{" "}
            <span className="text-white/30 font-medium text-[11px]">{getPaymentTokenSymbol(paymentToken)}</span>
          </p>
        </div>

        {/* Lock ends — full row */}
        <div className="col-span-2 rounded-xl bg-white/[0.025] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3 h-3 text-white/30" />
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/30">Lock Ends</span>
          </div>
          <div className="flex items-center justify-between">
            <CountdownCompact lockEnd={lockEnd} />
            {lockExpiryDate && (
              <div className="flex items-center gap-1 text-white/25">
                <CalendarDays className="w-3 h-3" />
                <span className="text-[10px] font-medium">{lockExpiryDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mt-auto px-4 pb-4">
        <button
          onClick={onBuy}
          disabled={isExpired || !active}
          className={`group/btn relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13.5px] font-bold overflow-hidden transition-all duration-200 ${
            isExpired || !active
              ? "bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.05]"
              : "bg-white text-black hover:bg-[#F7931A] hover:text-black"
          }`}
        >
          {/* Shimmer */}
          {active && !isExpired && (
            <span className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          )}
          <span className="relative z-10">
            {!active ? "Inactive" : isExpired ? "Expired" : "Buy Now"}
          </span>
          {active && !isExpired && (
            <ArrowRight className="relative z-10 w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>
    </motion.article>
  );
}

export function VeNFTCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg shimmer" />
          <div>
            <div className="h-3 w-24 rounded shimmer mb-2" />
            <div className="h-2.5 w-16 rounded shimmer" />
          </div>
        </div>
        <div className="h-5 w-14 rounded-full shimmer" />
      </div>
      <div className="px-5 pb-5">
        <div className="h-2.5 w-20 rounded shimmer mb-2" />
        <div className="h-9 w-40 rounded shimmer" />
      </div>
      <div className="mx-5 h-px bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-2 p-4">
        <div className="h-[68px] rounded-xl shimmer" />
        <div className="h-[68px] rounded-xl shimmer" />
        <div className="col-span-2 h-[68px] rounded-xl shimmer" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-12 w-full rounded-xl shimmer" />
      </div>
    </div>
  );
}
