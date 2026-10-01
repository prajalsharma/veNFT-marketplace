"use client";

// The sell popup. Same shape as the buy popup, seen from the other side:
// what you are listing, the price you set (and how it compares to what the
// position holds), what you receive after the fee, then the wallet steps.
//
// The fee is read from the PaymentRouter rather than assumed, because the
// admin can change it. Success is tracked on the listing transaction itself,
// not on the hook's shared hash (which the approval also sets).

import { useState, useEffect } from "react";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { X, Loader2, Award, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useNetwork } from "@/hooks/useNetwork";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { PAYMENT_TOKENS } from "@/lib/contracts";
import { CountdownCompact } from "./CountdownTimer";
import { PositionGlyph } from "./market/PositionVisuals";
import { StepRow, SuccessCheck, type StepState } from "./market/TxSteps";

const ROUTER_FEE_ABI = [
  { name: "calculateFee", type: "function", stateMutability: "view", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ name: "fee", type: "uint256" }, { name: "sellerAmount", type: "uint256" }] },
] as const;
const GET_APPROVED_ABI = [
  { name: "getApproved", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
] as const;
const PROBE = 10n ** 22n; // 10,000 units: enough precision to read the fee rate

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  veNFT: {
    tokenId: bigint;
    collection: "veBTC" | "veMEZO";
    intrinsicValue: bigint;
    votingPower: bigint;
    lockEnd: bigint;
    isGrant?: boolean;
  } | null;
}

function fmt(v: number) {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function ListingModal({ isOpen, onClose, veNFT }: ListingModalProps) {
  const isGrant = veNFT?.isGrant ?? false;
  const { contracts } = useNetwork();
  const prices = usePriceTicker();
  const { createListing, approveNFT, isPending } = useMarketplace();

  const [price, setPrice] = useState("");
  const [paymentToken, setPaymentToken] = useState<"BTC" | "MEZO" | "MUSD">(PAYMENT_TOKENS[0].symbol);
  const [txError, setTxError] = useState<string | null>(null);
  const [step, setStep] = useState<"approve" | "list">("approve");
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>(undefined);
  const [listHash, setListHash] = useState<`0x${string}` | undefined>(undefined);
  const [approvalHandled, setApprovalHandled] = useState(false);

  const { isSuccess: approvalConfirmed, isLoading: approvalMining } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isSuccess: listed, isLoading: listMining } = useWaitForTransactionReceipt({ hash: listHash });

  const nftContract = veNFT ? (veNFT.collection === "veBTC" ? contracts.veBTC : contracts.veMEZO) : undefined;

  // Skip the approval step when the marketplace is already approved for this token.
  const { data: approvedTo } = useReadContract({
    address: nftContract as `0x${string}` | undefined,
    abi: GET_APPROVED_ABI,
    functionName: "getApproved",
    args: veNFT ? [veNFT.tokenId] : undefined,
    query: { enabled: isOpen && !!nftContract && !!veNFT },
  });
  const { data: feeProbe } = useReadContract({
    address: contracts.router as `0x${string}`,
    abi: ROUTER_FEE_ABI,
    functionName: "calculateFee",
    args: [PROBE],
    query: { enabled: isOpen && !!contracts.router },
  });
  const feeRate = feeProbe ? Number(feeProbe[0]) / Number(PROBE) : null;

  useEffect(() => {
    if (approvalConfirmed && step === "approve" && !approvalHandled) {
      setApprovalHandled(true);
      setStep("list");
    }
  }, [approvalConfirmed, step, approvalHandled]);

  useEffect(() => {
    setStep("approve");
    setPrice("");
    // Default to the position's own token: the price then compares directly
    // to what it holds, with no price feed in between.
    setPaymentToken(veNFT?.collection === "veBTC" ? "BTC" : "MEZO");
    setApprovalHash(undefined);
    setListHash(undefined);
    setApprovalHandled(false);
    setTxError(null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === "approve" && !approvalHash && approvedTo && approvedTo.toLowerCase() === contracts.marketplace.toLowerCase()) {
      setStep("list");
    }
  }, [approvedTo, step, approvalHash, contracts.marketplace]);

  const busy = isPending || approvalMining || listMining;

  // Escape closes the dialog, like the backdrop and the close button do,
  // except while a transaction is in flight.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, busy]);

  if (!veNFT || !nftContract) return null;

  const paymentTokenAddr = paymentToken === "BTC" ? contracts.BTC : paymentToken === "MEZO" ? contracts.MEZO : contracts.MUSD;
  const lockedSym = veNFT.collection === "veBTC" ? "BTC" : "MEZO";
  const holds = parseFloat(formatEther(veNFT.intrinsicValue));
  const lockEndSec = Number(veNFT.lockEnd);
  const isPermanent = lockEndSec === 0;
  const isExpired = !isPermanent && lockEndSec <= Math.floor(Date.now() / 1000);

  // Value of the position in the chosen currency: direct when it is the
  // locked token, otherwise through live USD prices (null when unavailable).
  const valueIn: number | null = (() => {
    if (paymentToken === lockedSym) return holds;
    const a = prices[lockedSym];
    const b = prices[paymentToken];
    return a && b ? (holds * a) / b : null;
  })();

  const priceNum = Number.parseFloat(price);
  const priceValid = Number.isFinite(priceNum) && priceNum > 0;
  const discount = priceValid && valueIn ? 1 - priceNum / valueIn : null;
  const receive = priceValid && feeRate !== null ? priceNum * (1 - feeRate) : null;
  const usd = priceValid && prices[paymentToken] ? priceNum * (prices[paymentToken] as number) : null;

  const setAt = (d: number) => {
    if (!valueIn) return;
    const v = valueIn * (1 - d);
    setPrice(String(Number(v.toPrecision(6))));
  };

  const handleList = async () => {
    setTxError(null);
    try {
      if (step === "approve") {
        const txHash = await approveNFT(nftContract, veNFT.tokenId);
        if (txHash) {
          setApprovalHash(txHash);
          setApprovalHandled(false);
        }
      } else {
        const h = await createListing(nftContract, veNFT.tokenId, parseEther(price), paymentTokenAddr);
        setListHash(h);
      }
    } catch (error: any) {
      const msg: string = error?.shortMessage ?? error?.message ?? "Transaction failed. Check your wallet and try again.";
      setTxError(/reject|denied/i.test(msg) ? "Rejected in wallet. Nothing was sent." : msg);
    }
  };

  const showSteps = !!approvalHash || (step === "list" && busy) || !!txError;
  const approveState: StepState = step === "list" ? "done" : txError ? "failed" : approvalHash || isPending ? "active" : "idle";
  const listState: StepState = listed ? "done" : step !== "list" ? "idle" : txError ? "failed" : busy ? "active" : "idle";
  const needsApproval = step === "approve" && !approvalHash;

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`List ${veNFT.collection} #${veNFT.tokenId.toString()}`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px) saturate(180%)" }}
            onClick={busy ? undefined : onClose}
          />

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

            <div className="flex items-center gap-4 px-6 pt-5 pb-5">
              <PositionGlyph collection={veNFT.collection} lockEnd={veNFT.lockEnd} size={52} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{listed ? "Listed" : "List for sale"}</p>
                <h2 className="text-[19px] font-bold truncate" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                  {veNFT.collection} <span className="tabular-nums" style={{ color: "var(--text-3)" }}>#{veNFT.tokenId.toString()}</span>
                </h2>
                {isGrant && (
                  <span className="inline-block mt-1 text-[12px] font-semibold px-1.5 py-0.5 rounded" style={{ color: "#B45309", background: "rgba(245,158,11,0.14)" }}>Grant</span>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="self-start p-1.5 -mr-1.5 rounded-lg transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: "var(--text-3)" }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {listed ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="text-center py-2">
                  <SuccessCheck />
                  <p className="text-[20px] font-bold" style={{ letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                    Listed for {price} {paymentToken}
                  </p>
                  <p className="text-[14px] mt-1.5" style={{ color: "var(--text-2)" }}>
                    It stays in your wallet, still voting, until someone buys it. You can cancel any time.
                  </p>
                  {listHash && (
                    <a href={`${contracts.explorer}/tx/${listHash}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--text-2)" }}>
                      View transaction
                    </a>
                  )}
                </motion.div>
              ) : (
                <>
                  <dl className="grid grid-cols-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
                    {[
                      ["Holds", `${fmt(holds)} ${lockedSym}`],
                      ["Voting power", parseFloat(formatEther(veNFT.votingPower)).toLocaleString("en-US", { maximumFractionDigits: 0 })],
                      ["Unlocks in", isPermanent ? "Permanent" : isExpired ? "Expired" : <CountdownCompact key="c" lockEnd={veNFT.lockEnd} />],
                    ].map(([k, v], i) => (
                      <div key={k as string} className="px-3 sm:px-3.5 py-3 min-w-0" style={{ borderLeft: i ? "1px solid var(--hairline)" : undefined }}>
                        <dt className="text-[12px]" style={{ color: "var(--text-3)" }}>{k}</dt>
                        <dd className="text-[13px] sm:text-[14px] font-semibold tabular-nums mt-1 truncate" style={{ color: "var(--text-1)" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Price: currency first, then the amount, then how it compares */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="listing-price" className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>Your price</label>
                      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-2)" }} role="radiogroup" aria-label="Payment currency">
                        {PAYMENT_TOKENS.map((t) => (
                          <button
                            key={t.symbol}
                            role="radio"
                            aria-checked={paymentToken === t.symbol}
                            onClick={() => setPaymentToken(t.symbol)}
                            disabled={step === "list" && busy}
                            className="px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all"
                            style={paymentToken === t.symbol ? { background: "var(--surface)", color: "var(--text-1)", boxShadow: "var(--shadow-sm)" } : { color: "var(--text-3)" }}
                          >
                            {t.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 px-4 py-3 rounded-xl transition-shadow focus-within:shadow-[0_0_0_2px_var(--text-1)]" style={{ background: "var(--bg-2)" }}>
                      <input
                        id="listing-price"
                        name="listing-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        disabled={step === "list" && busy}
                        className="min-w-0 flex-1 bg-transparent font-bold tabular-nums focus:outline-none"
                        style={{ fontSize: 30, letterSpacing: "-0.03em", color: "var(--text-1)" }}
                      />
                      <span className="text-[15px] font-semibold" style={{ color: "var(--text-2)" }}>{paymentToken}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-2.5 min-h-[28px]">
                      <p className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>
                        {discount !== null ? (
                          discount > 0.0005 ? (
                            <><span className="font-semibold" style={{ color: "var(--vezo-red)" }}>{(discount * 100).toFixed(1)}% below</span> its value</>
                          ) : discount < -0.0005 ? (
                            <><span className="font-semibold" style={{ color: "#B45309" }}>{(-discount * 100).toFixed(1)}% above</span> its value</>
                          ) : "At its value"
                        ) : valueIn ? (
                          <>Worth about {fmt(valueIn)} {paymentToken}</>
                        ) : (
                          "Set a price"
                        )}
                        {usd !== null && <> · &#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</>}
                      </p>
                      {valueIn && (
                        <div className="flex gap-1 shrink-0">
                          {[0, 0.05, 0.1].map((d) => (
                            <button
                              key={d}
                              onClick={() => setAt(d)}
                              disabled={step === "list" && busy}
                              className="px-2 py-1 rounded-md text-[12px] font-semibold transition-colors"
                              style={{ border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                            >
                              {d === 0 ? "At value" : `−${d * 100}%`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <dl className="text-[14px]">
                    <div className="flex justify-between py-1.5">
                      <dt style={{ color: "var(--text-3)" }}>Protocol fee{feeRate !== null ? ` (${+(feeRate * 100).toFixed(2)}%)` : ""}</dt>
                      <dd className="tabular-nums" style={{ color: "var(--text-2)" }}>
                        {priceValid && feeRate !== null ? `${fmt(priceNum * feeRate)} ${paymentToken}` : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between pt-3 mt-1.5" style={{ borderTop: "1px solid var(--hairline)" }}>
                      <dt className="font-semibold" style={{ color: "var(--text-1)" }}>You receive</dt>
                      <dd className="font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{receive !== null ? `${fmt(receive)} ${paymentToken}` : "—"}</dd>
                    </div>
                  </dl>

                  {isGrant && (
                    <div className="flex gap-3 text-[13px] leading-relaxed p-3.5 rounded-xl" style={{ background: "var(--bg-2)" }}>
                      <Award style={{ width: 15, height: 15, color: "#B45309", flexShrink: 0, marginTop: 2 }} />
                      <p style={{ color: "var(--text-2)" }}>
                        <span className="font-semibold" style={{ color: "var(--text-1)" }}>Grant position.</span>{" "}
                        Buyers see that unvested tokens can still be revoked, and merge and split stay disabled until vesting ends.
                      </p>
                    </div>
                  )}

                  {showSteps && (
                    <ol className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
                      <StepRow
                        n={1}
                        first
                        label="Approve Vezo for this veNFT"
                        state={approveState}
                        detail={approveState === "active" ? (isPending ? "Confirm in your wallet" : "Waiting for the block") : undefined}
                        href={approveState === "active" && approvalHash ? `${contracts.explorer}/tx/${approvalHash}` : undefined}
                      />
                      <StepRow
                        n={2}
                        first={false}
                        label={`List for ${priceValid ? price : "your price"} ${paymentToken}`}
                        state={listState}
                        detail={listState === "active" ? (isPending ? "Confirm in your wallet" : "Waiting for the block") : undefined}
                        href={listState === "active" && listHash ? `${contracts.explorer}/tx/${listHash}` : undefined}
                      />
                    </ol>
                  )}

                  <AnimatePresence>
                    {txError && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
                        <AlertCircle style={{ width: 15, height: 15, color: "#EF4444", flexShrink: 0, marginTop: 2 }} />
                        <p className="text-[13px] leading-relaxed break-words min-w-0" style={{ color: "var(--text-1)" }}>{txError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-[max(0px,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0 sm:pt-0" style={{ background: "var(--surface)" }}>
                {listed ? (
                  <div className="grid grid-cols-2 gap-2">
                    <a href="/marketplace" className="h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center" style={{ background: "var(--text-1)", color: "var(--bg-1)" }}>
                      See it in the market
                    </a>
                    <button onClick={onClose} className="h-12 rounded-xl text-[15px] font-semibold" style={{ background: "var(--bg-2)", color: "var(--text-1)" }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleList}
                    disabled={busy || (step === "list" && !priceValid)}
                    className="buy-cta w-full h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      <>
                        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                        {isPending ? "Continue in your wallet" : "Confirming on Mezo…"}
                      </>
                    ) : txError ? (
                      "Try again"
                    ) : step === "approve" ? (
                      "Approve to list"
                    ) : priceValid ? (
                      <span className="tabular-nums">List for {price} {paymentToken}</span>
                    ) : (
                      "Enter a price"
                    )}
                  </button>
                )}
                {!listed && !busy && (
                  <p className="text-[12px] text-center mt-2.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
                    {needsApproval ? "2 wallet steps: approve, then list. " : ""}
                    It stays in your wallet, voting and earning, until it sells.
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
