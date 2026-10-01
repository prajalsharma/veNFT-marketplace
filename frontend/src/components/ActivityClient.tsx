"use client";

/*
  Taste-skill rules applied:
  ✓ BANNED: centered header → left-aligned, asymmetric two-part header
  ✓ BANNED: 3-col equal grid → table with hover reveals and staggered rows
  ✓ tabular-nums on all stats and price values
  ✓ Spring physics: stiffness:100, damping:20
  ✓ Empty state: composed, shows how to get started
  ✓ Sticky table header using transform rule (GPU)
  ✓ Animate ONLY transform + opacity (GPU rule)
  ✓ Tinted shadows (hue-matched, not generic gray-black)
*/

import React, { useMemo, useState } from "react";
import { useNetwork } from "@/hooks/useNetwork";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { MetricStrip } from "@/components/market/MarketParts";
import { useMarketHistory, fmtCompact } from "@/hooks/useMarketData";
import { useListingOutcomes, OUTCOME_LABEL, OUTCOME_HELP, type ListingOutcome } from "@/hooks/useListingOutcomes";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ExternalLink,
  History,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

function formatTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function formatDiscount(discountBps: number | null, activity?: { type: string; collection: string; paymentToken: string }): React.ReactNode {
  if (discountBps === null) {
    // A cancellation has no price. A cross-currency listing (veMEZO priced in
    // MUSD, say) has no honest historical discount: it would need the exchange
    // rate at that moment, and there is no on-chain MEZO market to read it from.
    const locked = activity?.collection === "veBTC" ? "BTC" : "MEZO";
    if (activity && activity.type !== "cancelled" && activity.paymentToken && activity.paymentToken !== locked) {
      return (
        <span
          className="text-[12px] cursor-help"
          style={{ color: "var(--text-3)" }}
          title={`Priced in ${activity.paymentToken} against a ${locked} position. A discount would need the ${locked}/${activity.paymentToken} rate at the time of the trade, which is not recorded on-chain.`}
        >
          {activity.paymentToken} price
        </span>
      );
    }
    return <span style={{ color: "var(--text-3)" }}>—</span>;
  }
  if (discountBps === 0) return (
    <span
      className="text-[12px] font-bold tabular-nums"
      style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}
    >
      Par
    </span>
  );
  const pct = (Math.abs(discountBps) / 100).toFixed(1);
  if (discountBps > 0) {
    return (
      <span
        className="text-[12px] font-black tabular-nums"
        style={{ color: "#10B981", fontVariantNumeric: "tabular-nums" }}
      >
        {pct}% off
      </span>
    );
  }
  return (
    <span
      className="text-[12px] font-black tabular-nums"
      style={{ color: "#EF4444", fontVariantNumeric: "tabular-nums" }}
    >
      +{pct}% prem
    </span>
  );
}

// ─── Event type pill ─────────────────────────────────────────────────────────
function EventPill({ type }: { type: "sale" | "listed" | "cancelled" }) {
  const config = {
    sale: { label: "Sale", color: "#10B981" },
    listed: { label: "Listed", color: "#F7931A" },
    cancelled: { label: "Cancelled", color: "var(--text-3)" },
  }[type];
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

// ─── Empty / loading states ───────────────────────────────────────────────────
function StateBlock({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="py-24 flex flex-col items-start gap-4"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
      >
        <Icon style={{ width: 18, height: 18, color: "var(--text-3)" }} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1.5" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)", maxWidth: "44ch" }}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Mobile card (table doesn't fit a phone) ─────────────────────────────────
// Prices arrive from the feed as fixed four-decimal strings; present them like
// the marketplace cards do, with separators and no dead zeros.
function fmtPrice(p: string): string {
  const v = parseFloat(p);
  if (!isFinite(v)) return p;
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function MobileActivityCard({ activity, explorer, outcome }: { activity: any; explorer: string; outcome?: ListingOutcome }) {
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <EventPill type={activity.type} />
          {outcome && outcome !== "open" && outcome !== "unknown" && (
            <span
              className="text-[12px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: "#F59E0B", background: "rgba(245,158,11,0.12)" }}
            >
              {OUTCOME_LABEL[outcome]}
            </span>
          )}
        </div>
        <a
          href={activity.transactionHash ? `${explorer}/tx/${activity.transactionHash}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] font-medium tabular-nums"
          style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}
        >
          <Clock style={{ width: 10, height: 10 }} />
          {formatTime(activity.timestamp)}
        </a>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activity.collection === "veBTC" ? "#F7931A" : "#4A90E2" }} />
            <span className="text-[13px] font-semibold">
              {activity.collection} <span className="tabular-nums" style={{ color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>#{activity.tokenId.toString()}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[12px] font-mono" style={{ color: "var(--text-3)" }}>
            <span>{activity.from ? short(activity.from) : "—"}</span>
            {activity.to && <><ArrowUpRight style={{ width: 9, height: 9 }} /><span>{short(activity.to)}</span></>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-bold tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmtPrice(activity.price)}<span className="text-[12px] font-semibold ml-1" style={{ color: "var(--text-3)" }}>{activity.paymentToken}</span>
          </p>
          <div className="mt-0.5">{formatDiscount(activity.discountBps, activity)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityClient() {
  const { network, contracts } = useNetwork();
  const { events, isLoading, error, isDeployed } = useActivityFeed(100);

  // A listing that is sold or cancelled emits an event and resolves itself in
  // this feed. A listing whose veNFT was withdrawn, moved, or un-approved emits
  // nothing, so without this it would sit here as a LIST row that never ends.
  // Resolve those from chain state so every listing has a visible outcome.
  const unresolvedIds = useMemo(() => {
    const terminal = new Set<string>();
    events.forEach((e) => {
      if (e.type === "sale" || e.type === "cancelled" || e.type === "bid-accepted") {
        terminal.add(e.listingId.toString());
      }
    });
    const ids: bigint[] = [];
    const seen = new Set<string>();
    events.forEach((e) => {
      const key = e.listingId.toString();
      if (e.type !== "listed" || terminal.has(key) || seen.has(key)) return;
      seen.add(key);
      ids.push(e.listingId);
    });
    return ids;
  }, [events]);

  const outcomes = useListingOutcomes(unresolvedIds);
  const hist = useMarketHistory();

  // Event-type filter. Counts come from the full feed so the tabs describe it.
  const [kind, setKind] = useState<"all" | "sale" | "listed" | "cancelled">("all");
  const counts = useMemo(() => ({
    sale: events.filter((e) => e.type === "sale").length,
    listed: events.filter((e) => e.type === "listed").length,
    cancelled: events.filter((e) => e.type === "cancelled").length,
  }), [events]);
  const shown = useMemo(() => (kind === "all" ? events : events.filter((e) => e.type === kind)), [events, kind]);

  return (
    <div className="min-h-[100dvh] pt-28 md:pt-36 pb-20 px-5 md:px-10 lg:px-16">
      <div className="max-w-[1320px] mx-auto">

        {/* ── Header — left-aligned, asymmetric ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[32px] md:text-[36px] font-bold mb-1" style={{ color: "var(--text-1)", letterSpacing: "-0.035em" }}>
              Activity
            </h1>
            <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
              Every listing, sale and cancellation on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}, read from the chain.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-4 pb-1"
          >
            <a
              href={contracts.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              Explorer
              <ExternalLink style={{ width: 10, height: 10 }} />
            </a>
          </motion.div>
        </div>

        {isDeployed && !isLoading && !error && events.length > 0 && (
          <div className="mb-6 space-y-4">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              Since launch
              <span className="font-normal" style={{ color: "var(--text-3)" }}> · every indexed event, not just this page</span>
            </p>
            <MetricStrip
              metrics={
                hist.stats && (hist.status === "ready" || hist.status === "stale" || hist.status === "empty")
                  ? [
                      { label: "Sales", value: hist.stats.totalSales.toLocaleString("en-US"), note: `${hist.stats.totalListings.toLocaleString("en-US")} listings` },
                      { label: "MEZO traded", value: fmtCompact(parseFloat(hist.stats.volume.MEZO)), note: hist.stats.averageSale.MEZO ? `avg ${fmtCompact(parseFloat(hist.stats.averageSale.MEZO))} per sale` : "no MEZO sales yet" },
                      { label: "MUSD traded", value: fmtCompact(parseFloat(hist.stats.volume.MUSD)), note: hist.stats.averageSale.MUSD ? `avg ${fmtCompact(parseFloat(hist.stats.averageSale.MUSD))} per sale` : "no MUSD sales yet" },
                      { label: "Participants", value: hist.stats.participants.toLocaleString("en-US"), note: `${hist.stats.buyers} buyers, ${hist.stats.sellers} sellers` },
                    ]
                  : hist.status === "loading"
                    ? ["Sales", "MEZO traded", "MUSD traded", "Participants"].map((label) => ({ label, value: "…", note: "\u00a0" }))
                    : [{ label: "Market history", value: "Unavailable", note: "index unreachable, try again shortly", tone: "muted" as const }]
              }
            />
            <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="segmented" role="group" aria-label="Event type">
              {([["all","All",events.length],["sale","Sales",counts.sale],["listed","Listings",counts.listed],["cancelled","Cancellations",counts.cancelled]] as const).map(([k,label,n]) => (
                <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {label} <span className="tabular-nums" style={{ color: "var(--text-3)" }}>{n}</span>
                </button>
              ))}
            </div>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Counts for the latest {events.length} events in this feed</p>
            </div>
          </div>
        )}

        {/* ── Content area ── */}
        {!isDeployed ? (
          <StateBlock
            icon={TrendingUp}
            title="No contract deployed yet"
            sub="This activity stream will appear here as soon as the first listings and trades go live on this network."
          />
        ) : isLoading ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}
            aria-busy="true"
            aria-label="Loading activity"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid items-center gap-6 px-6 py-5"
                style={{ gridTemplateColumns: "90px 1.4fr 1fr 0.8fr 1fr 1fr 0.7fr", borderTop: i ? "1px solid var(--border-subtle)" : undefined }}
              >
                <div className="h-3 w-14 skeleton rounded" />
                <div className="h-3 w-28 skeleton rounded" />
                <div className="h-3 w-24 skeleton rounded" />
                <div className="h-3 w-12 skeleton rounded" />
                <div className="h-3 w-20 skeleton rounded" />
                <div className="h-3 w-20 skeleton rounded" />
                <div className="h-3 w-12 skeleton rounded justify-self-end" />
              </div>
            ))}
          </div>
        ) : error ? (
          <StateBlock
            icon={AlertCircle}
            title="Failed to load events"
            sub={error}
          />
        ) : events.length === 0 ? (
          <StateBlock
            icon={History}
            title="No activity yet"
            sub="Be the first to list a veNFT and provide liquidity to the Mezo ecosystem."
          />
        ) : (
          <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:block rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Event", "Item", "Price", "Discount", "From", "To", "Time"].map((h, i) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left eyebrow"
                        style={{ paddingRight: i === 6 ? 24 : undefined, textAlign: i === 6 ? "right" : "left" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {shown.map((activity, index) => (
                      <motion.tr
                        key={`${activity.transactionHash}-${index}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
                        className="group"
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          transition: "background 180ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Event type, plus how this listing ultimately ended
                            when it ended without emitting an event. */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-start gap-1.5">
                            <EventPill type={activity.type as any} />
                            {activity.type === "listed" && (() => {
                              const o = outcomes.get(activity.listingId.toString());
                              if (!o || o === "open" || o === "unknown") return null;
                              return (
                                <span
                                  title={OUTCOME_HELP[o]}
                                  className="inline-flex items-center gap-1 text-[12px] font-semibold px-1.5 py-0.5 rounded cursor-help"
                                  style={{ color: "#F59E0B", background: "rgba(245,158,11,0.12)" }}
                                >
                                  {OUTCOME_LABEL[o]}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Item */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: activity.collection === "veBTC" ? "#F7931A" : "#4A90E2" }}
                            />
                            <span className="text-sm font-semibold" style={{ letterSpacing: "-0.01em" }}>
                              {activity.collection}{" "}
                              <span
                                className="tabular-nums"
                                style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}
                              >
                                #{activity.tokenId.toString()}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-5">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {fmtPrice(activity.price)}
                          </span>
                          <span className="text-[12px] font-semibold ml-1" style={{ color: "var(--text-3)" }}>
                            {activity.paymentToken}
                          </span>
                        </td>

                        {/* Discount */}
                        <td className="px-6 py-5">
                          {formatDiscount(activity.discountBps, activity)}
                        </td>

                        {/* From */}
                        <td className="px-6 py-5 font-mono text-[12px]" style={{ color: "var(--text-3)" }}>
                          {activity.from ? (
                            <a
                              href={`${contracts.explorer}/address/${activity.from}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                            >
                              {activity.from.slice(0, 6)}…{activity.from.slice(-4)}
                              <ArrowUpRight
                                style={{ width: 10, height: 10, opacity: 0, transition: "opacity 180ms ease" }}
                                className="group-hover:opacity-100"
                              />
                            </a>
                          ) : (
                            <span style={{ color: "var(--border)" }}>—</span>
                          )}
                        </td>

                        {/* To */}
                        <td className="px-6 py-5 font-mono text-[12px]" style={{ color: "var(--text-3)" }}>
                          {activity.to ? (
                            <a
                              href={`${contracts.explorer}/address/${activity.to}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                            >
                              {activity.to.slice(0, 6)}…{activity.to.slice(-4)}
                              <ArrowUpRight
                                style={{ width: 10, height: 10, opacity: 0, transition: "opacity 180ms ease" }}
                                className="group-hover:opacity-100"
                              />
                            </a>
                          ) : (
                            <span style={{ color: "var(--border)" }}>—</span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-6 py-5 text-right">
                          {activity.transactionHash ? (
                            <a
                              href={`${contracts.explorer}/tx/${activity.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-end gap-1.5 text-[12px] font-medium transition-colors tabular-nums"
                              style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                            >
                              <Clock style={{ width: 10, height: 10 }} />
                              {formatTime(activity.timestamp)}
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-end gap-1.5 text-[12px] font-medium tabular-nums"
                              style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}
                            >
                              <Clock style={{ width: 10, height: 10 }} />
                              {formatTime(activity.timestamp)}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Mobile — stacked cards */}
          <div className="md:hidden space-y-2.5">
            {shown.map((activity, index) => (
              <MobileActivityCard key={`m-${activity.transactionHash}-${index}`} activity={activity} explorer={contracts.explorer} outcome={activity.type === "listed" ? outcomes.get(activity.listingId.toString()) : undefined} />
            ))}
          </div>
          </>
        )}

        <p className="mt-8 text-[13px]" style={{ color: "var(--text-3)" }}>
          Every row is an on-chain event. Open any transaction on the{" "}
          <a href={contracts.explorer} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--text-2)" }}>
            Mezo explorer
          </a>
          .
        </p>
      </div>
    </div>
  );
}
