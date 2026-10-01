"use client";

// A listing, presented as a financial position rather than a dashboard widget.
//
// Hierarchy, in the order a buyer reads it: what the position is and how long
// it is locked (glyph + name), what it costs (the one large number), how that
// price relates to what it holds (the value bar), then the action. Voting
// power and the seller are secondary and live in the buy popup, where the
// purchase decision is actually made. Offers expand inline so several
// listings' offers can be compared side by side.

import { useState } from "react";
import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CountdownCompact } from "./CountdownTimer";
import BidsPanel from "./BidsPanel";
import { PositionGlyph, PriceValueBar } from "./market/PositionVisuals";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { useActiveTokenBids } from "@/hooks/useBidding";

export interface VeNFTCardProps {
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
  /** USD price of one unit of the payment token, for fiat context under the price. */
  unitUsd?: number | null;
  onBuy?: () => void;
}

export function fmtAmount(wei: bigint): string {
  const v = parseFloat(formatEther(wei));
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function GrantTag() {
  return (
    <span
      className="text-[12px] font-semibold px-1.5 py-0.5 rounded shrink-0 cursor-help"
      style={{ color: "#B45309", background: "rgba(245,158,11,0.14)" }}
      title="Grant-vested position: until vesting ends, the grant manager can revoke unvested tokens, and merge/split are disabled."
    >
      Grant
    </span>
  );
}

export function DiscountText({ discountBps }: { discountBps: bigint | null }) {
  if (discountBps === null) return <span style={{ color: "var(--text-3)" }}>n/a</span>;
  const d = Number(discountBps) / 100;
  if (d === 0) return <span style={{ color: "var(--text-2)" }}>At value</span>;
  return (
    <span className="tabular-nums" style={{ color: d > 0 ? "var(--success)" : "#EF4444", fontVariantNumeric: "tabular-nums" }}>
      {d > 0 ? `${d.toFixed(1)}% off` : `${(-d).toFixed(1)}% over`}
    </span>
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
  discountBps,
  seller,
  active = true,
  isGrant = false,
  unitUsd = null,
  onBuy,
}: VeNFTCardProps) {
  const lockEndSec = Number(lockEnd);
  const isPermanent = lockEndSec === 0;
  const isExpired = !isPermanent && lockEndSec <= Math.floor(Date.now() / 1000);
  const disabled = isExpired || !active;
  const lockedSym = collection === "veBTC" ? "BTC" : "MEZO";
  const paySymbol = getPaymentTokenSymbol(paymentToken);
  const usd = unitUsd ? unitUsd * parseFloat(formatEther(price)) : null;

  // Batched through Multicall3: one read covers every card on screen.
  const { data: activeBids } = useActiveTokenBids(nftContract as `0x${string}` | undefined, tokenId);
  const offerCount = Array.isArray(activeBids) ? activeBids.length : 0;
  const [offersOpen, setOffersOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      layout
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`position-card rounded-xl overflow-hidden ${disabled ? "nft-card--disabled" : ""}`}
    >
      <div className="p-5">
        {/* Identity: what this is, and how locked it is */}
        <div className="flex items-center gap-3 mb-5">
          <PositionGlyph collection={collection} lockEnd={lockEnd} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold truncate" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                {collection} <span className="tabular-nums font-semibold" style={{ color: "var(--text-3)" }}>#{tokenId.toString()}</span>
              </h3>
              {isGrant && <GrantTag />}
            </div>
            <p className="text-[13px] mt-0.5 tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
              {isPermanent ? "Permanent lock" : isExpired ? "Lock expired" : <>Unlocks in <CountdownCompact lockEnd={lockEnd} /></>}
            </p>
          </div>
        </div>

        {/* Price, the focal point */}
        <div className="flex items-baseline justify-between gap-3">
          <p className="price-figure" style={{ color: "var(--text-1)" }}>
            {fmtAmount(price)}
            <span className="text-[14px] font-semibold ml-1.5" style={{ color: "var(--text-2)", letterSpacing: 0 }}>{paySymbol}</span>
          </p>
          <span className="text-[14px] font-semibold"><DiscountText discountBps={discountBps} /></span>
        </div>
        <p className="text-[13px] mt-1 tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
          {usd !== null ? <>&#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</> : " "}
        </p>

        {/* Price against what the position holds */}
        <div className="mt-4">
          <PriceValueBar discountBps={discountBps} legend />
          <p className="text-[12px] mt-1.5 tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
            Holds <span className="font-semibold" style={{ color: "var(--text-2)" }}>{fmtAmount(intrinsicValue)} {lockedSym}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onBuy}
            disabled={disabled}
            className="btn-buy flex-1 h-11 rounded-lg text-[14px] font-semibold disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
          >
            {!active ? "Inactive" : isExpired ? "Lock expired" : "Buy"}
          </button>
          {nftContract && (
            <button
              onClick={() => setOffersOpen((o) => !o)}
              aria-expanded={offersOpen}
              aria-label={offerCount > 0 ? `${offerCount} offers` : "Offers"}
              className="btn-quiet h-11 px-4 rounded-lg text-[14px] font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            >
              Offers
              {offerCount > 0 && (
                <span className="tabular-nums" style={{ color: "#FF0040" }}>{offerCount}</span>
              )}
              <ChevronDown style={{ width: 14, height: 14, transform: offersOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)" }} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {offersOpen && nftContract && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <BidsPanel collection={nftContract as `0x${string}`} tokenId={tokenId} currentOwner={seller as `0x${string}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export function VeNFTCardSkeleton() {
  return (
    <div className="position-card rounded-xl p-5" aria-hidden>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-full skeleton" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-28 skeleton rounded" />
          <div className="h-3 w-20 skeleton rounded" />
        </div>
      </div>
      <div className="h-8 w-36 skeleton rounded mb-2" />
      <div className="h-3 w-16 skeleton rounded mb-5" />
      <div className="h-1.5 w-full skeleton rounded-full mb-2" />
      <div className="h-3 w-28 skeleton rounded mb-5" />
      <div className="h-11 w-full skeleton rounded-lg" />
    </div>
  );
}
