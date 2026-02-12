"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

interface DiscountBadgeProps {
  discountBps: number;
  size?: "sm" | "md" | "lg";
}

export function DiscountBadge({ discountBps, size = "md" }: DiscountBadgeProps) {
  const discount = discountBps / 100;
  const isDiscount = discount > 0;
  const isPremium = discount < 0;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (discount === 0) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center gap-1 rounded-full font-bold
          bg-white/10 text-white/60 border border-white/20
          ${sizeClasses[size]}`}
      >
        Fair Value
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1 rounded-full font-bold
        ${
          isDiscount
            ? "bg-mezo-success/20 text-mezo-success border border-mezo-success/30"
            : "bg-mezo-danger/20 text-mezo-danger border border-mezo-danger/30"
        }
        ${sizeClasses[size]}`}
    >
      {isDiscount ? (
        <TrendingDown className={iconSizes[size]} />
      ) : (
        <TrendingUp className={iconSizes[size]} />
      )}
      {isDiscount ? `-${discount.toFixed(1)}%` : `+${Math.abs(discount).toFixed(1)}%`}
    </motion.span>
  );
}
