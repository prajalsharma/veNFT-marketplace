"use client";

// Restrained, professional listing card. Price is the single focal point; the
// rest is a clean label/value spec sheet. No 3D tilt, cursor spotlight, gradient
// bands, edge accents, or button shimmer — those "demo" effects are what made the
// card read as AI-generated. One discount badge, one CTA, consistent type scale.

import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Gavel } from "lucide-react";
import { useState } from "react";
import { DiscountBadge } from "./DiscountBadge";
import { CountdownCompact } from "./CountdownTimer";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import BidsPanel from "./BidsPanel";

interface VeNFTCardProps {
  listingId: number;
  collection: "veBTC" | "veMEZO";
  nftContract?: string;
  tokenId: bigint;
  price: bigint;
  paymentToken: string;
  intrinsicValue: bigint;
  lockEnd: bigint;
  votingPower: bigint;
  discountBps: bigint | null;
  seller: string;
  active?: boolean;
  isGrant?: boolean;
  onBuy?: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

export function VeNFTCard({
  collection,
  nftContract,
  tokenId,
  price,
  paymentToken,
  intrinsicValue,
  lockEnd,
  votingPower,
  discountBps,
  seller,
  active = true,
  isGrant = false,
  onBuy,
}: VeNFTCardProps) {
  const isVeBTC = collection === "veBTC";
  const lockEndSec = Number(lockEnd);
  const isPermanent = lockEndSec === 0;
  const isExpired = !isPermanent && lockEndSec <= Math.floor(Date.now() / 1000);
  const disabled = isExpired || !active;

  const lockedSym = isVeBTC ? "BTC" : "MEZO";
  const formattedPrice = parseFloat(formatEther(price)).toFixed(4);
  const formattedIntrinsic = parseFloat(formatEther(intrinsicValue)).toFixed(4);
  const formattedVoting = parseFloat(formatEther(votingPower)).toFixed(2);
  const paySymbol = getPaymentTokenSymbol(paymentToken);
  const discountPct = discountBps !== null ? Number(discountBps) / 100 : 0;

  // A small, muted per-collection dot — the only color cue (keeps the brand calm).
  const dot = isVeBTC ? "#F7931A" : "#4A90E2";

  const [bidsOpen, setBidsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className={`nft-card rounded-2xl overflow-hidden ${disabled ? "nft-card--disabled" : ""}`}
      style={{ background: "var(--bg-1)" }}
    >
      <div className="p-5">
        {/* Header — collection + id, discount badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            <span className="text-[14px] font-bold" style={{ color: "var(--text-1)" }}>{collection}</span>
            <span className="text-[14px] tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>#{tokenId.toString()}</span>
            {isGrant && (
              <span className="text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.1)" }}>
                Grant
              </span>
            )}
          </div>
          <DiscountBadge discountBps={discountBps === null ? null : Number(discountBps)} />
        </div>

        {/* Price — the focal point */}
        <div className="mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Price</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold tabular-nums" style={{ fontSize: "1.95rem", letterSpacing: "-0.04em", color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
              {formattedPrice}
            </span>
            <span className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>{paySymbol}</span>
          </div>
          {discountPct > 0 && (
            <p className="text-[12.5px] font-semibold mt-1.5" style={{ color: "#10B981" }}>
              {discountPct.toFixed(1)}% below intrinsic value
            </p>
          )}
        </div>

        {/* Spec rows */}
        <div className="mb-5">
          <Row label="Intrinsic value" value={`${formattedIntrinsic} ${lockedSym}`} />
          <Row label="Voting power" value={formattedVoting} />
          <Row label="Lock ends" value={isPermanent ? "Permanent" : isExpired ? "Expired" : <CountdownCompact lockEnd={lockEnd} />} />
          <Row label="Seller" value={<span className="font-mono">{seller.slice(0, 6)}…{seller.slice(-4)}</span>} />
        </div>

        {/* CTA */}
        <button
          onClick={onBuy}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          style={{
            background: disabled ? "var(--bg-2)" : "var(--text-1)",
            color: disabled ? "var(--text-3)" : "var(--bg)",
            border: disabled ? "1px solid var(--border-subtle)" : "none",
            letterSpacing: "-0.01em",
          }}
        >
          {!active ? "Inactive" : isExpired ? "Position expired" : "Buy now"}
          {!disabled && <ChevronRight style={{ width: 15, height: 15 }} />}
        </button>
      </div>

      {/* Offers / Bids — subtle, collapsible */}
      {nftContract && (
        <div className="px-5 pb-5">
          <button
            onClick={() => setBidsOpen((o) => !o)}
            aria-expanded={bidsOpen}
            className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }}
          >
            <span className="flex items-center gap-2"><Gavel style={{ width: 12, height: 12 }} /> Offers</span>
            <ChevronDown style={{ width: 12, height: 12, transform: bidsOpen ? "rotate(180deg)" : "none", transition: "transform 220ms ease" }} />
          </button>
          <AnimatePresence>
            {bidsOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
                <div className="pt-3">
                  <BidsPanel collection={nftContract as `0x${string}`} tokenId={tokenId} currentOwner={seller as `0x${string}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ─── Skeleton — matches the new simpler layout ───────────────────────────────
export function VeNFTCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 skeleton rounded" />
          <div className="h-5 w-14 skeleton rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-12 skeleton rounded" />
          <div className="h-8 w-32 skeleton rounded" />
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <div className="h-2.5 w-20 skeleton rounded" />
              <div className="h-2.5 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
        <div className="h-11 skeleton rounded-xl" />
      </div>
    </div>
  );
}
