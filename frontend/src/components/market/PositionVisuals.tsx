"use client";

// Visual primitives for a veNFT position.
//
// A veNFT has no artwork. What it does have is a shape: an amount locked for a
// span of time, sold at some fraction of what it holds. These two components
// draw exactly that, from real data, so the marketplace has imagery that is
// also information rather than decoration.

import { COLLECTIONS } from "@/lib/contracts";

export const COLLECTION_COLOR = { veBTC: "#F7931A", veMEZO: "#4A90E2" } as const;

/** Fraction of the maximum lock still remaining, 0..1 (1 for permanent locks). */
export function lockRemainingFraction(collection: "veBTC" | "veMEZO", lockEnd: bigint): number {
  const end = Number(lockEnd);
  if (end === 0) return 1;
  const remaining = end - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return 0;
  return Math.min(1, remaining / COLLECTIONS[collection].maxLock);
}

/**
 * The position glyph: a ring whose arc is the lock time still remaining, as a
 * share of the collection's maximum lock, in the collection's colour. A long
 * veMEZO lock reads as a nearly closed ring; one about to unlock is a sliver.
 */
export function PositionGlyph({
  collection,
  lockEnd,
  size = 44,
}: {
  collection: "veBTC" | "veMEZO";
  lockEnd: bigint;
  size?: number;
}) {
  const frac = lockRemainingFraction(collection, lockEnd);
  const color = COLLECTION_COLOR[collection];
  const stroke = Math.max(3, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, frac) * c} ${c}`}
          className="glyph-arc"
        />
      </svg>
      <span
        className="absolute font-bold"
        style={{ fontSize: size * 0.27, color, letterSpacing: "-0.02em" }}
      >
        {collection === "veBTC" ? "₿" : "M"}
      </span>
    </span>
  );
}

/**
 * Price against value. The filled share of the track is what the buyer pays as
 * a fraction of the position's intrinsic value; the gap at the end is the
 * discount. Hidden when the discount cannot be computed.
 */
export function PriceValueBar({ discountBps }: { discountBps: bigint | null }) {
  if (discountBps === null) return null;
  const d = Number(discountBps) / 10_000;
  const paid = Math.max(0, Math.min(1, 1 - d));
  const premium = d < 0;
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: premium ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)" }}
      role="img"
      aria-label={
        premium
          ? `Priced ${(-d * 100).toFixed(1)}% above intrinsic value`
          : `Priced at ${(paid * 100).toFixed(1)}% of intrinsic value`
      }
    >
      <div
        className="h-full rounded-full bar-fill"
        style={{ width: `${paid * 100}%`, background: premium ? "#EF4444" : "var(--text-1)" }}
      />
    </div>
  );
}
