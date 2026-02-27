"use client";

import { formatEther } from "viem";
import { motion } from "framer-motion";
import { 
  Lock, 
  Zap, 
  Clock, 
  Coins, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  TrendingDown
} from "lucide-react";
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
  const formattedVotingPower = parseFloat(formatEther(votingPower)).toFixed(2);

  const getPaymentSymbol = (token: string) => {
    const btc = "0x7b7c000000000000000000000000000000000000";
    const mezo = "0x7b7c000000000000000000000000000000000001";
    if (token.toLowerCase() === btc.toLowerCase()) return "BTC";
    if (token.toLowerCase() === mezo.toLowerCase()) return "MEZO";
    return "MUSD";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6 }}
      className={`group relative glass-card rounded-3xl overflow-hidden p-6 ${isExpired ? "opacity-60" : ""}`}
    >
      {/* Glow Header Background */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -z-10 ${isVeBTC ? 'bg-mezo-primary' : 'bg-mezo-accent'}`} />

      {/* Card Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isVeBTC ? 'bg-mezo-primary' : 'bg-mezo-accent'}`} />
            <h4 className="text-sm font-bold tracking-widest uppercase text-mezo-muted">
              {collection} #<span className="text-white">{tokenId.toString()}</span>
            </h4>
          </div>
          <p className="text-[10px] text-mezo-muted font-mono truncate w-32">
            Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
          </p>
        </div>
        <DiscountBadge discountBps={Number(discountBps)} />
      </div>

      {/* Primary Value Display */}
      <div className="mb-8">
        <p className="text-xs text-mezo-muted font-bold uppercase tracking-wider mb-1">Intrinsic Value</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {formattedIntrinsic}
          </span>
          <span className="text-sm text-mezo-muted font-bold">{isVeBTC ? 'BTC' : 'MEZO'}</span>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-mezo-muted mb-1">
            <Zap className="w-3 h-3 text-mezo-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Voting Power</span>
          </div>
          <p className="text-sm font-bold tabular-nums">{formattedVotingPower}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-1.5 text-mezo-muted mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Lock Ends</span>
          </div>
          <div className="text-sm font-bold">
            <CountdownCompact lockEnd={lockEnd} />
          </div>
        </div>
      </div>

      {/* Price & Action */}
      <div className="pt-6 border-t border-mezo-border/50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] text-mezo-muted font-bold uppercase tracking-widest mb-1">Buy Now Price</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{formattedPrice}</span>
              <span className="text-xs font-bold text-mezo-muted">{getPaymentSymbol(paymentToken)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-mezo-success text-[10px] font-bold">
              <TrendingDown className="w-3 h-3" />
              SAVING {Number(discountBps) / 100}%
            </div>
          </div>
        </div>

        <button
          onClick={onBuy}
          disabled={isExpired}
          className={`w-full group/btn relative flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all overflow-hidden
            ${isExpired 
              ? 'bg-mezo-border text-mezo-muted cursor-not-allowed' 
              : 'bg-white text-black hover:bg-mezo-primary hover:text-white'
            }`}
        >
          <span className="relative z-10">{isExpired ? 'Position Expired' : 'Complete Purchase'}</span>
          {!isExpired && <ChevronRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />}
          
          {/* Shimmer Effect */}
          {!isExpired && <div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />}
        </button>
      </div>

      {/* Hover Status Indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-transform duration-300 origin-bottom scale-y-0 group-hover:scale-y-100 ${isVeBTC ? 'bg-mezo-primary' : 'bg-mezo-accent'}`} />
    </motion.div>
  );
}

export function VeNFTCardSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-6 h-[420px] animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="h-4 w-24 bg-white/5 rounded" />
        <div className="h-6 w-16 bg-white/5 rounded-full" />
      </div>
      <div className="h-4 w-20 bg-white/5 rounded mb-2" />
      <div className="h-10 w-40 bg-white/5 rounded mb-8" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="h-16 bg-white/5 rounded-2xl" />
        <div className="h-16 bg-white/5 rounded-2xl" />
      </div>
      <div className="pt-6 border-t border-mezo-border">
        <div className="h-10 w-full bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}
