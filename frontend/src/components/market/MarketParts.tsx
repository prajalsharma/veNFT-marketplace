"use client";

// Building blocks for the marketplace page: the market summary strip, the
// persistent filter rail, the grid/table view toggle and the table view.

import { formatEther } from "viem";
import { LayoutGrid, Rows3 } from "lucide-react";
import type { Listing } from "@/hooks/useMarketplace";
import type { FilterState } from "@/components/FilterSidebar";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { CountdownCompact } from "@/components/CountdownTimer";
import { PositionGlyph } from "./PositionVisuals";
import { fmtAmount, GrantTag, DiscountText } from "@/components/VeNFTCard";

// ─── Metric strip ────────────────────────────────────────────────────────────

export interface Metric {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "positive" | "muted";
  hint?: string;
}

/**
 * Four metrics on one shared grid. Every cell has the same three fixed rows
 * (label, value, note), so a long label or an empty value can never push its
 * neighbours out of alignment.
 */
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="metric-strip">
      {metrics.map((m) => {
        const loading = m.value === "Loading…" || m.value === "…";
        if (loading) {
          return (
            <div key={m.label} className="metric-cell" aria-busy="true">
              <dt className="text-[12px] font-semibold truncate self-center" style={{ color: "var(--text-3)" }}>{m.label}</dt>
              <dd className="self-center"><div className="h-6 w-20 skeleton rounded" /></dd>
              <dd className="text-[12px] truncate self-center" style={{ color: "var(--text-3)" }}>{m.note}</dd>
            </div>
          );
        }
        const empty = m.tone === "muted";
        return (
          <div key={m.label} className="metric-cell" title={m.hint}>
            <dt className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>
              {m.label}
            </dt>
            <dd
              className={`truncate self-center tabular-nums ${empty ? "text-[15px] font-semibold" : "metric-value font-bold"}`}
              style={{
                color: empty ? "var(--text-3)" : m.tone === "positive" ? "var(--success)" : "var(--text-1)",
                letterSpacing: empty ? 0 : "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </dd>
            <dd className="text-[12px] truncate self-center" style={{ color: "var(--text-3)" }}>
              {m.note}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// ─── Filter rail ─────────────────────────────────────────────────────────────

type SetFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;

function RailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title} className="py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function RailOption({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer group">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" checked={checked} onChange={onChange} className="rail-check" />
        <span className="text-[14px]" style={{ color: checked ? "var(--text-1)" : "var(--text-2)" }}>
          {label}
        </span>
      </span>
      {count !== undefined && (
        <span className="text-[12px] tabular-nums" style={{ color: "var(--text-3)" }}>{count}</span>
      )}
    </label>
  );
}

/**
 * Persistent filters for wide screens. Unlike the mobile drawer, the rail
 * applies changes immediately: the results sit right beside it, so the effect
 * of each choice is visible as it is made, which is the reason a rail exists.
 */
export function FilterRail({
  filters,
  setFilter,
  onReset,
  counts,
  activeCount,
}: {
  filters: FilterState;
  setFilter: SetFilter;
  onReset: () => void;
  counts: { veBTC: number; veMEZO: number; grant: number };
  activeCount: number;
}) {
  const coll = filters.collectionFilter;
  return (
    <aside aria-label="Filters" className="text-left">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Filters</h2>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-[13px] font-semibold hover:underline underline-offset-2" style={{ color: "var(--text-2)" }}>
            Reset
          </button>
        )}
      </div>

      <RailGroup title="Collection">
        <RailOption
          label="veBTC"
          count={counts.veBTC}
          checked={coll === "veBTC"}
          onChange={() => setFilter("collectionFilter", coll === "veBTC" ? "all" : "veBTC")}
        />
        <RailOption
          label="veMEZO"
          count={counts.veMEZO}
          checked={coll === "veMEZO"}
          onChange={() => setFilter("collectionFilter", coll === "veMEZO" ? "all" : "veMEZO")}
        />
      </RailGroup>

      <RailGroup title="Discount to value">
        <div className="segmented w-full">
          {[0, 10, 20].map((v) => (
            <button
              key={v}
              aria-pressed={filters.minDiscount === v}
              onClick={() => setFilter("minDiscount", v)}
              className="flex-1"
            >
              {v === 0 ? "Any" : `${v}%+`}
            </button>
          ))}
        </div>
      </RailGroup>

      <RailGroup title="Position">
        <RailOption
          label="Unlocks within 7 days"
          checked={filters.showEndingSoon}
          onChange={() => setFilter("showEndingSoon", !filters.showEndingSoon)}
        />
        <RailOption
          label="Grant positions only"
          count={counts.grant}
          checked={filters.showGrantOnly}
          onChange={() => setFilter("showGrantOnly", !filters.showGrantOnly)}
        />
        <RailOption
          label="Auto max-lock"
          checked={filters.showAutoLockOnly}
          onChange={() => setFilter("showAutoLockOnly", !filters.showAutoLockOnly)}
        />
      </RailGroup>
    </aside>
  );
}

// ─── View toggle ─────────────────────────────────────────────────────────────

export type MarketView = "grid" | "table";

export function ViewToggle({ view, onChange }: { view: MarketView; onChange: (v: MarketView) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Layout">
      <button aria-pressed={view === "grid"} onClick={() => onChange("grid")} aria-label="Grid view" title="Grid">
        <LayoutGrid style={{ width: 15, height: 15 }} />
      </button>
      <button aria-pressed={view === "table"} onClick={() => onChange("table")} aria-label="Table view" title="Table">
        <Rows3 style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}

// ─── Table view ──────────────────────────────────────────────────────────────

/**
 * Comparison view: every listing on one line, columns aligned, so price, value
 * and lock can be compared down the page the way a trader scans an order book.
 */
export function ListingsTable({
  listings,
  prices,
  onBuy,
}: {
  listings: Listing[];
  prices: Record<string, number | null | undefined>;
  onBuy: (l: Listing) => void;
}) {
  const th = "px-4 py-3 text-[12px] font-semibold text-left whitespace-nowrap";
  return (
    <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}>
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr style={{ color: "var(--text-3)", borderBottom: "1px solid var(--hairline)" }}>
            <th className={th + " pl-5"}>Position</th>
            <th className={th + " text-right"}>Price</th>
            <th className={th + " text-right"}>Discount</th>
            <th className={th + " text-right"}>Holds</th>
            <th className={th + " text-right"}>Voting power</th>
            <th className={th + " text-right"}>Unlocks in</th>
            <th className={th + " pr-5"}><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => {
            const sym = getPaymentTokenSymbol(l.paymentToken);
            const unit = prices[sym];
            const usd = unit ? unit * parseFloat(formatEther(l.price)) : null;
            const lockedSym = l.collection === "veBTC" ? "BTC" : "MEZO";
            const lockEnd = Number(l.lockEnd);
            return (
              <tr key={`${l.collection}-${l.tokenId}`} className="position-row" style={{ borderTop: "1px solid var(--hairline)" }}>
                <td className="px-4 pl-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <PositionGlyph collection={l.collection} lockEnd={l.lockEnd} size={32} />
                    <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: "var(--text-1)" }}>
                      {l.collection} <span className="tabular-nums" style={{ color: "var(--text-3)" }}>#{l.tokenId.toString()}</span>
                    </span>
                    {l.isGrant && <GrantTag />}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
                    {fmtAmount(l.price)} <span className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>{sym}</span>
                  </div>
                  {usd !== null && (
                    <div className="text-[12px] tabular-nums" style={{ color: "var(--text-3)" }}>
                      &#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-[14px] font-semibold whitespace-nowrap">
                  <DiscountText discountBps={l.discountBps} />
                </td>
                <td className="px-4 py-3.5 text-right text-[14px] tabular-nums whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                  {fmtAmount(l.intrinsicValue)} {lockedSym}
                </td>
                <td className="px-4 py-3.5 text-right text-[14px] tabular-nums whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                  {parseFloat(formatEther(l.votingPower)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3.5 text-right text-[14px] tabular-nums whitespace-nowrap" style={{ color: "var(--text-2)" }}>
                  {lockEnd === 0 ? "Permanent" : <CountdownCompact lockEnd={l.lockEnd} />}
                </td>
                <td className="px-4 pr-5 py-3.5 text-right">
                  <button
                    onClick={() => onBuy(l)}
                    className="btn-buy h-9 px-4 rounded-lg text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                  >
                    Buy
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
