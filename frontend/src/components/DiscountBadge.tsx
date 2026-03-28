"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

interface DiscountBadgeProps {
  discountBps: number;
}

export function DiscountBadge({ discountBps }: DiscountBadgeProps) {
  const discount  = discountBps / 100;
  const isDisc    = discount > 0;
  const isPrem    = discount < 0;

  if (discount === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase border border-white/[0.07] text-white/30">
        Par
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase border ${
        isDisc
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-red-500/10 border-red-500/20 text-red-400"
      }`}
    >
      {isDisc ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
      {isDisc ? `${discount.toFixed(1)}% off` : `+${Math.abs(discount).toFixed(1)}%`}
    </span>
  );
}
