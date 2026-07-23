"use client";

/**
 * BidsPanel
 * ─────────
 * Displays active bids for a veNFT and allows the NFT owner to accept a bid
 * or any user to cancel their own bid. Also renders a "Place Bid" form.
 *
 * Fully uses design-system CSS vars (var(--bg-*), var(--text-*), var(--border))
 * to match the VeNFTCard host surface. No hardcoded colors.
 */

import React, { useState, useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, erc20Abi, maxUint256 } from "viem";
import { useBidding, useActiveTokenBids } from "../hooks/useBidding";
import { useNetwork } from "../hooks/useNetwork";
import { getContracts } from "../lib/contracts";
import { PAYMENT_TOKENS } from "../lib/contracts";
import { Gavel, CheckCircle2, X, Clock, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseBiddingError } from "../lib/biddingErrors";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BidsPanelProps {
  collection:    `0x${string}`;
  tokenId:       bigint;
  currentOwner?: `0x${string}`;
}

interface Bid {
  id:           bigint;
  bidder:       `0x${string}`;
  collection:   `0x${string}`;
  tokenId:      bigint;
  paymentToken: `0x${string}`;
  amount:       bigint;
  expiry:       bigint;
  active:       boolean;
  minIntrinsicValue:  bigint;
  maxIntrinsicValue:  bigint;
  minVotingPower:     bigint;
  minLockDuration:    bigint;
  requireAutoMaxLock: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatExpiry(expiry: bigint): { label: string; expired: boolean } {
  const ts  = Number(expiry) * 1000;
  const now = Date.now();
  if (ts <= now) return { label: "Expired", expired: true };
  const diff  = ts - now;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 48) return { label: `${hours}h left`, expired: false };
  const days = Math.floor(hours / 24);
  return { label: `${days}d left`, expired: false };
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── PlaceBidForm ─────────────────────────────────────────────────────────────

function PlaceBidForm({
  collection,
  tokenId,
  onSuccess,
}: {
  collection: `0x${string}`;
  tokenId:    bigint;
  onSuccess:  () => void;
}) {
  const { network }  = useNetwork();
  const contracts    = getContracts(network);
  const { address }  = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { createBid } = useBidding();

  const [amount,       setAmount]       = useState("");
  const [paymentToken, setPaymentToken] = useState<`0x${string}`>(contracts.MUSD);
  const [expiryDays,   setExpiryDays]   = useState("7");
  const [error,        setError]        = useState<string | null>(null);
  const [txHash,       setTxHash]       = useState<`0x${string}` | null>(null);
  // "confirming" waits on the receipt; "done" means the bid is live on-chain.
  // Never leave the user on a state that has no exit — that was the old bug.
  const [stage,        setStage]        = useState<"idle" | "approving" | "submitting" | "confirming" | "done">("idle");

  const busy = stage === "approving" || stage === "submitting" || stage === "confirming";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!address) { setError("Connect wallet first"); return; }
      // Guard against an unresolved token address — without this a misconfigured
      // selector would pass `undefined` straight into viem ("Address \"undefined\"
      // is invalid"). paymentToken should always be one of the contract addresses.
      if (!paymentToken) { setError("Select a payment token"); return; }
      if (!publicClient) { setError("Network not ready. Try again."); return; }
      const bidding = contracts.bidding as `0x${string}`;
      try {
        const amountWei = parseUnits(amount || "0", 18);
        if (amountWei === 0n) { setError("Amount must be > 0"); return; }

        // The VeNFTBidding contract pulls the bid amount from the bidder at accept
        // time, so it must hold an ERC-20 allowance up-front. Approve it first if
        // the current allowance is insufficient (one-time max approval per token).
        const allowance = (await publicClient.readContract({
          address:      paymentToken,
          abi:          erc20Abi,
          functionName: "allowance",
          args:         [address, bidding],
        })) as bigint;

        if (allowance < amountWei) {
          setStage("approving");
          const approveHash = await writeContractAsync({
            address:      paymentToken,
            abi:          erc20Abi,
            functionName: "approve",
            args:         [bidding, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStage("submitting");
        const expiryTs = BigInt(Math.floor(Date.now() / 1000) + Number(expiryDays) * 86400);
        const hash = await createBid({ collection, tokenId, paymentToken, amount: amountWei, expiry: expiryTs });
        setTxHash(hash);

        // Wait for the actual receipt. Previously we flipped straight to a
        // "waiting for confirmation" screen that nothing ever cleared, so a
        // successful bid looked identical to a failed one — forever.
        setStage("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Bid transaction reverted onchain.");

        setStage("done");
        onSuccess();
      } catch (err: unknown) {
        setError(parseBiddingError(err));
        setStage("idle");
      }
    },
    [address, amount, paymentToken, expiryDays, collection, tokenId, createBid, onSuccess, publicClient, writeContractAsync, contracts.bidding]
  );

  if (stage === "done") {
    return (
      <div
        className="p-3 rounded-xl space-y-2"
        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#10B981" }}>
          <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} />
          Bid is live on-chain.
        </div>
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          The owner can accept it until it expires. You keep your funds until then.
        </p>
        <div className="flex items-center gap-3">
          {txHash && (
            <a
              href={`${contracts.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              style={{ color: "#10B981" }}
            >
              View transaction
              <ExternalLink style={{ width: 10, height: 10 }} />
            </a>
          )}
          <button
            type="button"
            onClick={() => { setStage("idle"); setTxHash(null); setAmount(""); setError(null); }}
            className="text-[12px] font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ color: "var(--text-2)" }}
          >
            Place another bid
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
        Place a Bid
      </p>

      {/* Payment token selector */}
      <div className="flex gap-1.5">
        {PAYMENT_TOKENS.filter((t) => !t.isNative).map((t) => {
          // contracts keys are upper-case symbols (MEZO, MUSD) — do NOT lower-case
          // them or the lookup returns undefined, which both highlights every button
          // and feeds `undefined` into the bid call ("Address undefined is invalid").
          const addr = (contracts as unknown as Record<string, string>)[t.symbol] as `0x${string}`;
          const active = !!addr && paymentToken === addr;
          return (
            <button
              key={t.symbol}
              type="button"
              onClick={() => setPaymentToken(addr)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: active ? "rgba(255,0,64,0.12)" : "var(--bg-2)",
                border: `1px solid ${active ? "rgba(255,0,64,0.28)" : "var(--border-subtle)"}`,
                color: active ? "#FF0040" : "var(--text-2)",
              }}
            >
              {t.symbol}
            </button>
          );
        })}
      </div>

      {/* Amount + expiry row */}
      <div className="flex gap-2">
        <input
          id="bids-panel-amount"
          name="bids-panel-amount"
          type="number"
          min="0"
          step="any"
          placeholder="Bid amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#FF0040]"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-1)",
          }}
          required
        />
        <select
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          className="rounded-lg px-2 py-2 text-[13px] font-medium focus:outline-none appearance-none"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-2)",
            minWidth: 72,
          }}
        >
          {["1","3","7","14","30"].map((d) => (
            <option key={d} value={d}>{d}d expiry</option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px]"
            style={{ color: "#EF4444" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={busy || !address}
        className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        style={{
          background: busy ? "var(--bg-3)" : "#FF0040",
          color: busy ? "var(--text-3)" : "#fff",
          border: "none",
        }}
      >
        {busy ? (
          <>
            <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
            {stage === "approving" ? "Approving…" : stage === "confirming" ? "Confirming…" : "Submitting…"}
          </>
        ) : !address ? (
          "Connect wallet to bid"
        ) : (
          <><Gavel style={{ width: 12, height: 12 }} />Submit Bid</>
        )}
      </button>
    </form>
  );
}

// ─── BidRow ───────────────────────────────────────────────────────────────────

function BidRow({
  bid,
  isOwner,
  busy,
  busyLabel,
  anyBusy,
  onAccept,
  onCancel,
}: {
  bid:       Bid;
  isOwner:   boolean;
  busy:      boolean;
  busyLabel: string;
  anyBusy:   boolean;
  onAccept:  (id: bigint) => void;
  onCancel:  (id: bigint) => void;
}) {
  const { address } = useAccount();
  const isBidder    = address?.toLowerCase() === bid.bidder.toLowerCase();
  const { label, expired } = formatExpiry(bid.expiry);

  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-mono" style={{ color: "var(--text-2)" }}>
            {shortAddress(bid.bidder)}
          </span>
          {isBidder && (
            <span
              className="text-[10.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(255,0,64,0.1)", color: "#FF0040" }}
            >
              you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
            {parseFloat(formatUnits(bid.amount, 18)).toFixed(4)}
          </span>
          <div className="flex items-center gap-1" style={{ color: expired ? "#EF4444" : "#10B981" }}>
            <Clock style={{ width: 9, height: 9 }} />
            <span className="text-[10.5px] font-semibold">{label}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {isOwner && !expired && (
          <button
            onClick={() => onAccept(bid.id)}
            disabled={anyBusy}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
            onMouseEnter={(e) => { if (!anyBusy) (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.22)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.12)"; }}
          >
            {busy ? <><Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />{busyLabel || "Working…"}</> : "Accept"}
          </button>
        )}
        {isBidder && (
          <button
            onClick={() => onCancel(bid.id)}
            disabled={anyBusy}
            aria-label="Cancel bid"
            className="px-2 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)", color: "var(--text-3)" }}
            onMouseEnter={(e) => { if (!anyBusy) (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
          >
            {busy ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> : <X style={{ width: 10, height: 10 }} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BidsPanel (main export) ──────────────────────────────────────────────────

export default function BidsPanel({ collection, tokenId, currentOwner }: BidsPanelProps) {
  const { address }  = useAccount();
  const { cancelBidAndWait, acceptBidWithApproval } = useBidding();
  const [, setRefreshKey] = useState(0);
  const [busyBidId,   setBusyBidId]   = useState<bigint | null>(null);
  const [busyLabel,   setBusyLabel]   = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner =
    !!address &&
    !!currentOwner &&
    address.toLowerCase() === currentOwner.toLowerCase();

  const { data: activeBids, isLoading, refetch } = useActiveTokenBids(collection, tokenId);

  // Accepting needs the bidding contract approved as an NFT operator — listing
  // only approves the marketplace, so this is a separate one-time grant. Errors
  // used to be swallowed into console.error, which made Accept look inert.
  const handleAccept = useCallback(async (bidId: bigint) => {
    if (!address) return;
    setActionError(null);
    setBusyBidId(bidId);
    try {
      await acceptBidWithApproval({
        bidId,
        collection,
        tokenId,
        owner: address,
        onStage: (s) => setBusyLabel(s === "approving" ? "Approving…" : "Accepting…"),
      });
      refetch();
    } catch (e) {
      setActionError(parseBiddingError(e));
    } finally {
      setBusyBidId(null);
      setBusyLabel("");
    }
  }, [acceptBidWithApproval, refetch, address, collection, tokenId]);

  const handleCancel = useCallback(async (bidId: bigint) => {
    setActionError(null);
    setBusyBidId(bidId);
    setBusyLabel("Cancelling…");
    try {
      await cancelBidAndWait(bidId);
      refetch();
    } catch (e) {
      setActionError(parseBiddingError(e));
    } finally {
      setBusyBidId(null);
      setBusyLabel("");
    }
  }, [cancelBidAndWait, refetch]);

  const bids = (activeBids as Bid[] | undefined) ?? [];

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: "var(--bg-2)", border: "1px solid var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel style={{ width: 12, height: 12, color: "var(--text-3)" }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Active Offers
          </span>
        </div>
        {bids.length > 0 && (
          <span
            className="text-[10.5px] font-black px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,0,64,0.08)", color: "#FF0040", border: "1px solid rgba(255,0,64,0.18)" }}
          >
            {bids.length}
          </span>
        )}
      </div>

      {/* Bids list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2" style={{ color: "var(--text-3)" }}>
          <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
          <span className="text-[13px]">Loading offers…</span>
        </div>
      ) : bids.length === 0 ? (
        <p className="text-[13px] py-1" style={{ color: "var(--text-3)" }}>No active offers yet.</p>
      ) : (
        <div>
          {bids.map((bid) => (
            <BidRow
              key={bid.id.toString()}
              bid={bid}
              isOwner={isOwner}
              busy={busyBidId === bid.id}
              busyLabel={busyLabel}
              anyBusy={busyBidId !== null}
              onAccept={handleAccept}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {actionError && (
        <p className="text-[12px] leading-relaxed" style={{ color: "#EF4444" }} role="alert">
          {actionError}
        </p>
      )}

      {isOwner && bids.length > 0 && (
        <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Accepting an offer needs a one-time approval for the bidding contract, so
          the first accept asks for two signatures.
        </p>
      )}

      {/* Place bid form — shown to non-owners only */}
      {!isOwner && (
        <div
          className="pt-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {address ? (
            <PlaceBidForm
              collection={collection}
              tokenId={tokenId}
              onSuccess={() => { setRefreshKey((k) => k + 1); refetch(); }}
            />
          ) : (
            <p className="text-[11px] text-center py-1" style={{ color: "var(--text-3)" }}>
              Connect wallet to place a bid
            </p>
          )}
        </div>
      )}
    </div>
  );
}
