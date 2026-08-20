"use client";

/*
  ListingDetailModal — one veNFT, presented the way the space presents single
  assets: a portaled glass surface with the full position spec sheet, the
  offers book, and the buy action in one place. Replaces the card's inline
  offers expander.
*/

import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, ChevronRight, Award } from "lucide-react";
import { Listing } from "@/hooks/useMarketplace";
import { DiscountBadge } from "./DiscountBadge";
import { CountdownCompact } from "./CountdownTimer";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import BidsPanel from "./BidsPanel";

interface ListingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  unitUsd: number | null;
  onBuy: (listing: Listing) => void;
}

function fmtAmount(wei: bigint) {
  const v = parseFloat(formatEther(wei));
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

export function ListingDetailModal({ isOpen, onClose, listing, unitUsd, onBuy }: ListingDetailModalProps) {
  if (!listing) return null;
  if (typeof document === "undefined") return null;

  const isVeBTC = listing.collection === "veBTC";
  const dot = isVeBTC ? "#F7931A" : "#4A90E2";
  const lockedSym = isVeBTC ? "BTC" : "MEZO";
  const paySymbol = getPaymentTokenSymbol(listing.paymentToken);
  const lockEndSec = Number(listing.lockEnd);
  const isPermanent = lockEndSec === 0;
  const isExpired = !isPermanent && lockEndSec <= Math.floor(Date.now() / 1000);
  const discountPct = listing.discountBps !== null ? Number(listing.discountBps) / 100 : 0;
  const priceUsd = unitUsd ? unitUsd * parseFloat(formatEther(listing.price)) : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px) saturate(180%)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
            style={{
              background: "color-mix(in srgb, var(--bg-1) 84%, transparent)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                <h2 className="text-[16px] font-bold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                  {listing.collection}
                </h2>
                <span className="text-[16px] tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                  #{listing.tokenId.toString()}
                </span>
                {listing.isGrant && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: "#F59E0B", background: "rgba(245,158,11,0.1)" }}
                  >
                    <Award style={{ width: 9, height: 9 }} />
                    Grant
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <DiscountBadge discountBps={listing.discountBps === null ? null : Number(listing.discountBps)} />
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  <X style={{ width: 17, height: 17 }} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Price hero */}
              <div
                className="p-5 rounded-xl"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)" }}
              >
                <p className="eyebrow mb-1.5" style={{ color: "var(--text-3)" }}>Price</p>
                <p
                  className="tabular-nums font-bold"
                  style={{ fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: "var(--text-1)" }}
                >
                  {fmtAmount(listing.price)}{" "}
                  <span className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>{paySymbol}</span>
                </p>
                {(priceUsd || discountPct > 0) && (
                  <p className="text-[12.5px] mt-2 tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                    {priceUsd ? <>&#8776; ${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</> : null}
                    {priceUsd && discountPct > 0 ? " · " : null}
                    {discountPct > 0 && (
                      <span className="font-semibold" style={{ color: "#10B981" }}>
                        {discountPct.toFixed(1)}% below intrinsic value
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Position spec sheet */}
              <div>
                <SpecRow label="Intrinsic value" value={`${fmtAmount(listing.intrinsicValue)} ${lockedSym}`} />
                <SpecRow label="Voting power" value={parseFloat(formatEther(listing.votingPower)).toFixed(2)} />
                <SpecRow
                  label="Lock ends"
                  value={isPermanent ? "Permanent" : isExpired ? "Expired" : <CountdownCompact lockEnd={listing.lockEnd} />}
                />
                <SpecRow
                  label="Seller"
                  value={<span className="font-mono">{listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}</span>}
                />
                <SpecRow label="Payment token" value={paySymbol} />
              </div>

              {/* Buy */}
              <button
                onClick={() => onBuy(listing)}
                disabled={isExpired || !listing.active}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] disabled:cursor-not-allowed"
                style={{
                  background: isExpired || !listing.active ? "var(--bg-2)" : "var(--text-1)",
                  color: isExpired || !listing.active ? "var(--text-3)" : "var(--bg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {!listing.active ? "Inactive" : isExpired ? "Position expired" : "Buy now"}
                {!isExpired && listing.active && <ChevronRight style={{ width: 15, height: 15 }} />}
              </button>

              {/* Offers book */}
              {listing.nftContract && (
                <BidsPanel
                  collection={listing.nftContract as `0x${string}`}
                  tokenId={listing.tokenId}
                  currentOwner={listing.seller as `0x${string}`}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
