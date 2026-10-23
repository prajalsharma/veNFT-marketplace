"use client";

/**
 * Project plans: a project picks a tier, deposits once, and the deposit
 * streams to the support wallet over the tier's months through
 * VezoBackerStreams. The project's own wallet can pause (the clock stops) or
 * cancel (everything not yet streamed comes straight back) at any time.
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
  MONTH_SECONDS,
  TIERS,
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

// ─── Start a plan ────────────────────────────────────────────────────────────

function StartPlan({ onStarted }: { onStarted: () => void }) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: mezoMainnet.id });
  const { writeContractAsync } = useWriteContract();
  const { switchToMainnet } = useNetwork();
  const prices = usePriceTicker();
  const reduced = useReducedMotion();

  const [tierIdx, setTierIdx] = useState(2);
  const [token, setToken] = useState<Sym>("MUSD");
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"idle" | "approving" | "starting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const tier = TIERS[tierIdx];
  // MUSD is the dollar here, so a $25 plan is 25 MUSD. BTC and MEZO convert
  // at the live price when the plan starts.
  const amount = useMemo(() => {
    if (token === "MUSD") return String(tier.usd);
    const p = prices[token];
    return p ? parseFloat((tier.usd / p).toPrecision(4)).toString() : null;
  }, [tier.usd, token, prices]);

  const tooLong = nameBytes(name) > MAX_PROJECT_NAME_BYTES;
  const busy = stage === "approving" || stage === "starting";

  const start = useCallback(async () => {
    setError(null);
    if (!address || !publicClient || !amount) return;
    const project = name.trim();
    if (!project) { setError("Add your project name. It shows on the board."); return; }
    if (tooLong) { setError("That name is too long. Keep it under 32 characters."); return; }
    const wei = parseEther(amount);
    try {
      const bal = await publicClient.readContract({ address: TOKEN[token], abi: erc20Abi, functionName: "balanceOf", args: [address] });
      if (bal < wei) { setError(`Not enough ${token} on Mezo for this plan.`); return; }
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
        args: [TOKEN[token], wei, BigInt(tier.months * MONTH_SECONDS), project],
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
  }, [address, publicClient, amount, name, tooLong, token, tier.months, writeContractAsync, onStarted]);

  return (
    <div className="space-y-6">
      {/* Tiers: one list, the chosen row opens to show what it includes */}
      <div role="radiogroup" aria-label="Plan" className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-1)" }}>
        {TIERS.map((t, i) => {
          const on = i === tierIdx;
          return (
            <button
              key={t.usd}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTierIdx(i)}
              className="w-full text-left px-5 py-4 flex gap-4 items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0040]"
              style={{ borderTop: i ? "1px solid var(--border-subtle)" : undefined, background: on ? "var(--bg-2)" : "transparent", transition: "background .18s" }}
            >
              <span
                aria-hidden
                className="mt-1 w-[18px] h-[18px] rounded-full shrink-0 inline-flex items-center justify-center"
                style={{ border: `1.5px solid ${on ? "var(--vezo-red)" : "var(--border-strong)"}` }}
              >
                {on && <span className="w-[9px] h-[9px] rounded-full" style={{ background: "var(--vezo-red)" }} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[20px] font-bold tabular-nums" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>${t.usd}</span>
                  <span className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>
                    {t.months} {t.months === 1 ? "month" : "months"}
                  </span>
                </span>
                <span className="block text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {t.perks[0]}{t.perks.length > 1 && !on ? ` · +${t.perks.length - 1} more` : ""}
                </span>
                <AnimatePresence initial={false}>
                  {on && t.perks.length > 1 && (
                    <motion.ul
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      {t.perks.slice(1).map((p) => (
                        <li key={p} className="flex gap-2 text-[14px] mt-1.5" style={{ color: "var(--text-2)" }}>
                          <Check aria-hidden style={{ width: 14, height: 14, marginTop: 3, color: "var(--vezo-red-text)", flexShrink: 0 }} />
                          {p}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div>
          <label htmlFor="project-name" className="block text-[14px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>Project name</label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shown on the backers board"
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
                {token === t && <motion.span layoutId="plan-token" className="absolute inset-0 rounded-lg" style={{ background: "var(--bg-1)", boxShadow: "var(--shadow-sm)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: DOT[t] }} />
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
        You deposit <span className="font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{amount ?? "…"} {token}</span> once.
        It streams to Vezo over {tier.months} {tier.months === 1 ? "month" : "months"}, and you can pause or cancel at any time.
      </p>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-[14px] font-medium" style={{ color: "#EF4444" }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {stage === "done" ? (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <Check style={{ width: 18, height: 18, color: "#10B981" }} />
          <p className="text-[15px] font-semibold flex-1" style={{ color: "var(--text-1)" }}>Your plan is live. Manage it below, and we&apos;ll be in touch on X.</p>
          <button onClick={() => { setStage("idle"); setName(""); }} className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>Start another</button>
        </div>
      ) : !LIVE ? (
        <div className="space-y-2">
          <button disabled className="w-full min-h-[52px] rounded-xl text-[16px] font-bold" style={{ background: "var(--bg-3)", color: "var(--text-3)" }}>
            Plans open soon
          </button>
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            The contract is in review. Want in early?{" "}
            <a href="https://x.com/VezoExchange" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "var(--text-1)" }}>Message us on X</a>.
          </p>
        </div>
      ) : (
        <ConnectButton.Custom>
          {({ account, openConnectModal, mounted }) => {
            const base = "w-full min-h-[52px] rounded-xl text-[16px] font-bold inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2";
            if (!(mounted && account)) return <button onClick={openConnectModal} className={`btn-brand ${base}`}>Connect wallet to start</button>;
            if (chainId !== mezoMainnet.id) return <button onClick={switchToMainnet} className={base} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>Switch to Mezo mainnet</button>;
            return (
              <button onClick={start} disabled={busy || !amount} className={`${busy ? "" : "btn-brand"} ${base} disabled:cursor-not-allowed`} style={busy ? { background: "var(--bg-3)", color: "var(--text-3)" } : undefined}>
                {busy ? <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />{stage === "approving" ? `Allow ${token} in your wallet…` : "Starting your plan…"}</> : <>Start the ${tier.usd} plan</>}
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
      <h3 className="text-[18px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>Your plans</h3>
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
              <p className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>{s.name || `Plan #${s.id}`}</p>
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
                    <X style={{ width: 14, height: 14 }} /> Cancel plan
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

export default function ProjectBackers() {
  const { address } = useAccount();
  const { streams, refetch } = useStreams();
  const now = useNow();
  const mine = useMemo(
    () => (streams ?? []).filter((s) => address && s.backer === address.toLowerCase()).sort((a, b) => Number(b.id) - Number(a.id)),
    [streams, address]
  );
  // Public board: only plans that have actually paid Vezo a real amount.
  // Anyone can open a plan under any name, so neither a deposit nor a 1 wei
  // payment proves anything.
  const board = useMemo(
    () => (streams ?? []).filter((s) => streamedNow(s, now) >= MIN_LISTED[s.token]).sort((a, b) => Number(a.id) - Number(b.id)),
    [streams, now]
  );

  return (
    <section aria-labelledby="projects-h" id="projects" className="scroll-mt-28">
      <h2 id="projects-h" className="font-bold" style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", letterSpacing: "-0.035em", color: "var(--text-1)" }}>
        For projects on Mezo
      </h2>
      <p className="text-[16px] leading-relaxed mt-2 max-w-[60ch]" style={{ color: "var(--text-2)" }}>
        Back Vezo with a plan and we promote you on X, and share every post in the Mezo Discord.
        Pay once and the money streams to us over the months of your plan. Pause any time and the
        clock stops. Cancel any time and everything not yet streamed comes straight back to you.
      </p>

      <ol className="grid sm:grid-cols-3 gap-x-6 gap-y-3 mt-6 mb-7">
        {[
          ["Deposit once", "Your plan amount goes into a public contract, not to us."],
          ["It streams", "It moves to Vezo second by second over your plan."],
          ["You stay in control", "Pause, resume or cancel from your wallet. No one else can."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="font-bold tabular-nums text-[15px]" style={{ color: "var(--vezo-red-text)" }}>0{i + 1}</span>
            <span>
              <span className="block text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{t}</span>
              <span className="block text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>{d}</span>
            </span>
          </li>
        ))}
      </ol>

      <StartPlan onStarted={() => refetch(true)} />

      {mine.length > 0 && (
        <div className="mt-8">
          <MyPlans streams={mine} now={now} onChanged={() => refetch(true)} />
        </div>
      )}

      {board.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[18px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>Project backers</h3>
          <ul className="mt-2">
            {board.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-3.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span className="flex-1 min-w-0 truncate text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{s.name || `Plan #${s.id}`}</span>
                {(() => {
                  const done = s.status !== "Canceled" && streamedNow(s, now) >= BigInt(s.deposit);
                  const label = done ? "Completed" : s.status === "Active" ? "Active" : s.status === "Paused" ? "Paused" : "Ended";
                  return <span className="text-[14px]" style={{ color: label === "Active" ? "#10B981" : "var(--text-3)" }}>{label}</span>;
                })()}
                <span className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
                  {fmt(streamedNow(s, now))} {s.token}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {LIVE && (
        <a href={`${M.explorer}/address/${M.backerStreams}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-semibold mt-5" style={{ color: "var(--text-3)" }}>
          Read the contract on the explorer <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      )}
    </section>
  );
}
