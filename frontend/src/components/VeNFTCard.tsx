"use client";

import { formatEther } from "viem";
import { motion } from "framer-motion";
import { Lock, Zap, Clock, Coins, AlertTriangle } from "lucide-react";
import { DiscountBadge } from "./DiscountBadge";
import { CountdownCompact } from "./CountdownTimer";

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
  onBuy,
}: VeNFTCardProps) {
  const isVeBTC = collection === "veBTC";
  const isExpired = Number(lockEnd) <= Math.floor(Date.now() / 1000);

  const formattedPrice = parseFloat(formatEther(price)).toFixed(4);
  const formattedIntrinsic = parseFloat(formatEther(intrinsicValue)).toFixed(4);
  const formattedVotingPower = parseFloat(formatEther(votingPower)).toFixed(4);

  const getPaymentSymbol = (token: string) => {
    const btc = "0x7b7c000000000000000000000000000000000000";
    const mezo = "0x7b7c000000000000000000000000000000000001";
    if (token.toLowerCase() === btc.toLowerCase()) return "BTC";
    if (token.toLowerCase() === mezo.toLowerCase()) return "MEZO";
    return "MUSD";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden rounded-3xl
        ${isExpired ? "opacity-60" : ""}
        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
        border border-white/10 hover:border-white/20
        shadow-glass hover:shadow-glass-lg
        transition-all duration-300`}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          ${isVeBTC ? "bg-gradient-to-br from-mezo-primary/10 to-transparent" : "bg-gradient-to-br from-mezo-purple/10 to-transparent"}`}
      />

      {/* Header */}
      <div className="relative p-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          {/* Collection Badge */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold
              ${isVeBTC ? "bg-mezo-primary/20 text-mezo-primary border border-mezo-primary/30" : "bg-mezo-purple/20 text-mezo-purple border border-mezo-purple/30"}`}
          >
            {isVeBTC ? "₿" : "🔮"} {collection}
          </motion.div>

          {/* Discount Badge */}
          <DiscountBadge discountBps={Number(discountBps)} size="sm" />
        </div>

        {/* Token ID */}
        <p className="text-white/50 text-sm">
          Token #{tokenId.toString()}
        </p>

        {/* Expired Warning */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 right-4"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-mezo-danger/20 text-mezo-danger text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="relative px-5 space-y-3">
        {/* Locked Amount */}
        <div className="flex items-center justify-between py-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/60">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Locked</span>
          </div>
          <span className="font-semibold text-white tabular-nums">
            {formattedIntrinsic} {isVeBTC ? "BTC" : "MEZO"}
          </span>
        </div>

        {/* Voting Power */}
        <div className="flex items-center justify-between py-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/60">
            <Zap className="w-4 h-4 text-mezo-accent" />
            <span className="text-sm">Power</span>
          </div>
          <span className="font-semibold text-mezo-accent tabular-nums">
            {formattedVotingPower}
          </span>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between py-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/60">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Expires</span>
          </div>
          <CountdownCompact lockEnd={lockEnd} />
        </div>
      </div>

      {/* Price Section */}
      <div className="relative p-5 mt-2">
        <div className="flex items-center justify-between mb-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/60">
            <Coins className="w-4 h-4" />
            <span className="text-sm">Price</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-white tabular-nums">
              {formattedPrice}
            </span>
            <span className="text-white/60 ml-1">
              {getPaymentSymbol(paymentToken)}
            </span>
          </div>
        </div>

        {/* Buy Button */}
        <motion.button
          onClick={onBuy}
          disabled={isExpired}
          whileHover={{ scale: isExpired ? 1 : 1.02 }}
          whileTap={{ scale: isExpired ? 1 : 0.98 }}
          className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all
            ${
              isExpired
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : isVeBTC
                ? "bg-mezo-gradient text-black hover:shadow-glow"
                : "bg-purple-gradient text-white hover:shadow-glow-purple"
            }`}
        >
          {isExpired ? "Expired" : "Buy Now"}
        </motion.button>
      </div>

      {/* Glow effect on hover */}
      <div
        className={`absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl
          ${isVeBTC ? "bg-mezo-primary/20" : "bg-mezo-purple/20"}`}
      />
    </motion.div>
  );
}

// Skeleton loader
export function VeNFTCardSkeleton() {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="skeleton h-8 w-24 rounded-xl" />
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
        <div className="skeleton h-4 w-20 rounded" />
      </div>
      <div className="px-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between py-2 border-t border-white/5">
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="p-5">
        <div className="flex justify-between mb-4 pt-3 border-t border-white/10">
          <div className="skeleton h-4 w-12 rounded" />
          <div className="skeleton h-6 w-28 rounded" />
        </div>
        <div className="skeleton h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
