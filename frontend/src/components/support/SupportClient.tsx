"use client";

/**
 * support.vezo.exchange — the Mezo-native tip jar.
 *
 * Everything here is deliberately transaction-honest: donations are plain
 * transfers straight to the team wallet, names ride inside the donor's own
 * transaction calldata, and the board is rebuilt from public chain data (see
 * /api/support/donations). No database, nothing to trust but the chain.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useSendTransaction } from "wagmi";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence, useReducedMotion, useInView, animate } from "framer-motion";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Coffee,
  Copy,
  ExternalLink,
  Heart,
  Loader2,
} from "lucide-react";
import { CONTRACTS } from "@/lib/contracts";
import { mezoMainnet } from "@/lib/wagmi";
import ProjectBackers from "./ProjectBackers";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { useMarketHistory, useMarketValue, fmtUsdWhole } from "@/hooks/useMarketData";
import { useNetwork } from "@/hooks/useNetwork";
import {
  SUPPORT_ADDRESS,
  MAX_NAME_LEN,
  encodeGraffiti,
  sanitizeName,
  type SupportToken,
} from "@/lib/support";

const MAINNET = CONTRACTS.mainnet;
const EXPLORER = MAINNET.explorer;

// `step` drives the number input's spinner, so nudging BTC moves by dust, not
// by a whole coin (the browser default step of 1 is absurd across tokens with
// wildly different unit values). `fallback` only covers the moment before the
// live price feed answers.
const TOKEN_META: Record<SupportToken, { dot: string; step: string; fallback: string }> = {
  BTC:  { dot: "#F7931A", step: "0.0001", fallback: "0.0003" },
  MEZO: { dot: "#4A90E2", step: "100",    fallback: "5000" },
  MUSD: { dot: "#10B981", step: "1",      fallback: "25" },
};

// Preset chips are USD-anchored and converted through the same live price feed
// as the header ticker, so $25 is always $25 no matter which token is picked.
// Classic fundraising ladder: ~2x steps, no gap large enough to stall the
// decision, middle option pre-selected as the anchor.
const USD_PRESETS = [5, 10, 25, 50, 100];
// The amount picker shows each choice as coffees for the team.
const COFFEE_USD = 5;

// Donating BTC costs BTC gas. Refuse an amount that would leave the wallet
// unable to pay for its own transaction (~26k gas, generous margin).
const BTC_GAS_HEADROOM = 2n * 10n ** 13n; // 0.00002 BTC

/** Round a token amount to two significant digits ("5000", "0.00033", "25"). */
function niceAmount(x: number): string {
  if (!isFinite(x) || x <= 0) return "0";
  return parseFloat(x.toPrecision(2)).toString();
}

const TOKEN_ADDR: Record<SupportToken, `0x${string}`> = {
  BTC: MAINNET.BTC,
  MEZO: MAINNET.MEZO,
  MUSD: MAINNET.MUSD,
};

function fmtAmount(wei: bigint): string {
  const v = parseFloat(formatEther(wei));
  if (v === 0) return "0";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (!isFinite(diff) || diff < 0) return null;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface Donor {
  address: string;
  name: string | null;
  anon: boolean;
  BTC: string;
  MEZO: string;
  MUSD: string;
  count: number;
  /** First contribution (server); used to mark founding supporters. */
  firstAt?: string | null;
  lastAt: string | null;
  /** USD at the time of each contribution (server); absent for optimistic
   *  entries and null when price history was unavailable. */
  usd?: number | null;
}

interface BoardData {
  donors: Donor[];
  totals: { BTC: string; MEZO: string; MUSD: string };
  totalsUsd?: { BTC: number; MEZO: number; MUSD: number } | null;
  totalUsd?: number | null;
  /** Optimistic contributions the server hasn't indexed yet (wei). */
  pending?: { BTC: string; MEZO: string; MUSD: string };
  donationCount: number;
}

function useBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/support/donations", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // board degrades to its last known state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  return { data, loading, refetch };
}

// ─── Donate panel ────────────────────────────────────────────────────────────

function DonatePanel({ onDonated, request }: { onDonated: (d: Donor) => void; request?: { usd: number; n: number } | null }) {
  const { address, chainId: walletChain } = useAccount();
  const publicClient = usePublicClient({ chainId: mezoMainnet.id });
  const { sendTransactionAsync } = useSendTransaction();
  const { switchToMainnet } = useNetwork();
  const prices = usePriceTicker();
  const reduced = useReducedMotion();

  const [token, setToken] = useState<SupportToken>("MUSD");
  const [amount, setAmount] = useState("25");
  // Which USD chip the current amount came from (null once the user types).
  const [usdPick, setUsdPick] = useState<number | null>(25);
  const [name, setName] = useState("");
  const [anon, setAnon] = useState(false);
  const [stage, setStage] = useState<"idle" | "sending" | "confirming" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const busy = stage === "sending" || stage === "confirming";
  const meta = TOKEN_META[token];
  const usd = (() => {
    const v = parseFloat(amount);
    const p = prices[token];
    return isFinite(v) && v > 0 && p ? v * p : null;
  })();
  const onMainnet = walletChain === mezoMainnet.id;

  /** Live-price conversion of a USD target into this token's amount. */
  const amountForUsd = useCallback(
    (usdTarget: number, t: SupportToken): string => {
      const p = prices[t];
      return p ? niceAmount(usdTarget / p) : TOKEN_META[t].fallback;
    },
    [prices]
  );

  const pickToken = (t: SupportToken) => {
    setToken(t);
    setAmount(amountForUsd(usdPick ?? 25, t));
    setError(null);
  };

  const pickUsd = (u: number) => {
    setUsdPick(u);
    setAmount(amountForUsd(u, token));
  };

  // When the live feed answers (or refreshes), keep a chip-chosen amount true
  // to its dollar target; a hand-typed amount is never touched.
  useEffect(() => {
    if (usdPick !== null) setAmount(amountForUsd(usdPick, token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices.BTC, prices.MEZO, prices.MUSD]);

  // The hero's "one $10 gift gets us there" button lands here.
  useEffect(() => {
    if (request) pickUsd(request.usd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);

  const send = useCallback(async () => {
    setError(null);
    if (!address || !publicClient) return;
    let wei: bigint;
    try {
      wei = parseEther(amount || "0");
    } catch {
      setError("That amount doesn't parse.");
      return;
    }
    if (wei <= 0n) {
      setError("Amount must be more than zero.");
      return;
    }
    try {
      const balance = await publicClient.readContract({
        address: TOKEN_ADDR[token],
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      if (balance < wei) {
        setError(`Not enough ${token} on Mezo mainnet for that amount.`);
        return;
      }
      if (token === "BTC" && balance - wei < BTC_GAS_HEADROOM) {
        setError("Leave a little BTC for gas. Lower the amount slightly.");
        return;
      }
      setStage("sending");
      const graffiti = encodeGraffiti(name, anon);
      const data = (encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [SUPPORT_ADDRESS, wei],
      }) + graffiti) as `0x${string}`;
      const hash = await sendTransactionAsync({
        to: TOKEN_ADDR[token],
        data,
        chainId: mezoMainnet.id,
      });
      setTxHash(hash);
      setStage("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted on-chain.");
      setStage("done");
      onDonated({
        address: address.toLowerCase(),
        name: anon ? null : sanitizeName(name) || null,
        anon,
        BTC: token === "BTC" ? wei.toString() : "0",
        MEZO: token === "MEZO" ? wei.toString() : "0",
        MUSD: token === "MUSD" ? wei.toString() : "0",
        count: 1,
        firstAt: new Date().toISOString(),
        lastAt: new Date().toISOString(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /reject|denied|cancell?ed/i.test(msg)
          ? "Transaction cancelled in the wallet."
          : /revert/i.test(msg)
          ? "The transaction reverted on-chain."
          : "That didn't go through. Check the wallet and try again."
      );
      setStage("idle");
    }
  }, [address, publicClient, amount, token, name, anon, sendTransactionAsync, onDonated]);

  const coffees = usd !== null ? Math.max(1, Math.round(usd / COFFEE_USD)) : 0;

  if (stage === "done") {
    const shared = anon ? null : sanitizeName(name) || null;
    const shareText = encodeURIComponent(
      "I just backed @VezoExchange, the marketplace for veNFTs on Mezo. My name is on the board, on-chain."
    );
    return (
      <div className="support-panel p-6 md:p-7 space-y-5" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
        <Confetti />
        <motion.div
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="w-12 h-12 rounded-full inline-flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.12)" }}
        >
          <CheckCircle2 style={{ width: 24, height: 24, color: "#10B981" }} />
        </motion.div>
        <div>
          <p className="text-[22px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>
            You&apos;re on the board. Thank you.
          </p>
          <p className="text-[15px] leading-relaxed mt-2" style={{ color: "var(--text-2)" }}>
            {anon
              ? "You'll show up as an anonymous supporter within a minute."
              : shared
              ? `"${shared}" is written into the transaction itself. It shows on the board within a minute.`
              : "Your contribution shows on the board within a minute."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <a
            href={`https://x.com/intent/post?text=${shareText}&url=${encodeURIComponent("https://support.vezo.exchange")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
          >
            Share on X
          </a>
          <button
            onClick={() => { setStage("idle"); setTxHash(null); setError(null); }}
            className="flex-1 py-3 rounded-xl text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}
          >
            Send another
          </button>
        </div>
        {txHash && (
          <a
            href={`${EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-3)" }}
          >
            View the transaction <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="support-panel p-6 md:p-7 space-y-6">
      <div>
        <h2 className="text-[22px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>
          Back the build
        </h2>
        <p className="text-[15px] leading-relaxed mt-1" style={{ color: "var(--text-3)" }}>
          Sent straight to the team wallet, in your own transaction.
        </p>
      </div>

      {/* Amount first: the dollar ladder is the decision, the token is a detail. */}
      <fieldset className="space-y-3">
        <legend className="text-[14px] font-semibold mb-2.5" style={{ color: "var(--text-2)" }}>
          Amount
        </legend>
        <div className="grid grid-cols-5 gap-1.5">
          {USD_PRESETS.map((u) => {
            const active = usdPick === u;
            return (
              <motion.button
                key={u}
                type="button"
                onClick={() => pickUsd(u)}
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.94 }}
                className="relative min-h-[48px] rounded-xl text-[16px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{
                  background: active ? "var(--text-1)" : "var(--bg-2)",
                  color: active ? "var(--bg-1)" : "var(--text-1)",
                  border: `1px solid ${active ? "var(--text-1)" : "var(--border-subtle)"}`,
                  transition: "background .18s, color .18s, border-color .18s",
                }}
              >
                ${u}
              </motion.button>
            );
          })}
        </div>

        {/* Coffee row: turns an abstract number into something you can picture. */}
        <div className="flex items-center gap-3 min-h-[28px]" aria-live="polite">
          <div className="flex items-center -space-x-1" aria-hidden>
            <AnimatePresence initial={false}>
              {Array.from({ length: Math.min(coffees, 10) }, (_, i) => (
                <motion.span
                  key={i}
                  initial={reduced ? false : { scale: 0, y: 6 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22, delay: reduced ? 0 : i * 0.03 }}
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                  style={{ background: "var(--bg-1)", border: "1px solid var(--border)", color: "var(--vezo-red-text)" }}
                >
                  <Coffee style={{ width: 13, height: 13 }} strokeWidth={2.2} />
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          {coffees > 0 && (
            <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>
              {coffees === 1 ? "A coffee for the team" : `${coffees} coffees for the team`}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="text-[14px] font-semibold mb-2.5" style={{ color: "var(--text-2)" }}>
          Pay with
        </legend>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl" style={{ background: "var(--bg-2)" }}>
          {(Object.keys(TOKEN_META) as SupportToken[]).map((t) => {
            const active = token === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickToken(t)}
                aria-pressed={active}
                className="relative flex items-center justify-center gap-2 h-10 rounded-lg text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: active ? "var(--text-1)" : "var(--text-3)" }}
              >
                {active && (
                  <motion.span
                    layoutId="support-token"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--bg-1)", boxShadow: "var(--shadow-sm)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative w-2 h-2 rounded-full" style={{ background: TOKEN_META[t].dot }} />
                <span className="relative">{t}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <input
            id="support-amount"
            name="support-amount"
            aria-label={`Amount in ${token}`}
            type="number"
            min="0"
            step={meta.step}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setUsdPick(null); }}
            className="w-full rounded-xl pl-4 pr-28 py-3.5 text-[17px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FF0040]"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold pointer-events-none tabular-nums"
            style={{ color: "var(--text-3)" }}
          >
            {usd !== null ? `≈ $${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : token}
          </span>
        </div>
        {!prices[token] && (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Loading live prices…</p>
        )}
      </fieldset>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="support-name"
            name="support-name"
            aria-label="Name shown on the supporters board"
            type="text"
            maxLength={MAX_NAME_LEN}
            placeholder={anon ? "Anonymous" : "Your name on the board"}
            value={anon ? "" : name}
            disabled={anon}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#FF0040] disabled:opacity-50"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}
          />
          <button
            type="button"
            role="switch"
            onClick={() => setAnon((a) => !a)}
            aria-checked={anon}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-3 rounded-xl text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-2)" }}
          >
            <span
              className="relative w-8 h-[18px] rounded-full transition-colors"
              style={{ background: anon ? "var(--vezo-red)" : "var(--bg-4)" }}
            >
              <motion.span
                className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white"
                animate={{ left: anon ? 16 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </span>
            Anonymous
          </button>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Your name is saved inside the transaction, so nobody can edit it later. Not even us.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[14px] font-medium"
            style={{ color: "#EF4444" }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <ConnectButton.Custom>
        {({ account, openConnectModal, mounted }) => {
          const connected = mounted && !!account;
          const base = "w-full min-h-[54px] rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2";
          if (!connected) {
            return (
              <motion.button whileTap={reduced ? undefined : { scale: 0.98 }} onClick={openConnectModal} className={`btn-brand ${base}`}>
                <Heart style={{ width: 16, height: 16, fill: "currentColor" }} />
                Connect wallet to back Vezo
              </motion.button>
            );
          }
          if (!onMainnet) {
            return (
              <button onClick={switchToMainnet} className={base} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>
                Switch to Mezo mainnet
              </button>
            );
          }
          return (
            <motion.button
              whileTap={reduced || busy ? undefined : { scale: 0.98 }}
              onClick={send}
              disabled={busy}
              className={`${busy ? "" : "btn-brand"} ${base} disabled:cursor-not-allowed`}
              style={busy ? { background: "var(--bg-3)", color: "var(--text-3)" } : undefined}
            >
              {busy ? (
                <>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  {stage === "confirming" ? "Confirming on Mezo…" : "Confirm in your wallet…"}
                </>
              ) : (
                <>
                  <Heart style={{ width: 16, height: 16, fill: "currentColor" }} />
                  Back Vezo with {amount || "0"} {token}
                </>
              )}
            </motion.button>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}

// ─── Direct address ──────────────────────────────────────────────────────────

function AddressBlock() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="px-1">
      <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>
        Or send from any wallet
      </p>
      <p className="text-[14px] leading-relaxed mt-1 mb-3" style={{ color: "var(--text-3)" }}>
        BTC, MEZO, or MUSD on Mezo. Anything from $1 shows up on the board.
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 min-w-0 truncate text-[13px] font-mono px-3 py-2.5 rounded-lg"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }}
        >
          {SUPPORT_ADDRESS}
        </code>
        <button
          onClick={copy}
          aria-label={copied ? "Address copied" : "Copy address"}
          className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: copied ? "#10B981" : "var(--text-2)" }}
        >
          {copied ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />}
        </button>
        <a
          href={`${EXPLORER}/address/${SUPPORT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View the wallet on the explorer"
          className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }}
        >
          <ExternalLink style={{ width: 15, height: 15 }} />
        </a>
      </div>
    </div>
  );
}

// ─── Motion helpers ──────────────────────────────────────────────────────────

/** Counts up from zero the first time it scrolls into view. */
function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setShown(value); return; }
    const c = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, value, reduced]);
  return <span ref={ref} className="tabular-nums">{format(shown)}</span>;
}

/** One short burst in brand and token colours when a contribution lands. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    if (!c || reduced) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#FF0040", "#F7931A", "#4A90E2", "#10B981", "#0d0d0d", "#ffffff"];
    const ox = window.innerWidth / 2, oy = window.innerHeight * 0.42;
    const parts = Array.from({ length: 140 }, () => {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      return { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: colors[(Math.random() * colors.length) | 0] };
    });
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const life = (t - t0) / 2200;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of parts) {
        p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - life); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (life < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return <canvas ref={ref} aria-hidden className="fixed inset-0 w-screen h-screen pointer-events-none z-[60]" />;
}

/** A soft two-tone disc derived from the address, so every supporter has a face. */
function Avatar({ address, label, size = 36, anon, fluid }: { address: string; label: string; size?: number; anon?: boolean; fluid?: boolean }) {
  const h = parseInt(address.slice(2, 10), 16) || 0;
  const a = h % 360, b = (a + 35 + ((h >> 9) % 70)) % 360;
  return (
    <span
      aria-hidden
      className="shrink-0 inline-flex items-center justify-center rounded-full font-bold text-white select-none"
      style={{
        width: fluid ? "100%" : size, height: fluid ? "100%" : size, fontSize: fluid ? 14 : size * 0.4,
        background: anon ? "var(--bg-4)" : `linear-gradient(135deg, hsl(${a} 58% 60%), hsl(${b} 62% 42%))`,
        color: anon ? "var(--text-2)" : "#fff",
        boxShadow: "0 0 0 2px var(--bg-1)",
      }}
    >
      {anon ? "?" : label.replace(/^0x/, "").charAt(0).toUpperCase()}
    </span>
  );
}

// ─── Board data shaping ──────────────────────────────────────────────────────

type RankedDonor = Donor & { usd: number; display: string; mono: boolean };

function useRanked(data: BoardData | null) {
  const prices = usePriceTicker();
  return useMemo(() => {
    const live = (t: SupportToken, wei: string) => {
      const p = prices[t];
      return p ? parseFloat(formatEther(BigInt(wei))) * p : 0;
    };
    const worth = (d: Donor) =>
      typeof d.usd === "number" ? d.usd : live("BTC", d.BTC) + live("MEZO", d.MEZO) + live("MUSD", d.MUSD);
    const donors = [...(data?.donors ?? [])].sort((a, b) => worth(b) - worth(a));
    let anonSeq = 0;
    const ranked: RankedDonor[] = donors.map((d) => ({
      ...d,
      usd: worth(d),
      display: d.anon ? `anon${++anonSeq}` : d.name ?? shortAddr(d.address),
      mono: !d.anon && !d.name,
    }));
    // Dollar worth per token: priced when each contribution arrived (server),
    // falling back to live prices if that history couldn't be loaded.
    const tokenUsd = (t: SupportToken) => {
      if (!data) return 0;
      if (data.totalsUsd) return data.totalsUsd[t] + (data.pending ? live(t, data.pending[t]) : 0);
      return live(t, data.totals[t]);
    };
    const byToken = { BTC: tokenUsd("BTC"), MEZO: tokenUsd("MEZO"), MUSD: tokenUsd("MUSD") };
    // Founding supporters: the first FOUNDING_SPOTS wallets, in the order they
    // first contributed on-chain. Fixed forever once taken.
    const firstOf = (d: Donor) => new Date(d.firstAt ?? d.lastAt ?? Date.now()).getTime();
    const founders = [...ranked].sort((a, b) => firstOf(a) - firstOf(b)).slice(0, FOUNDING_SPOTS);
    const founding = new Set(founders.map((d) => d.address));
    return { ranked, founders, founding, byToken, total: byToken.BTC + byToken.MEZO + byToken.MUSD, atTime: !!data?.totalsUsd };
  }, [data, prices]);
}

const FOUNDING_SPOTS = 10;

const fmtUsd = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Milestones step up as the total grows, so the bar always has a near goal to
// close in on. Round numbers only; nothing here claims a budget.
const MILESTONES = [25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000];
const nextMilestone = (v: number) => MILESTONES.find((m) => m > v) ?? Math.ceil((v + 1) / 100_000) * 100_000;

// ─── Hero: raised so far ─────────────────────────────────────────────────────

function RaisedMeter({ data, onPick }: { data: BoardData | null; onPick: (usd: number) => void }) {
  const { ranked, founders, byToken, total, atTime } = useRanked(data);
  const reduced = useReducedMotion();
  const goal = nextMilestone(total);
  const pct = Math.min(1, total / goal);
  const left = Math.max(0, goal - total);
  // Smallest preset that closes the gap on its own: a concrete, doable ask.
  const closer = USD_PRESETS.find((u) => u >= left) ?? null;
  const latest = useMemo(
    () => [...ranked].sort((a, b) => new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime())[0],
    [ranked]
  );
  const spotsLeft = FOUNDING_SPOTS - founders.length;

  return (
    <section aria-label="Raised so far" className="mt-9">
      <div className="flex items-end justify-between gap-x-6 gap-y-2 flex-wrap">
        <div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--text-3)" }}>Raised so far</p>
          {data ? (
            <p
              className="font-bold leading-none mt-2"
              style={{ fontSize: "clamp(3rem, 6.5vw, 4.75rem)", letterSpacing: "-0.05em", color: "var(--text-1)" }}
            >
              <CountUp value={total} format={fmtUsd} />
            </p>
          ) : (
            <span className="inline-block mt-2 h-16 w-56 skeleton rounded-lg" aria-label="Loading total" />
          )}
        </div>
        {data && total > 0 && (
          <p className="text-[16px] pb-1.5 tabular-nums" style={{ color: "var(--text-2)" }}>
            <span className="font-bold" style={{ color: "var(--text-1)" }}>{Math.floor(pct * 100)}%</span> of the way to{" "}
            <span className="font-bold" style={{ color: "var(--text-1)" }}>${goal.toLocaleString("en-US")}</span>
          </p>
        )}
      </div>

      <div
        className="relative h-3 rounded-full overflow-hidden mt-5"
        style={{ background: "var(--bg-3)" }}
        role="progressbar"
        aria-label={`Progress to $${goal}`}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.round(total)}
      >
        <motion.div
          className="absolute inset-y-0 left-0 w-full rounded-full origin-left"
          style={{ background: "var(--vezo-red)" }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: data ? Math.max(pct, total > 0 ? 0.02 : 0) : 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>

      {data && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
          {(["BTC", "MEZO", "MUSD"] as const).filter((t) => BigInt(data.totals[t]) > 0n).map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-[14px] tabular-nums" style={{ color: "var(--text-2)" }}>
              <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: TOKEN_META[t].dot }} />
              <span className="font-semibold" style={{ color: "var(--text-1)" }}>{fmtAmount(BigInt(data.totals[t]))} {t}</span>
              <span>{fmtUsd(byToken[t])}</span>
            </span>
          ))}
          {data.donationCount > 0 && (
            <span className="text-[13px] self-center" style={{ color: "var(--text-3)" }}>
              {atTime ? "valued when each arrived" : "at today's prices"}
            </span>
          )}
        </div>
      )}

      {/* The gap, made doable: one specific gift closes it. */}
      {data && (
        <div
          className="mt-6 flex items-center gap-4 flex-wrap rounded-2xl px-5 py-4"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="flex-1 min-w-[200px] text-[16px] leading-snug" style={{ color: "var(--text-1)" }}>
            {total === 0 ? (
              <>Start the board. <span style={{ color: "var(--text-2)" }}>The first gift sets the pace for everyone after.</span></>
            ) : closer ? (
              <><span className="font-bold">{fmtUsd(left)}</span> to go. One <span className="font-bold">${closer}</span> gift gets us there.</>
            ) : (
              <><span className="font-bold">{fmtUsd(left)}</span> to go to <span className="font-bold">${goal.toLocaleString("en-US")}</span>.</>
            )}
          </p>
          <motion.button
            whileTap={reduced ? undefined : { scale: 0.96 }}
            onClick={() => onPick(closer ?? USD_PRESETS[2])}
            className="btn-brand shrink-0 px-5 min-h-[46px] rounded-xl text-[15px] font-bold inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
          >
            <Heart style={{ width: 15, height: 15, fill: "currentColor" }} />
            Give ${closer ?? USD_PRESETS[2]}
          </motion.button>
        </div>
      )}

      {/* Founding supporters: ten seats, filled in on-chain order. */}
      {data && (
        <div className="mt-7">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <p className="text-[16px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
              Founding supporters
            </p>
            <p className="text-[14px] tabular-nums" style={{ color: "var(--text-2)" }}>
              {spotsLeft > 0 ? (
                <><span className="font-bold" style={{ color: "var(--vezo-red-text)" }}>{spotsLeft} of {FOUNDING_SPOTS}</span> spots left</>
              ) : "All ten spots taken"}
            </p>
          </div>
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 mt-3 max-w-[440px]" role="list">
            {Array.from({ length: FOUNDING_SPOTS }, (_, i) => {
              const f = founders[i];
              return f ? (
                <motion.span
                  role="listitem"
                  key={f.address}
                  title={f.display}
                  className="aspect-square"
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.3 + i * 0.05 }}
                >
                  <Avatar address={f.address} label={f.display} anon={f.anon} fluid />
                  <span className="sr-only">{f.display}</span>
                </motion.span>
              ) : (
                <span
                  role="listitem"
                  key={`open-${i}`}
                  aria-label="Open spot"
                  className="aspect-square rounded-full inline-flex items-center justify-center text-[12px] sm:text-[13px] font-bold tabular-nums"
                  style={{ border: "1.5px dashed var(--border-strong)", color: "var(--text-4)" }}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <p className="text-[14px] mt-3" style={{ color: "var(--text-3)" }}>
            {latest ? (
              <>
                Latest: <span className={`font-semibold ${latest.mono ? "font-mono" : ""}`} style={{ color: "var(--text-2)" }}>{latest.display}</span>
                {timeAgo(latest.lastAt) ? `, ${timeAgo(latest.lastAt)}` : ""}.{" "}
              </>
            ) : null}
            The first ten names keep the mark on the board for good.
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Our impact so far ───────────────────────────────────────────────────────

function TrackRecord() {
  const hist = useMarketHistory();
  const value = useMarketValue();
  const st = hist.stats;
  const whole = (v: number) => Math.round(v).toLocaleString("en-US");
  const usd = (v: number) => fmtUsdWhole(v);

  const figures: { v: number | null; f: (n: number) => string; l: string; s?: string }[] = [
    { v: value && value.mezoTraded > 0 ? value.mezoTradedUsd : null, f: usd, l: "of MEZO traded", s: st ? `${whole(parseFloat(st.volume.MEZO))} MEZO in ${st.totalSales} sales` : undefined },
    { v: value ? value.mezoListedUsd : null, f: usd, l: "of MEZO brought to market", s: value ? `${whole(value.mezoListed)} MEZO in ${value.positionsListed} positions` : undefined },
    { v: st ? st.participants : null, f: whole, l: "people have used Vezo" },
    { v: st ? st.totalListings : null, f: whole, l: "veNFTs listed" },
  ];

  return (
    <section aria-labelledby="backing-h" className="pt-4">
      <h2 id="backing-h" className="font-bold" style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", letterSpacing: "-0.035em", color: "var(--text-1)" }}>
        Our impact on Mezo so far
      </h2>
      <p className="text-[16px] leading-relaxed mt-2 max-w-[56ch]" style={{ color: "var(--text-2)" }}>
        The first secondary market for veNFTs on Mezo. Live on mainnet since March 16, 2026, contracts reviewed by the Mezo team, and a flat 1% fee on sales.
      </p>

      {hist.status === "error" ? (
        <p className="text-[15px] mt-6" style={{ color: "var(--text-2)" }}>
          The live figures can&apos;t be loaded right now. The Dune dashboard below has them.
        </p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 mt-7" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {figures.map((x, i) => (
            <motion.div
              key={x.l}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={`py-6 ${i % 2 ? "sm:pl-8 sm:border-l" : "sm:pr-8"}`}
              style={{ borderBottom: "1px solid var(--border-subtle)", borderLeftColor: "var(--border-subtle)" }}
            >
              <dd
                className="font-bold leading-none"
                style={{ fontSize: "clamp(2.25rem, 4.2vw, 3.1rem)", letterSpacing: "-0.045em", color: "var(--text-1)" }}
              >
                {x.v !== null ? <CountUp value={x.v} format={x.f} /> : <span className="inline-block h-10 w-36 skeleton rounded" aria-label={`Loading ${x.l}`} />}
              </dd>
              <dt className="text-[15px] font-semibold mt-2.5" style={{ color: "var(--text-2)" }}>{x.l}</dt>
              {x.s && <p className="text-[14px] mt-1 tabular-nums" style={{ color: "var(--text-3)" }}>{x.s}</p>}
            </motion.div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        {value && hist.status !== "error" ? (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Dollar values use MEZO&apos;s price at the time of each sale or listing.</p>
        ) : <span />}
        <a
          href="https://dune.com/vezo/vezo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ color: "var(--vezo-red-text)" }}
        >
          <BarChart3 style={{ width: 14, height: 14 }} />
          Check it on Dune
          <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      </div>
    </section>
  );
}

// ─── What support builds ─────────────────────────────────────────────────────

const USES = [
  { t: "New features", d: "Better bidding, more ways to pay, and tools that make selling a veNFT easier." },
  { t: "A safer Vezo", d: "Every contract change gets reviewed before it touches anyone's veNFT." },
  { t: "Fast and reliable", d: "Hosting, price feeds, and the on-chain index behind Activity and this board." },
];

function WhereItGoes() {
  return (
    <section aria-labelledby="goes-h">
      <h2 id="goes-h" className="font-bold" style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", letterSpacing: "-0.035em", color: "var(--text-1)" }}>
        What your support builds
      </h2>
      <ol className="mt-6">
        {USES.map((u, i) => (
          <motion.li
            key={u.t}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-[3rem_1fr] gap-x-4 py-5"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <span className="font-bold tabular-nums leading-none pt-0.5" style={{ fontSize: "1.6rem", letterSpacing: "-0.04em", color: "var(--vezo-red-text)" }}>
              0{i + 1}
            </span>
            <div>
              <p className="text-[17px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{u.t}</p>
              <p className="text-[15px] leading-relaxed mt-1" style={{ color: "var(--text-2)" }}>{u.d}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

// ─── Supporters wall ─────────────────────────────────────────────────────────

function SupportersBoard({ data, loading, youAddress }: { data: BoardData | null; loading: boolean; youAddress?: string }) {
  const { ranked, founding } = useRanked(data);
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="board-h">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="board-h" className="font-bold" style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", letterSpacing: "-0.035em", color: "var(--text-1)" }}>
            Supporters
          </h2>
          <p className="text-[15px] mt-1" style={{ color: "var(--text-3)" }}>
            {data && data.donors.length > 0
              ? `${data.donors.length} ${data.donors.length === 1 ? "supporter" : "supporters"} · ${data.donationCount} ${data.donationCount === 1 ? "contribution" : "contributions"}`
              : "Every contribution, read from the chain."}
          </p>
        </div>
        <a
          href={`${EXPLORER}/address/${SUPPORT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold shrink-0 rounded pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ color: "var(--text-3)" }}
        >
          Verify on the explorer
          <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      </div>

      {loading && !data ? (
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 skeleton rounded-full" />
              <div className="h-3.5 w-40 skeleton rounded" />
              <div className="h-3.5 w-20 skeleton rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <div className="mt-6 py-10 text-center rounded-2xl" style={{ border: "1px dashed var(--border)" }}>
          <p className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>No names on the board yet.</p>
          <p className="text-[15px] mt-1" style={{ color: "var(--text-3)" }}>The first one is the most fun to be.</p>
        </div>
      ) : (
        <ol className="mt-5">
          {ranked.map((d, i) => {
            const you = !!youAddress && d.address === youAddress.toLowerCase();
            return (
              <motion.li
                key={d.address}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4 py-4"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <span
                  className="w-6 shrink-0 text-[15px] font-bold tabular-nums text-right"
                  style={{ color: i === 0 ? "var(--vezo-red-text)" : "var(--text-3)" }}
                >
                  {i + 1}
                </span>
                <Avatar address={d.address} label={d.display} anon={d.anon} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[16px] font-semibold" style={{ color: d.anon ? "var(--text-2)" : "var(--text-1)" }}>
                    <span className={d.mono ? "font-mono text-[15px]" : ""}>{d.display}</span>
                    {you && <span className="ml-2 text-[14px] font-semibold" style={{ color: "var(--vezo-red-text)" }}>you</span>}
                  </p>
                  <p className="text-[14px] tabular-nums mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                    {founding.has(d.address) && (
                      <span className="font-semibold" style={{ color: "var(--vezo-red-text)" }}>Founding supporter · </span>
                    )}
                    {(["BTC", "MEZO", "MUSD"] as const)
                      .filter((t) => BigInt(d[t]) > 0n)
                      .map((t) => `${fmtAmount(BigInt(d[t]))} ${t}`)
                      .join(" · ")}
                    {timeAgo(d.lastAt) ? ` · ${timeAgo(d.lastAt)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[17px] font-bold tabular-nums" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                  {d.usd > 0 ? fmtUsd(d.usd) : "—"}
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SupportClient() {
  const { address } = useAccount();
  const { data, loading, refetch } = useBoard();
  // Optimistic entries carry the server-side amount seen at donation time, so
  // each one retires exactly when the chain-backed board absorbs it (token
  // amounts only ever grow).
  const [localDonors, setLocalDonors] = useState<(Donor & { baseline: string })[]>([]);
  const reduced = useReducedMotion();
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<BoardData | null>(null);
  dataRef.current = data;
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInView = useInView(panelRef, { margin: "0px 0px -80px 0px" });
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 480);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const [request, setRequest] = useState<{ usd: number; n: number } | null>(null);
  const pickFromHero = useCallback((usd: number) => {
    setRequest((r) => ({ usd, n: (r?.n ?? 0) + 1 }));
    // On phones the panel sits below; on desktop it is already beside the hero.
    if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced]);

  const toPanel = useCallback(() => {
    panelRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced]);

  const donatedToken = (d: Donor): SupportToken =>
    d.BTC !== "0" ? "BTC" : d.MEZO !== "0" ? "MEZO" : "MUSD";

  const onDonated = useCallback(
    (d: Donor) => {
      const t = donatedToken(d);
      const serverNow = dataRef.current?.donors.find((x) => x.address === d.address)?.[t] ?? "0";
      setLocalDonors((prev) => [...prev, { ...d, baseline: serverNow }]);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(refetch, 8000);
    },
    [refetch]
  );
  useEffect(() => () => { if (refetchTimer.current) clearTimeout(refetchTimer.current); }, []);

  const merged: BoardData | null = useMemo(() => {
    if (!data && localDonors.length === 0) return data;
    const base: BoardData = data ?? { donors: [], totals: { BTC: "0", MEZO: "0", MUSD: "0" }, donationCount: 0 };
    if (localDonors.length === 0) return base;
    const donors = base.donors.map((d) => ({ ...d }));
    const totals = { BTC: BigInt(base.totals.BTC), MEZO: BigInt(base.totals.MEZO), MUSD: BigInt(base.totals.MUSD) };
    const pending = { BTC: 0n, MEZO: 0n, MUSD: 0n };
    let extraCount = 0;
    for (const ld of localDonors) {
      const t = donatedToken(ld);
      const existing = donors.find((d) => d.address === ld.address);
      // Server already absorbed this donation — the optimistic copy retires.
      if (existing && BigInt(existing[t]) > BigInt(ld.baseline)) continue;
      if (existing) {
        existing[t] = (BigInt(existing[t]) + BigInt(ld[t])).toString();
        existing.count += 1;
        existing.lastAt = ld.lastAt;
        if (ld.name || ld.anon) { existing.name = ld.name; existing.anon = ld.anon; }
        existing.usd = undefined; // revalue at live prices until the server absorbs it
      } else {
        const { baseline: _b, ...donor } = ld;
        donors.push(donor);
      }
      totals[t] += BigInt(ld[t]);
      pending[t] += BigInt(ld[t]);
      extraCount += 1;
    }
    return {
      ...base,
      pending: { BTC: pending.BTC.toString(), MEZO: pending.MEZO.toString(), MUSD: pending.MUSD.toString() },
      donors,
      totals: { BTC: totals.BTC.toString(), MEZO: totals.MEZO.toString(), MUSD: totals.MUSD.toString() },
      donationCount: base.donationCount + extraCount,
    };
  }, [data, localDonors]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    // Two columns on desktop: the story scrolls on the left while the ask
    // stays pinned on the right. On phones the order is hero, panel, story,
    // and a slim bar brings the panel back once it scrolls away.
    <div className="max-w-[1180px] mx-auto px-4 md:px-10 pt-32 md:pt-36 pb-28 lg:pb-16 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-x-14 gap-y-14 items-start">
      <motion.div {...rise(0)} className="min-w-0">
        <h1
          className="font-bold"
          style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)", letterSpacing: "-0.05em", lineHeight: 1.02, color: "var(--text-1)", textWrap: "balance" }}
        >
          Help shape what Vezo builds next
        </h1>
        <p className="mt-5 leading-relaxed max-w-[54ch]" style={{ color: "var(--text-2)", fontSize: "clamp(1.06rem, 1.5vw, 1.2rem)" }}>
          Vezo takes a flat 1% of each sale, and that&apos;s all. Your support goes into new
          features and into making Vezo more useful for everyone holding a veNFT on Mezo,
          without raising that fee. Any amount, in BTC, MEZO, or MUSD.
        </p>
        <RaisedMeter data={merged} onPick={pickFromHero} />
      </motion.div>

      <motion.div
        {...rise(0.12)}
        ref={panelRef}
        className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1 lg:row-span-5 lg:sticky lg:top-24 scroll-mt-24"
        id="back"
      >
        <DonatePanel onDonated={onDonated} request={request} />
        <AddressBlock />
      </motion.div>

      <div className="min-w-0 lg:col-start-1"><TrackRecord /></div>
      <div className="min-w-0 lg:col-start-1"><WhereItGoes /></div>
      <div className="min-w-0 lg:col-start-1">
        <SupportersBoard data={merged} loading={loading} youAddress={address} />
      </div>
      <div className="min-w-0 lg:col-start-1"><ProjectBackers /></div>

      {/* Phones: bring the ask back without scrolling up */}
      <AnimatePresence>
        {scrolled && !panelInView && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="lg:hidden fixed left-3 right-3 z-30"
            style={{ bottom: "calc(58px + env(safe-area-inset-bottom) + 10px)" }}
          >
            <button
              onClick={toPanel}
              className="btn-brand w-full min-h-[52px] rounded-2xl text-[16px] font-bold inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
              style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}
            >
              <Heart style={{ width: 16, height: 16, fill: "currentColor" }} />
              Back Vezo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
