"use client";

/**
 * Recurring support: a supporter picks an amount a month and a number of
 * months, deposits once, and VezoBackerStreams streams it to the support
 * wallet over that time. Only the supporter's wallet can pause (the clock
 * stops) or cancel (everything not yet streamed comes straight back).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { erc20Abi, formatEther, parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ExternalLink, Loader2, Pause, Play, X } from "lucide-react";
import { CONTRACTS } from "@/lib/contracts";
import { mezoMainnet } from "@/lib/wagmi";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { useNetwork } from "@/hooks/useNetwork";
import {
  BACKER_STREAMS_ABI,
  MAX_PROJECT_NAME_BYTES,
  MIN_LISTED,
  MIN_TOTAL_USD,
  MONTH_CHOICES,
  MONTHLY_USD,
  MONTH_SECONDS,
  nameBytes,
  type StreamStatus,
} from "@/lib/backerStreams";

const M = CONTRACTS.mainnet;
const ZERO = "0x0000000000000000000000000000000000000000";
const LIVE = M.backerStreams !== ZERO;

type Sym = "BTC" | "MEZO" | "MUSD";
const TOKEN: Record<Sym, `0x${string}`> = { BTC: M.BTC, MEZO: M.MEZO, MUSD: M.MUSD };
const DOT: Record<Sym, string> = { BTC: "#F7931A", MEZO: "#4A90E2", MUSD: "#10B981" };

interface StreamRow {
  id: string;
  backer: string;
  name: string | null;
  token: Sym;
  deposit: string;
  withdrawn: string;
  duration: number;
  accrued: number;
  runStart: number;
  status: StreamStatus;
  endsAt: number | null;
}

function fmt(wei: bigint, max = 4): string {
  const v = parseFloat(formatEther(wei));
  if (v === 0) return "0";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { maximumFractionDigits: v >= 1 ? 2 : max + 2 });
}

/** Streamed so far, computed locally from the contract's own clock. */
function streamedNow(s: StreamRow, now: number): bigint {
  const dep = BigInt(s.deposit);
  if (s.status === "Canceled") return dep;
  let t = s.accrued + (s.status === "Active" ? Math.max(0, now - s.runStart) : 0);
  if (t > s.duration) t = s.duration;
  return (dep * BigInt(t)) / BigInt(s.duration);
}

function useStreams() {
  const [streams, setStreams] = useState<StreamRow[] | null>(null);
  const refetch = useCallback(async (fresh = false) => {
    try {
      const res = await fetch(`/api/support/backers${fresh ? `?t=${Date.now()}` : ""}`, { cache: "no-store" });
      if (res.ok) setStreams((await res.json()).streams ?? []);
    } catch { /* keep the last state */ }
  }, []);
  useEffect(() => {
    if (!LIVE) { setStreams([]); return; }
    refetch();
    const id = setInterval(() => refetch(), 60_000);
    return () => clearInterval(id);
  }, [refetch]);
  return { streams, refetch };
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Start recurring support ─────────────────────────────────────────────────

function StartStream({ onStarted }: { onStarted: () => void }) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: mezoMainnet.id });
  const { writeContractAsync } = useWriteContract();
  const { switchToMainnet } = useNetwork();
  const prices = usePriceTicker();

  // The amount is either a monthly rate or a total spread over the months;
  // the contract only ever sees the total and the duration.
  const [usdInput, setUsdInput] = useState("10");
  const [mode, setMode] = useState<"monthly" | "total">("monthly");
  const [months, setMonths] = useState(3);
  const [token, setToken] = useState<Sym>("MUSD");
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"idle" | "approving" | "starting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const typed = parseFloat(usdInput);
  const valid = isFinite(typed) && typed > 0;
  const totalUsd = valid ? (mode === "monthly" ? typed * months : typed) : 0;
  const perMonth = months > 0 ? totalUsd / months : 0;
  const tooSmall = valid && totalUsd < MIN_TOTAL_USD;
  const usd2 = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  // MUSD is the dollar here, so $10 a month for 3 months is 30 MUSD. BTC and
  // MEZO convert at the live price when the stream starts.
  const amount = useMemo(() => {
    if (!totalUsd) return null;
    if (token === "MUSD") return parseFloat(totalUsd.toFixed(6)).toString();
    const p = prices[token];
    return p ? parseFloat((totalUsd / p).toPrecision(4)).toString() : null;
  }, [totalUsd, token, prices]);

  const tooLong = nameBytes(name) > MAX_PROJECT_NAME_BYTES;
  const busy = stage === "approving" || stage === "starting";

  const start = useCallback(async () => {
    setError(null);
    if (!address || !publicClient || !amount) return;
    if (tooSmall) { setError(`The smallest total is $${MIN_TOTAL_USD}.`); return; }
    if (tooLong) { setError("That name is too long. Keep it under 32 characters."); return; }
    const wei = parseEther(amount);
    try {
      const bal = await publicClient.readContract({ address: TOKEN[token], abi: erc20Abi, functionName: "balanceOf", args: [address] });
      if (bal < wei) { setError(`Not enough ${token} on Mezo for this.`); return; }
      const allowance = await publicClient.readContract({ address: TOKEN[token], abi: erc20Abi, functionName: "allowance", args: [address, M.backerStreams] });
      if (allowance < wei) {
        setStage("approving");
        const h = await writeContractAsync({ address: TOKEN[token], abi: erc20Abi, functionName: "approve", args: [M.backerStreams, wei], chainId: mezoMainnet.id });
        await publicClient.waitForTransactionReceipt({ hash: h });
      }
      setStage("starting");
      const h = await writeContractAsync({
        address: M.backerStreams,
        abi: BACKER_STREAMS_ABI,
        functionName: "create",
        args: [TOKEN[token], wei, BigInt(months * MONTH_SECONDS), name.trim()],
        chainId: mezoMainnet.id,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash: h });
      if (r.status !== "success") throw new Error("reverted");
      setStage("done");
      onStarted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancell?ed/i.test(msg) ? "Cancelled in the wallet." : "That didn't go through. Check the wallet and try again.");
      setStage("idle");
    }
  }, [address, publicClient, amount, name, tooLong, token, months, writeContractAsync, onStarted]);

  const chip = (on: boolean) => ({
    background: on ? "var(--text-1)" : "var(--bg-2)",
    color: on ? "var(--bg-1)" : "var(--text-1)",
    border: `1px solid ${on ? "var(--text-1)" : "var(--border-subtle)"}`,
    transition: "background .18s, color .18s",
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <label htmlFor="stream-usd" className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Amount</label>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: "var(--bg-2)" }} role="group" aria-label="Amount is">
            {([["monthly", "a month"], ["total", "in total"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className="relative h-8 px-3 rounded-lg text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: mode === m ? "var(--text-1)" : "var(--text-3)" }}
              >
                {mode === m && <motion.span layoutId="stream-mode" className="absolute inset-0 rounded-lg" style={{ background: "var(--bg-1)", boxShadow: "var(--shadow-sm)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-semibold" style={{ color: "var(--text-3)" }}>$</span>
            <input
              id="stream-usd"
              inputMode="decimal"
              value={usdInput}
              onChange={(e) => setUsdInput(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-describedby="stream-summary"
              className="w-full rounded-xl pl-8 pr-24 py-3 text-[17px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FF0040]"
              style={{ background: "var(--bg-2)", border: `1px solid ${tooSmall ? "#EF4444" : "var(--border-subtle)"}`, color: "var(--text-1)" }}
            />
            <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold" style={{ color: "var(--text-3)" }}>
              {mode === "monthly" ? "a month" : "in total"}
            </span>
          </div>
          <div className="hidden sm:grid grid-cols-4 gap-1.5" role="group" aria-label="Quick amounts">
            {MONTHLY_USD.map((u) => (
              <button key={u} type="button" aria-pressed={typed === u} onClick={() => setUsdInput(String(u))}
                className="min-h-[50px] px-3 rounded-xl text-[15px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={chip(typed === u)}>${u}</button>
            ))}
          </div>
        </div>
        <div className="grid sm:hidden grid-cols-4 gap-1.5 mt-2" role="group" aria-label="Quick amounts">
          {MONTHLY_USD.map((u) => (
            <button key={u} type="button" aria-pressed={typed === u} onClick={() => setUsdInput(String(u))}
              className="min-h-[44px] rounded-xl text-[15px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={chip(typed === u)}>${u}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[14px] font-semibold mb-2.5" style={{ color: "var(--text-2)" }}>Over</p>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Number of months">
          {MONTH_CHOICES.map((m) => (
            <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}
              className="min-h-[46px] rounded-xl text-[15px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={chip(months === m)}
              aria-label={`${m} ${m === 1 ? "month" : "months"}`}>
              <span className="sm:hidden">{m} mo</span>
              <span className="hidden sm:inline">{m} {m === 1 ? "month" : "months"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div>
          <label htmlFor="stream-name" className="block text-[14px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>Name on the board <span style={{ color: "var(--text-3)", fontWeight: 500 }}>(optional)</span></label>
          <input
            id="stream-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="You or your project"
            className="w-full rounded-xl px-4 py-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#FF0040]"
            style={{ background: "var(--bg-2)", border: `1px solid ${tooLong ? "#EF4444" : "var(--border-subtle)"}`, color: "var(--text-1)" }}
          />
        </div>
        <div>
          <p className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>Pay with</p>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "var(--bg-2)" }}>
            {(["MUSD", "BTC", "MEZO"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={token === t}
                onClick={() => setToken(t)}
                className="relative h-10 px-3 rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: token === t ? "var(--text-1)" : "var(--text-3)" }}
              >
                {token === t && <motion.span layoutId="stream-token" className="absolute inset-0 rounded-lg" style={{ background: "var(--bg-1)", boxShadow: "var(--shadow-sm)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: DOT[t] }} />
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="stream-summary" aria-live="polite" className="rounded-xl px-5 py-4" style={{ background: "var(--bg-2)" }}>
        {valid && !tooSmall ? (
          <>
            <p className="text-[18px] font-bold tabular-nums" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {usd2(totalUsd)} over {months} {months === 1 ? "month" : "months"}
              <span className="font-semibold" style={{ color: "var(--text-2)" }}> · about {usd2(perMonth)} a month</span>
            </p>
            <p className="text-[14px] leading-relaxed mt-1.5" style={{ color: "var(--text-2)" }}>
              You fund <span className="font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{amount ? `${amount} ${token}` : `${usd2(totalUsd)} in ${token}`}</span> up
              front and it reaches Vezo a little each day. Cancel any time and what hasn&apos;t streamed comes back to you.
            </p>
          </>
        ) : (
          <p className="text-[14px]" style={{ color: tooSmall ? "#EF4444" : "var(--text-3)" }}>
            {tooSmall ? `The smallest total is $${MIN_TOTAL_USD}.` : "Enter an amount."}
          </p>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-[14px] font-medium" style={{ color: "#EF4444" }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {stage === "done" ? (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <Check style={{ width: 18, height: 18, color: "#10B981" }} />
          <p className="text-[15px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>It&apos;s streaming. Thank you. You can pause or cancel it below.</p>
          <button onClick={() => { setStage("idle"); setName(""); }} className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Start another</button>
        </div>
      ) : (
        <ConnectButton.Custom>
          {({ account, openConnectModal, mounted }) => {
            const base = "w-full min-h-[52px] rounded-xl text-[16px] font-bold inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2";
            if (!LIVE) return <button disabled className={base} style={{ background: "var(--bg-3)", color: "var(--text-3)" }}>Opening soon</button>;
            if (!(mounted && account)) return <button onClick={openConnectModal} className={`btn-brand ${base}`}>Connect wallet to start</button>;
            if (chainId !== mezoMainnet.id) return <button onClick={switchToMainnet} className={base} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>Switch to Mezo mainnet</button>;
            return (
              <button onClick={start} disabled={busy || !amount || tooSmall} className={`${busy ? "" : "btn-brand"} ${base} disabled:cursor-not-allowed`} style={busy ? { background: "var(--bg-3)", color: "var(--text-3)" } : undefined}>
                {busy ? <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />{stage === "approving" ? `Allow ${token} in your wallet…` : "Starting…"}</> : <>Start {usd2(totalUsd)} over {months} {months === 1 ? "month" : "months"}</>}
              </button>
            );
          }}
        </ConnectButton.Custom>
      )}
    </div>
  );
}

// ─── Your plans ──────────────────────────────────────────────────────────────

function MyPlans({ streams, now, onChanged }: { streams: StreamRow[]; now: number; onChanged: () => void }) {
  const publicClient = usePublicClient({ chainId: mezoMainnet.id });
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, fn: "pause" | "resume" | "cancel") => {
    if (!publicClient) return;
    setError(null);
    setBusy(id + fn);
    try {
      const h = await writeContractAsync({ address: M.backerStreams, abi: BACKER_STREAMS_ABI, functionName: fn, args: [BigInt(id)], chainId: mezoMainnet.id });
      await publicClient.waitForTransactionReceipt({ hash: h });
      setConfirmCancel(null);
      onChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancell?ed/i.test(msg) ? "Cancelled in the wallet." : "That didn't go through. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[18px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>Your recurring support</h3>
      {error && <p role="alert" className="text-[14px]" style={{ color: "#EF4444" }}>{error}</p>}
      {streams.map((s) => {
        const dep = BigInt(s.deposit);
        const streamed = streamedNow(s, now);
        const refundable = s.status === "Canceled" ? 0n : dep - streamed;
        const pct = dep > 0n ? Number((streamed * 10000n) / dep) / 100 : 0;
        const done = s.status !== "Canceled" && streamed >= dep;
        const left = s.status === "Active" && s.endsAt ? s.endsAt - now : null;
        const ends = left !== null ? new Date((now + left) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
        return (
          <div key={s.id} className="rounded-2xl p-5" style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <p className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>{s.name || `Stream #${s.id}`}</p>
              <p className="text-[14px] font-semibold" style={{ color: s.status === "Paused" ? "var(--warning)" : s.status === "Canceled" ? "var(--text-3)" : "#10B981" }}>
                {s.status === "Canceled" ? "Canceled" : done ? "Finished" : s.status === "Paused" ? "Paused" : `Streaming · ends ${ends}`}
              </p>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden mt-3" style={{ background: "var(--bg-3)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "var(--vezo-red)", transition: "width 1s linear" }} />
            </div>
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 mt-3 text-[14px] tabular-nums" style={{ color: "var(--text-2)" }}>
              <span>Streamed <span className="font-bold" style={{ color: "var(--text-1)" }}>{fmt(streamed)} {s.token}</span> of {fmt(dep)}</span>
              {s.status !== "Canceled" && <span>Yours back if you cancel now <span className="font-bold" style={{ color: "var(--text-1)" }}>{fmt(refundable)} {s.token}</span></span>}
            </div>
            {s.status !== "Canceled" && !done && (
              <div className="flex flex-wrap gap-2 mt-4">
                {s.status === "Active" ? (
                  <button onClick={() => act(s.id, "pause")} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-[14px] font-bold disabled:opacity-60" style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}>
                    {busy === s.id + "pause" ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Pause style={{ width: 14, height: 14 }} />} Pause
                  </button>
                ) : (
                  <button onClick={() => act(s.id, "resume")} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-[14px] font-bold disabled:opacity-60" style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}>
                    {busy === s.id + "resume" ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />} Resume
                  </button>
                )}
                {confirmCancel === s.id ? (
                  <>
                    <button onClick={() => act(s.id, "cancel")} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-[14px] font-bold disabled:opacity-60" style={{ background: "#EF4444", color: "#fff" }}>
                      {busy === s.id + "cancel" ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : null} Cancel and get {fmt(refundable)} {s.token} back
                    </button>
                    <button onClick={() => setConfirmCancel(null)} className="px-3 min-h-[44px] text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Keep it</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmCancel(s.id)} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-[14px] font-bold disabled:opacity-60" style={{ color: "var(--text-2)" }}>
                    <X style={{ width: 14, height: 14 }} /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export default function RecurringSupport() {
  const { address } = useAccount();
  const { streams, refetch } = useStreams();
  const now = useNow();
  const mine = useMemo(
    () => (streams ?? []).filter((s) => address && s.backer === address.toLowerCase()).sort((a, b) => Number(b.id) - Number(a.id)),
    [streams, address]
  );
  // Public list: only streams that have actually paid Vezo a real amount.
  // Anyone can open a stream under any name, so neither a deposit nor a 1 wei
  // payment proves anything.
  const board = useMemo(
    () => (streams ?? []).filter((s) => streamedNow(s, now) >= MIN_LISTED[s.token]).sort((a, b) => Number(a.id) - Number(b.id)),
    [streams, now]
  );

  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  // The "Prefer monthly?" link at the top of the page opens the form too.
  useEffect(() => {
    const show = () => {
      setOpen(true);
      // Scroll once the form is in the layout; scrolling in the same frame
      // gets cancelled by the height change.
      requestAnimationFrame(() => requestAnimationFrame(() =>
        document.getElementById("monthly")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
      ));
    };
    window.addEventListener("vezo:open-monthly", show);
    return () => window.removeEventListener("vezo:open-monthly", show);
  }, [reduced]);

  return (
    <section aria-labelledby="monthly-h" id="monthly" className="scroll-mt-28">
      <div className="support-panel p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 max-w-[52ch]">
            <h2 id="monthly-h" className="text-[22px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>
              Support Vezo every month
            </h2>
            <p className="text-[15px] leading-relaxed mt-1.5" style={{ color: "var(--text-2)" }}>
              Recurring support runs on a smart contract. Deposit once and it streams to Vezo
              over the months you pick. Pause or cancel any time, and whatever hasn&apos;t
              streamed comes back to you.
            </p>
          </div>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              aria-expanded={false}
              aria-controls="monthly-form"
              className="btn-brand shrink-0 px-5 min-h-[46px] rounded-xl text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
            >
              Set it up
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="monthly-form"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <StartStream onStarted={() => refetch(true)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {mine.length > 0 && (
        <div className="mt-8">
          <MyPlans streams={mine} now={now} onChanged={() => refetch(true)} />
        </div>
      )}

      {board.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[18px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>Monthly supporters</h3>
          <ul className="mt-2">
            {board.map((s) => {
              const done = s.status !== "Canceled" && streamedNow(s, now) >= BigInt(s.deposit);
              const label = done ? "Completed" : s.status === "Active" ? "Streaming" : s.status === "Paused" ? "Paused" : "Ended";
              return (
                <li key={s.id} className="flex items-center gap-4 py-3.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <span className={`flex-1 min-w-0 truncate text-[16px] font-semibold ${s.name ? "" : "font-mono text-[15px]"}`} style={{ color: "var(--text-1)" }}>
                    {s.name || `${s.backer.slice(0, 6)}…${s.backer.slice(-4)}`}
                  </span>
                  <span className="text-[14px]" style={{ color: label === "Streaming" ? "#10B981" : "var(--text-3)" }}>{label}</span>
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{fmt(streamedNow(s, now))} {s.token}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {LIVE && (
        <a href={`${M.explorer}/address/${M.backerStreams}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-semibold mt-5" style={{ color: "var(--text-3)" }}>
          View the contract on the explorer <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      )}
    </section>
  );
}
