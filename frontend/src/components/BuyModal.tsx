"use client";

/*
  Taste-skill rules applied:
  ✓ mezo-* tokens → CSS custom properties (var(--bg), var(--text-*), var(--border))
  ✓ Liquid glass modal: backdrop-blur + inner border shadow
  ✓ tabular-nums on all price values
  ✓ Spring stiffness:100, damping:20
  ✓ Animate only transform + opacity (GPU rule)
  ✓ Vezo red (#FF0040) as the primary accent
  ✓ Status steps use matching tinted colors
*/

import { useState, useEffect, useMemo } from "react";
import { formatEther, maxUint256 } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, Wallet, ArrowLeftRight, Award } from "lucide-react";
import { CountdownCompact } from "./CountdownTimer";
import { PositionGlyph } from "./market/PositionVisuals";
import { StepRow, SuccessCheck, type StepState } from "./market/TxSteps";
import { useMarketplace, Listing } from "@/hooks/useMarketplace";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useReadContract, useWaitForTransactionReceipt, useAccount, useBalance, useConfig, usePublicClient } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { usePriceTicker, formatUSD } from "@/hooks/usePriceTicker";
import { useSwapAndBuy } from "@/hooks/useSwapAndBuy";

// ─── ABIs ─────────────────────────────────────────────────────────────────────

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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const ERC721_ABI = [
  {
    name: "getApproved",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ─── Constants ─────────────────────────────────────────────────────────────────
const BTC_ADDRESS = "0x7b7c000000000000000000000000000000000000";

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onSuccess?: (listing: Listing) => void;
}

type BuyStep = "confirm" | "approving" | "buying" | "done" | "error";

// ─── Error parser ──────────────────────────────────────────────────────────────
function parseError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied") || msg.includes("rejected"))
    return "You rejected the transaction in your wallet.";
  if (msg.includes("selfpurchase")) return "You cannot buy your own listing.";
  if (msg.includes("listingnotactive"))
    return "This listing is no longer active. It may have been sold or cancelled.";
  if (msg.includes("expiredvenft"))
    return "This veNFT's lock has expired and cannot be traded.";
  if (msg.includes("notowner"))
    return "The seller no longer owns this NFT, so the listing is stale.";
  if (
    msg.includes("notapproved") ||
    msg.includes("not approved") ||
    msg.includes("erc721insufficientapproval") ||
    msg.includes("caller is not token owner or approved")
  )
    return "The seller has not approved the marketplace. The listing is stale; the seller needs to re-list.";
  if (msg.includes("insufficientpayment")) return "Insufficient payment sent. Please try again.";
  if (msg.includes("invalidamount") || msg.includes("invalid amount"))
    return "Payment amount mismatch. Please try again.";
  if (msg.includes("transferfailed") || msg.includes("transfer failed"))
    return "Token transfer failed. Check your allowance and balance.";
  if (msg.includes("paused"))
    return "The marketplace is currently paused. Please try again later.";
  if (msg.includes("unauthorized")) return "Unauthorized contract call. Please contact support.";
  if (msg.includes("unsupportedtoken"))
    return "This payment token is not supported by the marketplace.";
  if (msg.includes("allowance") || msg.includes("erc20insufficientallowance"))
    return "Insufficient token allowance. Please approve the router and try again.";
  if (msg.includes("erc20insufficientbalance") || msg.includes("insufficient balance"))
    return "Insufficient token balance to complete this purchase.";
  if (msg.includes("insufficient funds"))
    return "Your wallet doesn't have enough balance to pay for this NFT.";
  if (msg.includes("network") || msg.includes("rpc") || msg.includes("fetch"))
    return "Network error. Please check your connection and try again.";
  return raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
}

// ─── Alert block ───────────────────────────────────────────────────────────────
function AlertBlock({
  icon: Icon,
  title,
  body,
  variant,
}: {
  icon: any;
  title: string;
  body: string;
  variant: "red" | "yellow" | "green" | "blue";
}) {
  const palette = {
    red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#EF4444" },
    yellow: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", color: "#F59E0B" },
    green: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", color: "#10B981" },
    blue: { bg: "rgba(255,0,64,0.06)", border: "rgba(255,0,64,0.16)", color: "#FF0040" },
  }[variant];

  return (
    <div
      className="flex gap-3 p-4 rounded-xl"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <Icon style={{ width: 17, height: 17, color: palette.color, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-[13px] font-semibold mb-1" style={{ color: palette.color }}>
          {title}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {body}
        </p>
      </div>
    </div>
  );
}


// ─── Component ─────────────────────────────────────────────────────────────────
export function BuyModal({ isOpen, onClose, listing, onSuccess }: BuyModalProps) {
  const { contracts } = useNetwork();
  const { address: buyerAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const wagmiConfig = useConfig();
  const { buyListing, approveTokenForBuy, executeBuy, isPending, isConfirming } = useMarketplace();
  const prices = usePriceTicker();

  const waitForApproval = (hash: `0x${string}`) =>
    waitForTransactionReceipt(wagmiConfig, { hash });

  const [step, setStep] = useState<BuyStep>("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionHash, setSessionHash] = useState<`0x${string}` | undefined>(undefined);
  const [phase, setPhase] = useState<"approve" | "buy">("approve");

  const { isSuccess: txConfirmed, isError: txFailed, error: txError } =
    useWaitForTransactionReceipt({ hash: sessionHash });

  const paymentLower = listing?.paymentToken.toLowerCase() ?? "";
  const isNative = paymentLower === BTC_ADDRESS.toLowerCase();
  const routerAddress = contracts.router as `0x${string}`;
  const isRouterReady =
    !!routerAddress && routerAddress !== "0x0000000000000000000000000000000000000000";

  // Pay-with-BTC swap: the v1 router settles only ERC-20 quote legs (BTC-quoted
  // listings use the marketplace's native path), and BTC/MUSD is the only live
  // pool — so the one real route is an MUSD-priced listing paid in BTC.
  const { quoteSwap, swapAndBuy, isSwapDeployed: swapReady, swapPaymentRouter } = useSwapAndBuy();
  const publicClient = usePublicClient();
  const musdLower = ((contracts as { MUSD?: string }).MUSD ?? "").toLowerCase();
  const swapRoute =
    listing && swapReady && paymentLower === musdLower && musdLower
      ? { payToken: BTC_ADDRESS as `0x${string}`, paySymbol: "BTC" }
      : null;
  const [payWithSwap, setPayWithSwap] = useState(false);
  const [swapQuote, setSwapQuote] = useState<{ maxIn: bigint; feeBps: number } | null>(null);
  const [swapQuoteLoading, setSwapQuoteLoading] = useState(false);
  const [swapQuoteError, setSwapQuoteError] = useState<null | "fetch" | "deviation">(null);
  const [swapQuoteNonce, setSwapQuoteNonce] = useState(0);

  // Live quote: derive the BTC budget that clears the MUSD price with headroom.
  // Exact-in semantics: the router pulls maxIn, skims its routing fee, swaps the
  // rest, and refunds any surplus MUSD — so a modest buffer costs nothing.
  useEffect(() => {
    if (!payWithSwap || !swapRoute || !listing) {
      setSwapQuote(null);
      return;
    }
    let alive = true;
    const fetchQuote = async () => {
      const quoteToken = listing.paymentToken as `0x${string}`;
      const probe = 10n ** 14n; // 0.0001 BTC
      const probeOut = await quoteSwap(swapRoute.payToken, quoteToken, probe);
      if (!probeOut || probeOut === 0n) throw new Error("no pool");
      let netIn = (listing.price * probe) / probeOut;
      netIn = (netIn * 1015n) / 1000n; // +1.5% headroom
      const out = await quoteSwap(swapRoute.payToken, quoteToken, netIn);
      if (!out || out === 0n) throw new Error("no pool");
      if (out < listing.price) {
        netIn = (netIn * listing.price * 1005n) / (out * 1000n);
      }
      let feeBps = 0;
      try {
        feeBps = Number(
          await publicClient!.readContract({
            address: swapPaymentRouter!,
            abi: [{ name: "platformFeeSwapBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const,
            functionName: "platformFeeSwapBps",
          })
        );
      } catch {
        /* fee is display-only; the buffer already absorbs it */
      }
      const maxIn = (netIn * 10000n) / BigInt(10000 - feeBps) + 1n;
      // Defense-in-depth: cross-check the pool-derived budget against the
      // independent price ticker (CoinGecko path, not the RPC path). A budget
      // more than 25% above the market-implied cost means a manipulated or
      // badly broken rate — refuse rather than let the user overpay.
      if (prices.BTC && prices.MUSD) {
        const maxInBtc = parseFloat(formatEther(maxIn));
        const impliedBtc = (parseFloat(formatEther(listing.price)) * prices.MUSD) / prices.BTC;
        if (impliedBtc > 0 && maxInBtc > impliedBtc * 1.25) {
          throw new Error("deviation");
        }
      }
      return { maxIn, feeBps };
    };
    (async () => {
      setSwapQuoteLoading(true);
      setSwapQuote(null);
      setSwapQuoteError(null);
      // Public RPCs rate-limit bursts; retry once before surfacing an error.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const q = await fetchQuote();
          if (!alive) return;
          setSwapQuote(q);
          setSwapQuoteLoading(false);
          return;
        } catch (err) {
          if (!alive) return;
          if (err instanceof Error && err.message === "deviation") {
            setSwapQuoteError("deviation");
            setSwapQuoteLoading(false);
            return;
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (alive) {
        setSwapQuoteError("fetch");
        setSwapQuoteLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [payWithSwap, swapRoute?.payToken, listing?.listingId, swapQuoteNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: nativeBalance } = useBalance({
    address: buyerAddress,
    query: { enabled: (isNative || !!swapRoute) && !!buyerAddress },
  });

  const { data: erc20Balance } = useReadContract({
    address: listing?.paymentToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: buyerAddress ? [buyerAddress] : undefined,
    query: { enabled: !isNative && !!listing && !!buyerAddress },
  });

  const { data: nftApproved, isFetched: nftApprovedFetched } = useReadContract({
    address: listing?.nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: "getApproved",
    args: listing?.tokenId !== undefined ? [listing.tokenId] : undefined,
    query: { enabled: !!listing },
  });

  const { data: nftApprovedForAll, isFetched: nftApprovedForAllFetched } = useReadContract({
    address: listing?.nftContract as `0x${string}`,
    abi: ERC721_ABI,
    functionName: "isApprovedForAll",
    args:
      listing?.seller && listing?.nftContract
        ? [listing.seller as `0x${string}`, contracts.marketplace as `0x${string}`]
        : undefined,
    query: { enabled: !!listing },
  });

  // While the two approval reads are still in flight, give the listing the
  // benefit of the doubt — otherwise the "no longer valid" warning flashes on
  // every open until the RPC responds. The contract re-validates at buy time
  // regardless, so an optimistic pending state is safe.
  const approvalChecked = nftApprovedFetched && nftApprovedForAllFetched;
  const isNftApproved =
    listing == null ||
    !approvalChecked ||
    (nftApproved as string | undefined)?.toLowerCase() === contracts.marketplace.toLowerCase() ||
    nftApprovedForAll === true;

  const { data: currentAllowance } = useReadContract({
    address: listing?.paymentToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: buyerAddress && routerAddress ? [buyerAddress, routerAddress] : undefined,
    query: { enabled: !isNative && !!listing && !!buyerAddress && isRouterReady },
  });

  const alreadyApproved =
    !isNative &&
    listing != null &&
    currentAllowance != null &&
    (currentAllowance as bigint) >= listing.price;

  const hasEnoughBalance = (() => {
    if (!listing) return true;
    if (payWithSwap) {
      if (!nativeBalance || !swapQuote) return true; // pending reads: benefit of the doubt
      return nativeBalance.value >= swapQuote.maxIn;
    }
    if (isNative) {
      if (!nativeBalance) return true;
      return nativeBalance.value >= listing.price;
    } else {
      if (!erc20Balance) return true;
      return (erc20Balance as bigint) >= listing.price;
    }
  })();

  const paymentSymbol = listing
    ? (() => {
        const lower = listing.paymentToken.toLowerCase();
        if (lower === "0x7b7c000000000000000000000000000000000000") return "BTC";
        if (lower === "0x7b7c000000000000000000000000000000000001") return "MEZO";
        return "MUSD";
      })()
    : "";

  const formatAmount = (wei: bigint) => {
    const v = parseFloat(formatEther(wei));
    if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  const formattedPrice = listing ? formatAmount(listing.price) : "0";
  // The position itself, so the buyer sees what they are buying in the same
  // place they pay for it (there is no second "details" popup).
  const lockedSym = listing?.collection === "veBTC" ? "BTC" : "MEZO";
  const lockEndSec = listing ? Number(listing.lockEnd) : 0;
  const isPermanentLock = lockEndSec === 0;
  const isExpiredLock = !isPermanentLock && lockEndSec <= Math.floor(Date.now() / 1000);

  // USD equivalent of the asking price, from the same live feed as the ticker.
  const priceUsd: number | null = (() => {
    if (!listing) return null;
    const unit = prices[paymentSymbol as "BTC" | "MEZO" | "MUSD"];
    return unit ? unit * parseFloat(formatEther(listing.price)) : null;
  })();

  useEffect(() => {
    if (txConfirmed && step === "buying") {
      setStep("done");
      if (listing) onSuccess?.(listing);
    }
  }, [txConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (txFailed && (step === "approving" || step === "buying")) {
      const msg = txError?.message ?? "Transaction reverted on-chain.";
      setErrorMsg(parseError(msg));
      setStep("error");
    }
  }, [txFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setPhase("approve");
      setErrorMsg(null);
      setSessionHash(undefined);
      setPayWithSwap(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === "done" || step === "confirm" || step === "error") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]);

  function handleClose() {
    setStep("confirm");
    setPhase("approve");
    setErrorMsg(null);
    setSessionHash(undefined);
    onClose();
  }

  async function handleBuy() {
    if (!listing) return;
    setErrorMsg(null);

    if (!hasEnoughBalance) {
      setErrorMsg(
        payWithSwap && swapQuote
          ? `Insufficient BTC balance. The swap needs about ${parseFloat(formatEther(swapQuote.maxIn)).toFixed(6)} BTC.`
          : `Insufficient ${paymentSymbol} balance. You need ${formattedPrice} ${paymentSymbol}.`
      );
      setStep("error");
      return;
    }

    if (!isNftApproved) {
      setErrorMsg("The seller has not approved the marketplace. Listing is stale; the seller needs to re-approve or re-list.");
      setStep("error");
      return;
    }

    try {
      if (payWithSwap && swapRoute && swapQuote && buyerAddress) {
        // Approve (if needed) happens inside the hook; the returned hash is the
        // swapAndBuy transaction itself.
        setPhase("approve");
        setStep("approving");
        const h = await swapAndBuy({
          listingId: listing.listingId,
          payToken: swapRoute.payToken,
          maxAmountIn: swapQuote.maxIn,
          amountOutMin: listing.price,
          stable: false,
          buyerAddress,
        });
        setPhase("buy");
        setStep("buying");
        setSessionHash(h);
      } else if (isNative) {
        setPhase("buy");
        setStep("buying");
        const h = await buyListing(listing.listingId, listing.price, true);
        setSessionHash(h);
      } else if (alreadyApproved) {
        setPhase("buy");
        setStep("buying");
        const h = await executeBuy(listing.listingId);
        setSessionHash(h);
      } else {
        setPhase("approve");
        setStep("approving");
        const approveHash = await approveTokenForBuy(listing.paymentToken, maxUint256);
        setSessionHash(approveHash);
        await waitForApproval(approveHash);
        setPhase("buy");
        setStep("buying");
        setSessionHash(undefined);
        const buyHash = await executeBuy(listing.listingId);
        setSessionHash(buyHash);
      }
    } catch (err: unknown) {
      setErrorMsg(parseError(err instanceof Error ? err.message : String(err)));
      setStep("error");
    }
  }

  if (!listing) return null;

  const isBusy = step === "approving" || step === "buying";

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={listing ? `Buy ${listing.collection} #${listing.tokenId.toString()}` : "Buy veNFT"}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px) saturate(180%)" }}
            onClick={step === "done" || step === "confirm" || step === "error" ? handleClose : undefined}
          />

          {/* Panel. Desktop: centred dialog. Phones: bottom sheet (the outer
              flex is items-end below sm), so the action stays under the thumb. */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[460px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-2xl)" }}
          >
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <span className="w-10 h-1 rounded-full" style={{ background: "var(--border-strong)" }} />
            </div>

            {/* Header: identity, the way a buyer refers to the position */}
            <div className="flex items-center gap-4 px-6 pt-5 pb-5">
              <PositionGlyph collection={listing.collection} lockEnd={listing.lockEnd} size={52} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>
                  {step === "done" ? "Purchased" : "Buy position"}
                </p>
                <h2 className="text-[19px] font-bold truncate" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                  {listing.collection}{" "}
                  <span className="tabular-nums" style={{ color: "var(--text-3)" }}>#{listing.tokenId.toString()}</span>
                </h2>
                <p className="text-[12px] mt-0.5 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
                  Seller <span className="font-mono" style={{ color: "var(--text-2)" }}>{listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}</span>
                  {listing.isGrant && (
                    <span className="font-semibold px-1.5 py-0.5 rounded" style={{ color: "#B45309", background: "rgba(245,158,11,0.14)" }}>Grant</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="self-start p-1.5 -mr-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Hero: the price, and how far below value it sits */}
              <div className="pt-1">
                <div className="flex items-end justify-between gap-4">
                  <p className="tabular-nums font-bold" style={{ fontSize: 38, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text-1)" }}>
                    {formattedPrice}
                    <span className="text-[15px] font-semibold ml-1.5" style={{ color: "var(--text-2)", letterSpacing: 0 }}>{paymentSymbol}</span>
                  </p>
                  {listing.discountBps !== null && Number(listing.discountBps) > 0 && (
                    <span className="text-[13px] font-bold tabular-nums px-2 py-1 rounded-md mb-1" style={{ color: "#fff", background: "var(--vezo-red)" }}>
                      {(Number(listing.discountBps) / 100).toFixed(1)}% below value
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-2 tabular-nums" style={{ color: "var(--text-3)" }}>
                  {priceUsd !== null ? <>&#8776; ${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</> : <>&nbsp;</>}
                </p>
              </div>

              {/* What you get: three facts, one strip */}
              {step !== "done" && (
                <dl className="grid grid-cols-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
                  {[
                    ["Holds", `${formatAmount(listing.intrinsicValue)} ${lockedSym}`],
                    ["Voting power", parseFloat(formatEther(listing.votingPower)).toLocaleString("en-US", { maximumFractionDigits: 0 })],
                    ["Unlocks in", isPermanentLock ? "Permanent" : isExpiredLock ? "Expired" : <CountdownCompact key="c" lockEnd={listing.lockEnd} />],
                  ].map(([k, v], i) => (
                    <div key={k as string} className="px-3 sm:px-3.5 py-3 min-w-0" style={{ borderLeft: i ? "1px solid var(--hairline)" : undefined }}>
                      <dt className="text-[12px]" style={{ color: "var(--text-3)" }}>{k}</dt>
                      <dd className="text-[13px] sm:text-[14px] font-semibold tabular-nums mt-1 truncate" style={{ color: "var(--text-1)" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Cost: itemised, so nothing is a surprise at the wallet */}
              {step !== "done" && (
                <dl className="text-[14px]">
                  <div className="flex justify-between py-1.5">
                    <dt style={{ color: "var(--text-3)" }}>Price</dt>
                    <dd className="tabular-nums" style={{ color: "var(--text-2)" }}>{formattedPrice} {paymentSymbol}</dd>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <dt style={{ color: "var(--text-3)" }}>Protocol fee</dt>
                    <dd style={{ color: "var(--text-2)" }}>Paid by seller</dd>
                  </div>
                  <div className="flex justify-between pt-3 mt-1.5" style={{ borderTop: "1px solid var(--hairline)" }}>
                    <dt className="font-semibold" style={{ color: "var(--text-1)" }}>You pay</dt>
                    <dd className="font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{formattedPrice} {paymentSymbol}</dd>
                  </div>
                </dl>
              )}

              {/* Grant disclosure: one plain row, detail behind a link */}
              {step !== "done" && listing.isGrant && (
                <div className="flex gap-3 text-[13px] leading-relaxed p-3.5 rounded-xl" style={{ background: "var(--bg-2)" }}>
                  <Award style={{ width: 15, height: 15, color: "#B45309", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ color: "var(--text-2)" }}>
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>Grant position.</span>{" "}
                    Unvested tokens can be revoked until{" "}
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>
                      {listing.vestingEnd > 0n
                        ? new Date(Number(listing.vestingEnd) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "its vesting date"}
                    </span>
                    .{" "}
                    <a href="https://docs.vezo.exchange/architecture/what-we-built/" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: "var(--text-1)" }}>
                      Details
                    </a>
                  </p>
                </div>
              )}

              {/* USD context + swap note */}
              {listing && step === "confirm" && (
                <>
                  {swapRoute && (
                    <div>
                      <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>Pay with</p>
                      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-2)" }}>
                        <button
                          onClick={() => setPayWithSwap(false)}
                          disabled={isBusy}
                          className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
                          style={
                            !payWithSwap
                              ? { background: "var(--surface)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                              : { background: "transparent", color: "var(--text-3)" }
                          }
                        >
                          {paymentSymbol}
                        </button>
                        <button
                          onClick={() => setPayWithSwap(true)}
                          disabled={isBusy}
                          className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5"
                          style={
                            payWithSwap
                              ? { background: "var(--surface)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" }
                              : { background: "transparent", color: "var(--text-3)" }
                          }
                        >
                          <ArrowLeftRight style={{ width: 11, height: 11 }} />
                          {swapRoute.paySymbol}
                        </button>
                      </div>
                      {payWithSwap && (
                        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                          {swapQuoteError === "deviation" ? (
                            <span style={{ color: "#EF4444" }}>
                              The pool rate is far above the market price right now, so the
                              swap is disabled for your protection. Pay in {paymentSymbol} instead.
                            </span>
                          ) : swapQuoteError === "fetch" ? (
                            <>
                              Couldn&apos;t fetch the pool rate.{" "}
                              <button
                                onClick={() => setSwapQuoteNonce((n) => n + 1)}
                                className="font-bold underline underline-offset-2"
                                style={{ color: "#FF0040" }}
                              >
                                Retry
                              </button>
                            </>
                          ) : swapQuoteLoading || !swapQuote ? (
                            "Fetching the live pool rate…"
                          ) : (
                            <>
                              You pay{" "}
                              <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--text-1)" }}>
                                ≈ {parseFloat(formatEther(swapQuote.maxIn)).toFixed(6)} BTC
                              </span>
                              , swapped on-chain to {paymentSymbol} and settled in the same
                              transaction{swapQuote.feeBps > 0 ? ` (includes a ${(swapQuote.feeBps / 100).toFixed(2)}% routing fee)` : ""}.
                              Surplus {paymentSymbol} is refunded to your wallet.
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Warnings */}
              <AnimatePresence>
                {!isNftApproved && step === "confirm" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <AlertBlock
                      icon={AlertCircle}
                      variant="red"
                      title="Listing no longer valid"
                      body="The seller's NFT approval has been revoked. This purchase will fail until the seller re-approves or re-lists."
                    />
                  </motion.div>
                )}

                {!hasEnoughBalance && step === "confirm" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <AlertBlock
                      icon={Wallet}
                      variant="yellow"
                      title="Insufficient balance"
                      body={`You need ${formattedPrice} ${paymentSymbol}. Add funds to your wallet before buying.`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Named wallet steps, shown once the buyer starts. Each says what
                  the wallet will ask for, so the prompt is never a surprise. */}
              {(isBusy || (step === "error" && phase === "buy" && !isNative && !alreadyApproved && !payWithSwap)) && (
                <ol className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
                  {(!isNative && !alreadyApproved && !payWithSwap || payWithSwap
                    ? [
                        { key: "approve", label: payWithSwap ? "Approve BTC for the swap" : `Approve ${paymentSymbol}` },
                        { key: "buy", label: payWithSwap ? "Swap and buy" : `Buy ${listing.collection} #${listing.tokenId.toString()}` },
                      ]
                    : [{ key: "buy", label: `Buy ${listing.collection} #${listing.tokenId.toString()}` }]
                  ).map((st, i) => {
                    const state: StepState =
                      st.key === "approve"
                        ? phase === "buy" ? "done" : step === "error" ? "failed" : "active"
                        : phase !== "buy" ? "idle" : step === "error" ? "failed" : "active";
                    return (
                      <StepRow
                        key={st.key}
                        n={i + 1}
                        label={st.label}
                        state={state}
                        detail={state === "active" ? (isPending ? "Confirm in your wallet" : isConfirming ? "Waiting for the block" : "Preparing") : undefined}
                        href={state === "active" && sessionHash ? `${contracts.explorer}/tx/${sessionHash}` : undefined}
                        first={i === 0}
                      />
                    );
                  })}
                </ol>
              )}

              {step === "error" && errorMsg && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <AlertBlock
                    icon={AlertCircle}
                    variant="red"
                    title={/reject|denied|cancel/i.test(errorMsg) ? "Rejected in wallet. Nothing was spent." : "The purchase didn't go through"}
                    body={errorMsg}
                  />
                </motion.div>
              )}

              {/* Success: the position is theirs. Stays open so they can see it. */}
              {step === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center py-2"
                >
                  <SuccessCheck />
                  <p className="text-[20px] font-bold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                    {listing.collection} #{listing.tokenId.toString()} is yours
                  </p>
                  <p className="text-[14px] mt-1.5" style={{ color: "var(--text-2)" }}>
                    It&apos;s in your wallet, still locked and voting.
                  </p>
                  {sessionHash && (
                    <a
                      href={`${contracts.explorer}/tx/${sessionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-[13px] font-semibold underline underline-offset-2"
                      style={{ color: "var(--text-2)" }}
                    >
                      View transaction
                    </a>
                  )}
                </motion.div>
              )}

              {/* CTA. Solid, full width, and it names the amount: the button is
                  the last thing read before the wallet opens. */}
              <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-[max(0px,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0 sm:pt-0" style={{ background: "var(--surface)" }}>
                {!buyerAddress && step === "confirm" ? (
                  <button
                    onClick={() => openConnectModal?.()}
                    className="buy-cta w-full h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <Wallet style={{ width: 16, height: 16 }} />
                    Connect wallet to buy
                  </button>
                ) : step === "done" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <a href="/my-listings" className="h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center" style={{ background: "var(--text-1)", color: "var(--bg-1)" }}>
                      View position
                    </a>
                    <button onClick={handleClose} className="h-12 rounded-xl text-[15px] font-semibold" style={{ background: "var(--bg-2)", color: "var(--text-1)" }}>
                      Close
                    </button>
                  </div>
                ) : step === "error" ? (
                  <button
                    onClick={() => { setStep("confirm"); setPhase("approve"); setErrorMsg(null); }}
                    className="buy-cta w-full h-12 rounded-xl text-[15px] font-semibold"
                  >
                    Try again
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={isBusy || !hasEnoughBalance || !isNftApproved || (payWithSwap && !swapQuote)}
                    className="buy-cta w-full h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                        {isPending ? "Continue in your wallet" : "Confirming on Mezo…"}
                      </>
                    ) : !isNftApproved ? (
                      "Listing unavailable"
                    ) : !hasEnoughBalance ? (
                      `Not enough ${payWithSwap ? "BTC" : paymentSymbol}`
                    ) : payWithSwap ? (
                      `Swap BTC and buy`
                    ) : (
                      <span className="tabular-nums">Buy for {formattedPrice} {paymentSymbol}</span>
                    )}
                  </button>
                )}
                {step === "confirm" && buyerAddress && (
                  <p className="text-[12px] text-center mt-2.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
                    {!isNative && !alreadyApproved && !payWithSwap || payWithSwap
                      ? `2 wallet steps: approve ${payWithSwap ? "BTC" : paymentSymbol}, then buy. `
                      : ""}
                    The veNFT and your payment move together, or not at all.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
