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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Heart,
  Loader2,
} from "lucide-react";
import { CONTRACTS } from "@/lib/contracts";
import { mezoMainnet } from "@/lib/wagmi";
import { usePriceTicker } from "@/hooks/usePriceTicker";
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
  lastAt: string | null;
}

interface BoardData {
  donors: Donor[];
  totals: { BTC: string; MEZO: string; MUSD: string };
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

function DonatePanel({ onDonated }: { onDonated: (d: Donor) => void }) {
  const { address, chainId: walletChain } = useAccount();
  const publicClient = usePublicClient({ chainId: mezoMainnet.id });
  const { sendTransactionAsync } = useSendTransaction();
  const { switchToMainnet } = useNetwork();
  const prices = usePriceTicker();

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

  if (stage === "done") {
    return (
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-1)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 style={{ width: 18, height: 18, color: "#10B981" }} />
          <p className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>
            That&apos;s on-chain. Thank you.
          </p>
        </div>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {anon
            ? "You'll show on the board as an anonymous supporter."
            : sanitizeName(name)
            ? `"${sanitizeName(name)}" is now written into the transaction itself. It'll appear on the board within a minute.`
            : "Your contribution will appear on the board within a minute."}
        </p>
        <div className="flex items-center gap-4">
          {txHash && (
            <a
              href={`${EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={{ color: "#10B981" }}
            >
              View transaction <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
          <button
            onClick={() => { setStage("idle"); setTxHash(null); setError(null); }}
            className="text-[13px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-2)" }}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Heart style={{ width: 15, height: 15, color: "#FF0040", fill: "#FF0040" }} />
          <h2 className="text-[17px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            Back the build
          </h2>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          The Mezo-native way to buy us a coffee. Straight to the team wallet, in the open.
        </p>
      </div>

      {/* Token selector */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TOKEN_META) as SupportToken[]).map((t) => {
          const active = token === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => pickToken(t)}
              aria-pressed={active}
              className="flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={
                active
                  ? { background: "rgba(255,0,64,0.07)", border: "1px solid rgba(255,0,64,0.3)", color: "var(--text-1)" }
                  : { background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: TOKEN_META[t].dot }} />
              {t}
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {USD_PRESETS.map((u) => {
            const active = usdPick === u;
            return (
              <button
                key={u}
                type="button"
                onClick={() => pickUsd(u)}
                aria-pressed={active}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={
                  active
                    ? { background: "rgba(255,0,64,0.09)", border: "1px solid rgba(255,0,64,0.35)", color: "#FF0040" }
                    : { background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }
                }
              >
                ${u}
              </button>
            );
          })}
          {!prices[token] && (
            <span className="text-[11px]" style={{ color: "var(--text-4)" }}>
              waiting for live prices…
            </span>
          )}
        </div>
        <div className="relative">
          <input
            id="support-amount"
            name="support-amount"
            aria-label={`Donation amount in ${token}`}
            type="number"
            min="0"
            step={meta.step}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setUsdPick(null); }}
            className="w-full rounded-xl pl-3.5 pr-16 py-3 text-[15px] font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#FF0040]"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-1)",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <span
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12.5px] font-bold pointer-events-none"
            style={{ color: "var(--text-3)" }}
          >
            {token}
          </span>
        </div>
        {usd !== null && (
          <p className="text-[12px] tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
            &#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD
          </p>
        )}
      </div>

      {/* Name / anonymity */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="support-name"
            name="support-name"
            aria-label="Name shown on the supporters board"
            type="text"
            maxLength={MAX_NAME_LEN}
            placeholder={anon ? "anon" : "Name on the board (optional)"}
            value={anon ? "" : name}
            disabled={anon}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium focus:outline-none focus:ring-1 focus:ring-[#FF0040] disabled:opacity-50"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-1)" }}
          />
          <button
            type="button"
            onClick={() => setAnon((a) => !a)}
            aria-pressed={anon}
            className="shrink-0 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={
              anon
                ? { background: "rgba(255,0,64,0.09)", border: "1px solid rgba(255,0,64,0.35)", color: "#FF0040" }
                : { background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }
            }
          >
            Stay anonymous
          </button>
        </div>
        <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-4)" }}>
          The name travels inside your own transaction. The board is rebuilt from the
          chain, not from a database we could edit.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[12.5px]"
            style={{ color: "#EF4444" }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA — connect / switch / send */}
      <ConnectButton.Custom>
        {({ account, openConnectModal, mounted }) => {
          const connected = mounted && !!account;
          if (!connected) {
            return (
              <button
                onClick={openConnectModal}
                className="w-full py-3 rounded-xl text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
                style={{ background: "var(--text-1)", color: "var(--bg)" }}
              >
                Connect wallet
              </button>
            );
          }
          if (!onMainnet) {
            return (
              <button
                onClick={switchToMainnet}
                className="w-full py-3 rounded-xl text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              >
                Switch to Mezo mainnet
              </button>
            );
          }
          return (
            <button
              onClick={send}
              disabled={busy}
              className="w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-2"
              style={{ background: busy ? "var(--bg-3)" : "#FF0040", color: busy ? "var(--text-3)" : "#fff" }}
            >
              {busy ? (
                <>
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                  {stage === "confirming" ? "Confirming…" : "Waiting for wallet…"}
                </>
              ) : (
                <>Send {amount || "0"} {token}</>
              )}
            </button>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}

// ─── Direct address block ────────────────────────────────────────────────────

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
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}
    >
      <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
        Prefer your own wallet?
      </p>
      <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: "var(--text-3)" }}>
        Send BTC, MEZO, or MUSD on the Mezo network directly. Anything that arrives
        here counts as support, because this wallet does nothing else.
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 min-w-0 truncate text-[12px] font-mono px-3 py-2.5 rounded-lg"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }}
        >
          {SUPPORT_ADDRESS}
        </code>
        <button
          onClick={copy}
          aria-label="Copy address"
          className="shrink-0 p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: copied ? "#10B981" : "var(--text-2)" }}
        >
          {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
        </button>
        <a
          href={`${EXPLORER}/address/${SUPPORT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on explorer"
          className="shrink-0 p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-2)" }}
        >
          <ExternalLink style={{ width: 14, height: 14 }} />
        </a>
      </div>
    </div>
  );
}

// ─── Supporters board ────────────────────────────────────────────────────────

function SupportersBoard({
  data,
  loading,
  youAddress,
}: {
  data: BoardData | null;
  loading: boolean;
  youAddress?: string;
}) {
  const prices = usePriceTicker();
  const reduced = useReducedMotion();

  const usdOf = useCallback(
    (d: { BTC: string; MEZO: string; MUSD: string }) => {
      const val = (wei: string, p: number | null) => (p ? parseFloat(formatEther(BigInt(wei))) * p : 0);
      return val(d.BTC, prices.BTC) + val(d.MEZO, prices.MEZO) + val(d.MUSD, prices.MUSD);
    },
    [prices]
  );

  const ranked = useMemo(() => {
    const donors = [...(data?.donors ?? [])].sort((a, b) => usdOf(b) - usdOf(a));
    let anonSeq = 0;
    return donors.map((d) => ({
      ...d,
      usd: usdOf(d),
      display: d.anon ? `anon${++anonSeq}` : d.name ?? shortAddr(d.address),
      mono: !d.anon && !d.name,
    }));
  }, [data, usdOf]);

  const totalUsd = data ? usdOf(data.totals) : 0;
  const tokenLine = data
    ? (["BTC", "MEZO", "MUSD"] as const)
        .filter((t) => BigInt(data.totals[t]) > 0n)
        .map((t) => `${fmtAmount(BigInt(data.totals[t]))} ${t}`)
        .join(" · ")
    : "";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="p-6 pb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            Supporters
          </h2>
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
            {data && data.donors.length > 0
              ? `${data.donors.length} ${data.donors.length === 1 ? "supporter" : "supporters"} · ${data.donationCount} ${data.donationCount === 1 ? "contribution" : "contributions"}`
              : "Every contribution, straight from the chain."}
          </p>
        </div>
        <a
          href={`${EXPLORER}/address/${SUPPORT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
          style={{ color: "var(--text-3)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
          on-chain
          <ExternalLink style={{ width: 10, height: 10 }} />
        </a>
      </div>

      {data && data.donors.length > 0 && (
        <div
          className="mx-6 mb-4 px-4 py-3 rounded-xl flex items-baseline justify-between gap-3 flex-wrap"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)" }}
        >
          <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            Raised so far
          </span>
          <span className="text-right">
            <span className="text-[16px] font-bold tabular-nums mr-2" style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
              &#8776; ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[12px] tabular-nums" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
              {tokenLine}
            </span>
          </span>
        </div>
      )}

      {loading && !data ? (
        <div className="px-6 pb-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-5 skeleton rounded" />
              <div className="h-3 w-32 skeleton rounded" />
              <div className="h-3 w-20 skeleton rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <div className="px-6 pb-8 pt-2 text-center">
          <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>
            No names on the board yet.
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
            The first one is the most fun to be.
          </p>
        </div>
      ) : (
        <div className="px-6 pb-4">
          {ranked.map((d, i) => {
            const you = youAddress && d.address === youAddress.toLowerCase();
            return (
              <motion.div
                key={d.address}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3.5 py-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <span
                  className="w-6 shrink-0 text-[13px] font-bold tabular-nums"
                  style={{ color: i === 0 ? "#FF0040" : i < 3 ? "var(--text-1)" : "var(--text-4)", fontVariantNumeric: "tabular-nums" }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-[14px] font-semibold ${d.mono ? "font-mono text-[12.5px]" : ""}`}
                      style={{ color: d.anon ? "var(--text-2)" : "var(--text-1)" }}
                    >
                      {d.display}
                    </span>
                    {you && (
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(255,0,64,0.1)", color: "#FF0040" }}
                      >
                        you
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] tabular-nums mt-0.5" style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                    {(["BTC", "MEZO", "MUSD"] as const)
                      .filter((t) => BigInt(d[t]) > 0n)
                      .map((t) => `${fmtAmount(BigInt(d[t]))} ${t}`)
                      .join(" · ")}
                    {timeAgo(d.lastAt) ? ` · ${timeAgo(d.lastAt)}` : ""}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[14px] font-bold tabular-nums"
                  style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}
                >
                  {d.usd > 0 ? `$${d.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
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
      } else {
        const { baseline: _b, ...donor } = ld;
        donors.push(donor);
      }
      totals[t] += BigInt(ld[t]);
      extraCount += 1;
    }
    return {
      donors,
      totals: { BTC: totals.BTC.toString(), MEZO: totals.MEZO.toString(), MUSD: totals.MUSD.toString() },
      donationCount: base.donationCount + extraCount,
    };
  }, [data, localDonors]);

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    // One two-column grid for the whole page: the donate panel sits beside the
    // hero from the very top (no dead space to the hero's right), and the
    // supporters board fills the left column beneath the hero. On mobile the
    // DOM order keeps the ask above the board: hero, panel, board.
    <div className="max-w-[1140px] mx-auto px-5 md:px-10 pt-24 md:pt-32 pb-8 grid lg:grid-cols-[minmax(0,1fr)_400px] gap-x-8 gap-y-8 items-start">
      {/* Hero */}
      <motion.div {...rise(0)} className="min-w-0 max-w-[720px] mb-2 lg:mb-4">
        <h1
          className="font-bold mb-5"
          style={{
            fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: "var(--text-1)",
            textWrap: "balance",
          }}
        >
          Like what you&apos;re seeing?
        </h1>
        <div
          className="space-y-4 leading-relaxed"
          style={{ color: "var(--text-2)", maxWidth: "60ch", fontSize: "clamp(1.02rem, 1.4vw, 1.13rem)" }}
        >
          <p>
            Vezo is the first secondary marketplace for veNFTs on Mezo, built and run
            by a small independent team. For the past six months we&apos;ve shipped the
            marketplace, on-chain bidding, cross-token checkout, and full
            documentation, had the contracts audited by the Mezo team, and kept it all
            running on mainnet since March.
          </p>
          <p>
            The platform is free beyond a minimal protocol fee, and this is how it
            stays that way. If Vezo found you a discount or moved a lock you were
            stuck with, a contribution of any size, in any of the three tokens, goes
            directly into keeping it maintained, audited, and improving.
          </p>
        </div>
        {/* Milestone receipts: a dated snapshot of the Dune numbers, hardcoded
            on purpose. It is a statement about a fixed window (mainnet launch
            to the as-of date), not a live feed; the Dune link below carries the
            live, verifiable version. Update the figures and the as-of date
            together. */}
        {/* Centered on purpose: a milestone reads as ceremony, not data. Proof
            sits directly between the story (reciprocity) and the ask (panel). */}
        <div
          className="mt-6 rounded-2xl px-6 py-7 text-center"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xs)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-5" style={{ color: "var(--text-3)" }}>
            March 16 &rarr; September 16, 2026 &middot; six months on mainnet
          </p>
          <div className="flex flex-wrap justify-center gap-x-9 gap-y-5 mb-5">
            {[
              { v: "56", l: "sales" },
              { v: "206", l: "veNFT listings" },
              { v: "61", l: "users" },
              { v: "560,989", l: "MEZO volume" },
              { v: "5,549", l: "MUSD volume" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p
                  className="font-bold tabular-nums leading-none"
                  style={{
                    fontSize: "clamp(1.45rem, 2.2vw, 1.7rem)",
                    color: "var(--text-1)",
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.v}
                </p>
                <p className="text-[12px] mt-1.5" style={{ color: "var(--text-3)" }}>{s.l}</p>
              </div>
            ))}
          </div>
          <a
            href="https://dune.com/vezo/vezo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "#FF0040" }}
          >
            <BarChart3 style={{ width: 13, height: 13, flexShrink: 0 }} />
            Live and verifiable on our Dune dashboard
            <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
          </a>
        </div>
      </motion.div>

      {/* Right column — the ask, level with the hero, sticky on scroll */}
      <motion.div
        {...rise(0.14)}
        className="min-w-0 space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24"
      >
        <DonatePanel onDonated={onDonated} />
        <AddressBlock />
      </motion.div>

      {/* Left column, below the hero */}
      <motion.div {...rise(0.08)} className="min-w-0 lg:col-start-1">
        <SupportersBoard data={merged} loading={loading} youAddress={address} />
      </motion.div>
    </div>
  );
}
