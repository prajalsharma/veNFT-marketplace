"use client";

import { useState, useEffect, useRef } from "react";
import { formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMarketplace, Listing } from "@/hooks/useMarketplace";
import { useNetwork } from "@/hooks/useNetwork";
import { useReadContract, useWaitForTransactionReceipt, useAccount } from "wagmi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const MARKETPLACE_LISTING_ABI = [
  {
    name: "listings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "collection", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "paymentToken", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
}

// BTC native token address (same on testnet and mainnet)
const BTC_ADDRESS = "0x7b7c000000000000000000000000000000000000";

function getPaymentSymbol(token: string): string {
  const t = token.toLowerCase();
  if (t === "0x7b7c000000000000000000000000000000000000") return "BTC";
  if (t === "0x7b7c000000000000000000000000000000000001") return "MEZO";
  return "MUSD";
}

type BuyStep = "confirm" | "approving" | "buying" | "done" | "error";

export function BuyModal({ isOpen, onClose, listing }: BuyModalProps) {
  const { contracts } = useNetwork();
  const { address: buyerAddress } = useAccount();
  const {
    buyListing,
    approveTokenForBuy,
    executeBuy,
    isPending,
    isConfirming,
    hash,
    error,
  } = useMarketplace();

  const [step, setStep] = useState<BuyStep>("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Track whether we're waiting for approval tx or buy tx
  const [phase, setPhase] = useState<"approve" | "buy">("approve");

  // Track the hash that was "consumed" for the current buy flow so stale
  // confirmations from a previous modal session cannot trigger executeBuy.
  const activeHashRef = useRef<string | undefined>(undefined);

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash });

  const marketplaceAddress = contracts.marketplace as `0x${string}`;
  const { data: listingOnChain } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_LISTING_ABI,
    functionName: "listings",
    args: listing ? [BigInt(listing.listingId)] : undefined,
    query: {
      enabled:
        !!listing &&
        !!marketplaceAddress &&
        marketplaceAddress !== ZERO_ADDRESS,
    },
  });

  const listingTuple = listingOnChain as readonly [
    `0x${string}`,
    `0x${string}`,
    bigint,
    bigint,
    `0x${string}`,
    bigint,
    boolean
  ] | undefined;

  const resolvedSeller = listingTuple?.[0] ?? (listing?.seller as `0x${string}` | undefined);
  const resolvedPrice = listingTuple?.[3] ?? listing?.price ?? 0n;
  const resolvedPaymentToken =
    listingTuple?.[4] ?? (listing?.paymentToken as `0x${string}` | undefined);

  const isNative =
    !!resolvedPaymentToken &&
    resolvedPaymentToken.toLowerCase() === BTC_ADDRESS.toLowerCase();

  // Read current ERC-20 allowance so we can skip approval if already sufficient
  const routerAddress = contracts.router as `0x${string}`;
  const { data: currentAllowance } = useReadContract({
    address: resolvedPaymentToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      buyerAddress && routerAddress
        ? [buyerAddress, routerAddress]
        : undefined,
    query: {
      enabled:
        !isNative &&
        !!resolvedPaymentToken &&
        !!buyerAddress &&
        !!routerAddress &&
        routerAddress !== ZERO_ADDRESS &&
        resolvedPaymentToken !== ZERO_ADDRESS,
    },
  });

  // True when the router already has enough allowance to pull the payment
  const alreadyApproved =
    !isNative &&
    resolvedPaymentToken != null &&
    currentAllowance != null &&
    (currentAllowance as bigint) >= resolvedPrice;
  const paymentSymbol = resolvedPaymentToken ? getPaymentSymbol(resolvedPaymentToken) : "";
  const formattedPrice = resolvedPrice
    ? parseFloat(formatEther(resolvedPrice)).toFixed(6)
    : "0";

  // React to transaction confirmation based on current phase.
  // Guard with activeHashRef so a stale txConfirmed=true from a previous modal
  // session cannot fire executeBuy on a newly-opened modal.
  useEffect(() => {
    if (!txConfirmed) return;
    if (!hash || hash !== activeHashRef.current) return;

    if (phase === "approve") {
      // Approval confirmed — now submit the buy
      setPhase("buy");
      setStep("buying");
      if (listing) {
        executeBuy(listing.listingId).catch((err: unknown) => {
          setErrorMsg(err instanceof Error ? err.message : "Buy transaction failed");
          setStep("error");
        });
      }
    } else if (phase === "buy") {
      setStep("done");
    }
  }, [txConfirmed, hash, phase, listing, executeBuy]);

  // Catch wallet-level errors (user rejection, gas estimation failure, etc.)
  // Accept errors regardless of current step value to handle fast rejections.
  useEffect(() => {
    if (!error) return;
    if (step === "confirm" || step === "done") return; // ignore if not in a tx flow
    setErrorMsg(error.message ?? "Transaction failed");
    setStep("error");
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset modal state whenever it is opened with a new listing
  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setPhase("approve");
      setErrorMsg(null);
      activeHashRef.current = undefined;
    }
  }, [isOpen, listing?.listingId]);

  function handleClose() {
    setStep("confirm");
    setPhase("approve");
    setErrorMsg(null);
    activeHashRef.current = undefined;
    onClose();
  }

  async function handleBuy() {
    if (!listing) return;
    setErrorMsg(null);

    try {
      if (!resolvedSeller || resolvedSeller === ZERO_ADDRESS) {
        throw new Error("Invalid seller address");
      }
      if (!resolvedPaymentToken || resolvedPaymentToken === ZERO_ADDRESS) {
        throw new Error("Invalid payment token");
      }
      if (resolvedPrice <= 0n) {
        throw new Error("Invalid listing price");
      }

      if (isNative) {
        // Native BTC: single transaction with msg.value = price
        setPhase("buy");
        setStep("buying");
        try {
          await buyListing(listing.listingId, resolvedPrice, true);
          // Record hash so the txConfirmed effect can validate it
          // (hash is updated asynchronously by wagmi after writeContract resolves)
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : "Transaction failed");
          setStep("error");
          return;
        }
      } else if (alreadyApproved) {
        // Router already has sufficient allowance — skip approval step
        setPhase("buy");
        setStep("buying");
        try {
          await executeBuy(listing.listingId);
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : "Transaction failed");
          setStep("error");
          return;
        }
      } else {
        // ERC-20: approve router first, then buy after tx confirmation
        setPhase("approve");
        setStep("approving");
        try {
          await approveTokenForBuy(resolvedPaymentToken, resolvedPrice);
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : "Approval failed");
          setStep("error");
          return;
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  }

  // Once hash is set by wagmi, register it as the active hash for this flow
  useEffect(() => {
    if (hash && (step === "approving" || step === "buying")) {
      activeHashRef.current = hash;
    }
  }, [hash, step]);

  if (!listing) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={step === "done" || step === "confirm" ? handleClose : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-mezo-background border border-mezo-border rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-8 border-b border-mezo-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  Buy {listing.collection}{" "}
                  <span className="text-mezo-primary">#{listing.tokenId.toString()}</span>
                </h2>
                <p className="text-mezo-muted text-sm mt-1">
                  {isNative
                    ? "Single transaction — pay and receive NFT atomically."
                    : "Two steps: approve token spend, then purchase."}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-mezo-muted" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Price summary */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-mezo-muted">You pay</span>
                  <span className="font-bold text-white">
                    {formattedPrice} {paymentSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mezo-muted">Discount</span>
                  <span className="font-bold text-mezo-success">
                    {(Number(listing.discountBps) / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mezo-muted">Protocol fee</span>
                  <span className="font-bold text-mezo-muted">1%</span>
                </div>
              </div>

              {/* Step indicators for ERC-20 */}
              {!isNative && (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
                      step === "approving"
                        ? "bg-mezo-primary/20 text-mezo-primary"
                        : step === "buying" || step === "done"
                        ? "bg-mezo-success/20 text-mezo-success"
                        : "bg-white/5 text-mezo-muted"
                    }`}
                  >
                    {(step === "buying" || step === "done") ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : step === "approving" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">1</span>
                    )}
                    Approve {paymentSymbol}
                  </div>
                  <div className="h-px flex-1 bg-mezo-border" />
                  <div
                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
                      step === "buying"
                        ? "bg-mezo-primary/20 text-mezo-primary"
                        : step === "done"
                        ? "bg-mezo-success/20 text-mezo-success"
                        : "bg-white/5 text-mezo-muted"
                    }`}
                  >
                    {step === "done" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : step === "buying" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">2</span>
                    )}
                    Purchase NFT
                  </div>
                </div>
              )}

              {/* Security note */}
              <div className="flex gap-3 p-4 rounded-2xl bg-mezo-primary/5 border border-mezo-primary/20">
                <ShieldCheck className="w-5 h-5 text-mezo-primary shrink-0 mt-0.5" />
                <p className="text-xs text-mezo-muted leading-relaxed">
                  NFT transfers to you before payment is routed. If the seller
                  moves the NFT before you buy, the transaction reverts.
                </p>
              </div>

              {/* Error */}
              {step === "error" && errorMsg && (
                <div className="flex gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed break-all">
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Success */}
              {step === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 p-4 rounded-2xl bg-mezo-success/10 border border-mezo-success/20"
                >
                  <CheckCircle2 className="w-5 h-5 text-mezo-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-mezo-success">Purchase complete!</p>
                    <p className="text-xs text-mezo-muted mt-0.5">
                      {listing.collection} #{listing.tokenId.toString()} is now in your wallet.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Action button */}
              {step === "done" ? (
                <button
                  onClick={handleClose}
                  className="w-full btn-primary py-4 rounded-2xl font-bold"
                >
                  Close
                </button>
              ) : step === "error" ? (
                <button
                  onClick={() => { setStep("confirm"); setPhase("approve"); setErrorMsg(null); activeHashRef.current = undefined; }}
                  className="w-full py-4 rounded-2xl font-bold bg-white/5 hover:bg-white/10 transition-all"
                >
                  Try Again
                </button>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={step !== "confirm"}
                  className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 font-bold disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {step === "approving" || step === "buying" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isPending
                        ? "Check wallet…"
                        : isConfirming
                        ? "Confirming…"
                        : step === "approving"
                        ? "Approving…"
                        : "Purchasing…"}
                    </>
                  ) : (
                    <>
                      {isNative || alreadyApproved
                        ? "Buy Now"
                        : `1. Approve ${paymentSymbol}`}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
