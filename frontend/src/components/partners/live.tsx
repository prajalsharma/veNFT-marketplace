"use client";

// Live widgets an entry can opt into with `live` in lib/partners.ts. Each
// shows the integration actually running, not a claim about it. To add one,
// implement it here and register it in LIVE under a new LiveWidget name.

import type { Entry, LiveWidget } from "@/lib/partners";
import { useMarketHistory } from "@/hooks/useMarketData";
import { EntryMark } from "@/components/partners/EntryMark";

function ago(sec: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

/** The subgraph's own state from /api/market-stats: latest block and counts. */
function GoldskyIndex({ entry }: { entry: Entry }) {
  const { status, stats } = useMarketHistory();
  const ok = status === "ready" || status === "empty";
  const rows: [string, string][] = stats
    ? [
        ["Indexed through block", stats.indexedBlock ? Number(stats.indexedBlock).toLocaleString("en-US") : "—"],
        ["Listings indexed", stats.totalListings.toLocaleString("en-US")],
        ["Sales indexed", stats.totalSales.toLocaleString("en-US")],
        ["Traders", stats.participants.toLocaleString("en-US")],
      ]
    : [];
  return (
    <div className="rounded-2xl p-6 md:p-7" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <EntryMark entry={entry} height={34} />
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text-2)" }} aria-live="polite">
          <span className="w-2 h-2 rounded-full" style={{ background: ok ? "var(--success)" : status === "loading" ? "var(--text-3)" : "#F59E0B" }} />
          {status === "loading"
            ? "Checking the index"
            : ok
              ? `In sync · ${stats?.indexedAt ? ago(stats.indexedAt) : "live"}`
              : status === "stale"
                ? `Behind · ${stats?.indexedAt ? ago(stats.indexedAt) : ""}`
                : "Index unreachable"}
        </span>
      </div>
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6">
          {rows.map(([k, v]) => (
            <div key={k} className="py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
              <dt className="text-[13px]" style={{ color: "var(--text-3)" }}>{k}</dt>
              <dd className="text-[18px] font-bold tabular-nums mt-0.5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[14px] py-3" style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-3)" }}>
          {status === "loading" ? "Reading the latest indexed block…" : "Live figures are unavailable right now. Listings still load from the chain."}
        </p>
      )}
    </div>
  );
}

const LIVE: Record<LiveWidget, (p: { entry: Entry }) => JSX.Element> = {
  "goldsky-index": GoldskyIndex,
};

export function Live({ entry }: { entry: Entry }) {
  if (!entry.live) return null;
  const W = LIVE[entry.live];
  return <W entry={entry} />;
}
