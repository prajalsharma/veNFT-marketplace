"use client";

import { useState, useEffect, useMemo } from "react";
import { parseEther, formatEther, maxUint256 } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, CheckCircle2, AlertCircle, Zap, Clock, DollarSign, TrendingDown, Info } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useNetwork } from "@/hooks/useNetwork";
import { useTokenPrices, formatUSD } from "@/hooks/useTokenPrices";
import { BidRegistryABI } from "@/lib/abis";

const ERC20_ABI = [
  { name: "approve",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const EXPIRY_OPTIONS = [
  { label: "1 day",  seconds: 86400    },
  { label: "3 days", seconds: 259200   },
  { label: "7 days", seconds: 604800   },
  { label: "Custom", seconds: 0        },
] as const;

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: string;
  tokenId: bigint;
  collectionName: "veBTC" | "veMEZO";
  intrinsicValue: bigint;
  onBidPlaced?: () => void;
}

type Step = "form" | "approving" | "placing" | "done" | "error";

function parseErr(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("user rejected") || m.includes("rejected")) return "You rejected the transaction.";
  if (m.includes("duplicatebid"))       return "You already have an active bid on this token. Cancel it first.";
  if (m.includes("durationoutofrange")) return "Duration must be between 1 hour and 30 days.";
  if (m.includes("insufficientbalance") || m.includes("insufficient balance")) return "Insufficient token balance.";
  return raw.length > 160 ? raw.slice(0, 160) + "…" : raw;
}

export function BidModal({ isOpen, onClose, collection, tokenId, collectionName, intrinsicValue, onBidPlaced }: BidModalProps) {
  const { contracts } = useNetwork();
  const { address: userAddress } = useAccount();
  const { prices, toUSD } = useTokenPrices();
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  const bidRegistryAddress = (contracts as any).bidRegistry as `0x${string}`;
  const isDeployed = !!bidRegistryAddress && bidRegistryAddress !== "0x0000000000000000000000000000000000000000";

  const [step, setStep]               = useState<Step>("form");
  const [errMsg, setErrMsg]           = useState<string | null>(null);
  const [txHash, setTxHash]           = useState<`0x${string}` | undefined>();
  const [phase, setPhase]             = useState<"approve" | "bid">("approve");
  const [bidSym, setBidSym]           = useState<"BTC" | "MEZO" | "MUSD">("MUSD");
  const [amtStr, setAmtStr]           = useState("");
  const [expiryIdx, setExpiryIdx]     = useState(1);
  const [customDays, setCustomDays]   = useState("7");

  const { isSuccess: confirmed, isError: failed, error: txErr } = useWaitForTransactionReceipt({ hash: txHash });

  const bidTokenAddress = useMemo(() => {
    if (bidSym === "BTC")  return contracts.BTC  as `0x${string}`;
    if (bidSym === "MEZO") return contracts.MEZO as `0x${string}`;
    return (contracts as any).MUSD as `0x${string}`;
  }, [bidSym, contracts]);

  const duration = useMemo(() => {
    const opt = EXPIRY_OPTIONS[expiryIdx];
    if (opt.seconds !== 0) return opt.seconds;
    return Math.round(Math.min(30, Math.max(1, parseFloat(customDays) || 7)) * 86400);
  }, [expiryIdx, customDays]);

  const amtWei = useMemo(() => { try { return parseEther(amtStr || "0"); } catch { return 0n; } }, [amtStr]);
  const bidUSD = (Number(amtWei) / 1e18) * (prices[bidSym] ?? 0);
  const ivUSD  = (Number(intrinsicValue) / 1e18) * (prices[collectionName === "veBTC" ? "BTC" : "MEZO"] ?? 0);
  const discPct = ivUSD > 0 && bidUSD < ivUSD ? (((ivUSD - bidUSD) / ivUSD) * 100).toFixed(1) : null;

  const { data: allowance } = useReadContract({
    address: bidTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, bidRegistryAddress] : undefined,
    query: { enabled: !!userAddress && isDeployed },
  });
  const approved = amtWei > 0n && allowance != null && (allowance as bigint) >= amtWei;

  useEffect(() => {
    if (confirmed) {
      if (phase === "approve") { setPhase("bid"); setTxHash(undefined); doPlaceBid(); }
      else { onBidPlaced?.(); setStep("done"); }
    }
  }, [confirmed]); // eslint-disable-line
  useEffect(() => {
    if (failed) { setErrMsg(parseErr(txErr?.message ?? "Transaction reverted.")); setStep("error"); }
  }, [failed]); // eslint-disable-line
  useEffect(() => { if (isOpen) { setStep("form"); setErrMsg(null); setTxHash(undefined); setPhase("approve"); } }, [isOpen]);

  async function doPlaceBid() {
    try {
      setStep("placing");
      const h = await writeContractAsync({ address: bidRegistryAddress, abi: BidRegistryABI, functionName: "placeBid", args: [collection as `0x${string}`, tokenId, bidTokenAddress, amtWei, BigInt(duration)] });
      setTxHash(h);
    } catch (e: unknown) { setErrMsg(parseErr(e instanceof Error ? e.message : String(e))); setStep("error"); }
  }

  async function handleSubmit() {
    if (!isDeployed || amtWei <= 0n) return;
    setErrMsg(null);
    try {
      if (!approved) {
        setPhase("approve"); setStep("approving");
        const h = await writeContractAsync({ address: bidTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [bidRegistryAddress, maxUint256] });
        setTxHash(h);
        await waitForTransactionReceipt(wagmiConfig, { hash: h });
        setTxHash(undefined);
        await doPlaceBid();
      } else { await doPlaceBid(); }
    } catch (e: unknown) { setErrMsg(parseErr(e instanceof Error ? e.message : String(e))); setStep("error"); }
  }

  const isVeBTC = collectionName === "veBTC";
  const accent  = isVeBTC ? "#F7931A" : "#4A90E2";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={step === "form" || step === "done" ? onClose : undefined} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 24 }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="relative w-full max-w-md rounded-[2rem] overflow-hidden" style={{ background: "var(--bg-1)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
          <div className="px-7 pt-7 pb-5 flex items-start justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}12`, border: `1px solid ${accent}28` }}>
                  <Zap className="w-4 h-4" style={{ color: accent }} />
                </div>
                <span className="text-[10.5px] font-black tracking-[0.12em] uppercase px-2 py-0.5 rounded-md" style={{ color: accent, background: `${accent}12` }}>{collectionName}</span>
              </div>
              <h2 className="text-[21px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Place Bid <span style={{ color: accent }}>#{tokenId.toString()}</span></h2>
              <p className="text-[12.5px] mt-1" style={{ color: "var(--text-2)" }}>{approved ? "One transaction to place bid." : "Two steps: approve token, then place bid."}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl transition-colors mt-1" style={{ color: "var(--text-3)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}><X className="w-5 h-5" /></button>
          </div>
          <div className="px-7 pb-7 pt-5 space-y-4">
            {!isDeployed ? (
              <p className="text-center text-[13.5px] py-8" style={{ color: "var(--text-3)" }}>Bidding not yet available on this network.</p>
            ) : step === "done" ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex gap-3 p-4 rounded-2xl" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)" }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                  <div><p className="text-[13.5px] font-bold" style={{ color: "#10B981" }}>Bid placed!</p><p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-2)" }}>{amtStr} {bidSym} bid is now active.</p></div>
                </div>
                <button onClick={onClose} className="w-full btn-primary py-4 rounded-2xl font-bold text-[14px]">Close</button>
              </motion.div>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2.5" style={{ color: "var(--text-3)" }}>Bid Currency</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["MUSD", "MEZO", "BTC"] as const).map((s) => {
                      const on = bidSym === s;
                      return (
                        <button key={s} onClick={() => setBidSym(s)} className="py-2.5 rounded-xl text-[13px] font-bold border transition-all" style={on ? { background: accent, color: "#fff", borderColor: "transparent" } : { background: "var(--bg-2)", borderColor: "var(--border)", color: "var(--text-2)" }}>{s}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2.5" style={{ color: "var(--text-3)" }}>Bid Amount</p>
                  <div className="relative">
                    <input id="bid-amount" name="bid-amount" type="number" min="0" step="any" placeholder="0.00" value={amtStr} onChange={(e) => setAmtStr(e.target.value)} className="w-full rounded-xl px-4 py-3.5 text-[16px] font-bold focus:outline-none transition-all pr-20" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold" style={{ color: "var(--text-2)" }}>{bidSym}</span>
                  </div>
                  {amtWei > 0n && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[12px] flex items-center gap-1" style={{ color: "var(--text-2)" }}><DollarSign className="w-3 h-3" />{formatUSD(bidUSD)}</span>
                      {discPct && <span className="text-[12px] font-bold flex items-center gap-1" style={{ color: "#10B981" }}><TrendingDown className="w-3 h-3" />{discPct}% below IV</span>}
                    </div>
                  )}
                </div>
                {intrinsicValue > 0n && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)" }}>
                    <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                    <span className="text-[12px]" style={{ color: "var(--text-2)" }}>Intrinsic value: <span className="font-bold" style={{ color: "var(--text-1)" }}>{parseFloat(formatEther(intrinsicValue)).toFixed(5)} {collectionName === "veBTC" ? "BTC" : "MEZO"}</span><span className="ml-1" style={{ color: "var(--text-3)" }}>≈ {formatUSD(ivUSD)}</span></span>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2.5 flex items-center gap-1.5" style={{ color: "var(--text-3)" }}><Clock className="w-3 h-3" /> Bid Expires In</p>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPIRY_OPTIONS.map((opt, i) => {
                      const on = expiryIdx === i;
                      return (
                        <button key={opt.label} onClick={() => setExpiryIdx(i)} className="py-2 rounded-xl text-[12px] font-bold border transition-all" style={on ? { background: accent, color: "#fff", borderColor: "transparent" } : { background: "var(--bg-2)", borderColor: "var(--border)", color: "var(--text-2)" }}>{opt.label}</button>
                      );
                    })}
                  </div>
                  {expiryIdx === 3 && (
                    <input id="bid-expiry-days" name="bid-expiry-days" type="number" min="1" max="30" step="1" placeholder="Days (1–30)" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className="w-full mt-2 rounded-xl px-4 py-3 text-[13.5px] focus:outline-none" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
                  )}
                </div>
                {!approved && (
                  <div className="flex items-center gap-2">
                    {(["approve", "bid"] as const).map((p, i) => {
                      const activeNow = phase === p && (step === "approving" || step === "placing");
                      const doneApprove = phase === "bid" && p === "approve";
                      return (
                        <div key={p} className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full" style={activeNow ? { background: `${accent}22`, color: accent } : doneApprove ? { background: "rgba(16,185,129,0.20)", color: "#10B981" } : { background: "var(--bg-2)", color: "var(--text-3)" }}>
                          {doneApprove ? <CheckCircle2 className="w-3 h-3" /> : activeNow ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">{i + 1}</span>}
                          {p === "approve" ? `Approve ${bidSym}` : "Place Bid"}
                        </div>
                      );
                    })}
                  </div>
                )}
                {step === "error" && errMsg && (
                  <div className="flex gap-3 p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)" }}>
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "#EF4444" }}>{errMsg}</p>
                  </div>
                )}
                {step === "error" ? (
                  <button onClick={() => { setStep("form"); setPhase("approve"); setErrMsg(null); }} className="w-full py-4 rounded-2xl font-bold text-[14px] transition-all" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>Try Again</button>
                ) : (
                  <button onClick={handleSubmit} disabled={step !== "form" || amtWei <= 0n || !isDeployed} className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-[14.5px] disabled:opacity-40 disabled:cursor-not-allowed group">
                    {step === "approving" || step === "placing" ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />{step === "approving" ? "Approving…" : "Placing Bid…"}</>
                    ) : (
                      <>{approved ? "Place Bid" : `1. Approve ${bidSym}`}<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
