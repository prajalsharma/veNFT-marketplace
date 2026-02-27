"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { 
  X, 
  ChevronRight, 
  Info, 
  Coins, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  Clock,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useNetwork } from "@/hooks/useNetwork";
import { PAYMENT_TOKENS } from "@/lib/contracts";

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  veNFT: {
    tokenId: bigint;
    collection: "veBTC" | "veMEZO";
    intrinsicValue: bigint;
    votingPower: bigint;
    lockEnd: bigint;
  } | null;
}

export function ListingModal({ isOpen, onClose, veNFT }: ListingModalProps) {
  const { address } = useAccount();
  const { contracts } = useNetwork();
  const { createListing, approveNFT, isPending, isConfirming, isSuccess } = useMarketplace();
  
  const [price, setPrice] = useState("");
  const [paymentToken, setPaymentToken] = useState(PAYMENT_TOKENS[0].symbol);
  const [step, setStep] = useState<"approve" | "list">("approve");

  if (!veNFT) return null;

  const handleList = async () => {
    try {
      const nftContract = veNFT.collection === "veBTC" ? contracts.veBTC : contracts.veMEZO;
      const paymentTokenAddr = PAYMENT_TOKENS.find(t => t.symbol === paymentToken)?.isNative 
        ? contracts.BTC 
        : paymentToken === "MEZO" ? contracts.MEZO : contracts.MUSD;

      if (step === "approve") {
        await approveNFT(nftContract, veNFT.tokenId);
        setStep("list");
      } else {
        await createListing(
          nftContract,
          veNFT.tokenId,
          parseEther(price),
          paymentTokenAddr
        );
      }
    } catch (error) {
      console.error("Listing failed:", error);
    }
  };

  const formattedIntrinsic = parseFloat(formatEther(veNFT.intrinsicValue)).toFixed(4);
  const discount = price ? (1 - (parseFloat(price) / parseFloat(formattedIntrinsic))) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-mezo-background border border-mezo-border rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-8 border-b border-mezo-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">List {veNFT.collection} <span className="text-mezo-primary">#{veNFT.tokenId.toString()}</span></h2>
                <p className="text-mezo-muted text-sm mt-1">Configure your secondary market listing.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-6 h-6 text-mezo-muted" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Token Info Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] text-mezo-muted font-bold uppercase tracking-widest mb-1">Intrinsic Value</p>
                  <p className="text-lg font-bold">{formattedIntrinsic} {veNFT.collection === 'veBTC' ? 'BTC' : 'MEZO'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] text-mezo-muted font-bold uppercase tracking-widest mb-1">Voting Power</p>
                  <p className="text-lg font-bold">{parseFloat(formatEther(veNFT.votingPower)).toFixed(2)}</p>
                </div>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-mezo-muted uppercase tracking-widest">Set Asking Price</label>
                  {price && discount > 0 && (
                    <span className="text-xs font-bold text-mezo-success">
                      {discount.toFixed(1)}% Discount vs Spot
                    </span>
                  )}
                </div>
                
                <div className="relative group">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-mezo-card/50 border border-mezo-border rounded-2xl p-4 text-2xl font-bold focus:outline-none focus:border-mezo-primary/50 transition-all pl-6 pr-32"
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                    {PAYMENT_TOKENS.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setPaymentToken(token.symbol)}
                        className={`px-3 rounded-xl text-xs font-black transition-all ${
                          paymentToken === token.symbol 
                            ? "bg-mezo-primary text-black shadow-lg" 
                            : "text-mezo-muted hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {token.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safety Info */}
              <div className="p-4 rounded-2xl bg-mezo-primary/5 border border-mezo-primary/20 flex gap-4">
                <div className="p-2 bg-mezo-primary/10 rounded-lg h-fit">
                  <ShieldCheck className="w-5 h-5 text-mezo-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">Escrowless Listing</p>
                  <p className="text-xs text-mezo-muted leading-relaxed">
                    The NFT stays in your wallet. You keep earning rewards and voting power until the moment it is sold.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleList}
                disabled={!price || isPending || isConfirming}
                className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Confirming Transaction...
                  </>
                ) : isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Check Wallet...
                  </>
                ) : (
                  <>
                    {step === "approve" ? "1. Approve Marketplace" : "2. Confirm Listing"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-mezo-success/10 border border-mezo-success/20 text-mezo-success text-center text-sm font-bold"
                >
                  Listing successfully created!
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
