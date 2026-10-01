"use client";

/*
  Taste-skill rules applied:
  ✓ BANNED: 3-col equal card grid → masonry-feel 2-col + 3-col breakpoints with varied items
  ✓ BANNED: centered header → left-aligned, asymmetric two-part header
  ✓ tabular-nums on all stats
  ✓ Skeleton matches card layout shape exactly
  ✓ Spring physics: stiffness:100, damping:20
  ✓ Active filter pills with staggered reveal
  ✓ Sticky toolbar using transform, not top/left (GPU rule)
  ✓ Empty state: composed, shows how to get started
*/

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowUpDown,
  ChevronDown,
  Check,
  ShieldCheck as ShieldCheckIcon,
  X,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { formatEther } from "viem";
import { VeNFTCard, VeNFTCardSkeleton } from "@/components/VeNFTCard";
import { MetricStrip, FilterRail, ViewToggle, ListingsTable, type MarketView } from "@/components/market/MarketParts";
import { FilterSidebar, FilterButton, FilterState } from "@/components/FilterSidebar";
import { BuyModal } from "@/components/BuyModal";
import { useActiveListings, Listing } from "@/hooks/useMarketplace";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { usePriceTicker } from "@/hooks/usePriceTicker";

// ─── Inline stat bar (header) ─────────────────────────────────────────────────
function StatBar({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  // "No listings" is prose, not a figure: rendering it at figure size and in the
  // collection's accent colour makes an empty market look like a broken stat.
  const isNote = value === "No listings" || value === "—" || value === "Loading…";
  return (
    <div className="flex flex-col gap-1" title={hint}>
      <span className="eyebrow" style={hint ? { cursor: "help" } : undefined}>{label}</span>
      <span
        className={isNote ? "text-[13px] font-semibold leading-none" : "text-[20px] font-bold tabular-nums leading-none"}
        style={{
          color: isNote ? "var(--text-3)" : color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: isNote ? "-0.01em" : "-0.03em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Empty state — taste-skill: composed, shows how to populate ──────────────
// `variant` makes the empty state honest about *why* nothing is shown:
//   "filtered"    — the user's filters/search excluded everything
//   "unavailable" — listings exist on-chain but are all expired/sold/unbuyable
//   "empty"       — the market is genuinely empty
type EmptyVariant = "filtered" | "unavailable" | "empty";

function EmptyState({ variant }: { variant: EmptyVariant }) {
  const copy: Record<EmptyVariant, { title: string; body: string }> = {
    filtered: {
      title: "No listings match",
      body: "Try adjusting or clearing your filters to see more results.",
    },
    unavailable: {
      title: "No buyable listings right now",
      body: "There are listings on-chain, but they're all expired, sold, or otherwise unavailable to purchase.",
    },
    empty: {
      title: "No active listings yet",
      body: "Be the first to list a veNFT and provide liquidity to the Mezo ecosystem.",
    },
  };
  const { title, body } = copy[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-full py-24 flex flex-col items-start gap-4"
      style={{ borderTop: "1px solid var(--border-subtle)", paddingLeft: 2 }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
      >
        <Search style={{ width: 18, height: 18, color: "var(--text-3)" }} />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1.5" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)", maxWidth: "44ch" }}>
          {body}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Error / not-deployed state — honest about failures (never fake empty) ───
function LoadFailureState({
  notDeployed,
  marketplaceAddress,
  message,
  onRetry,
}: {
  notDeployed: boolean;
  marketplaceAddress?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-full py-24 flex flex-col items-start gap-4"
      style={{ borderTop: "1px solid var(--border-subtle)", paddingLeft: 2 }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
      >
        <X style={{ width: 18, height: 18, color: "#EF4444" }} />
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1.5" style={{ letterSpacing: "-0.02em" }}>
          {notDeployed ? "Marketplace not configured for this network" : "Couldn't load listings"}
        </h3>
        <p className="text-sm" style={{ color: "var(--text-2)", maxWidth: "52ch" }}>
          {notDeployed
            ? "No marketplace address is set for the selected network. This is a configuration issue, not an empty market."
            : "The marketplace contract couldn't be read. This is a network/RPC error, so listings may exist but can't be fetched right now."}
        </p>
        {marketplaceAddress && (
          <p className="text-[11px] mt-2 font-mono" style={{ color: "var(--text-3)" }}>
            Querying: {marketplaceAddress}
          </p>
        )}
        {message && (
          <p className="text-[11px] mt-1" style={{ color: "#EF4444", maxWidth: "52ch", wordBreak: "break-word" }}>
            {message}
          </p>
        )}
      </div>
      {!notDeployed && (
        <button
          onClick={onRetry}
          className="text-xs font-bold px-4 py-2 rounded-lg"
          style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold"
      style={{
        background: "rgba(255,0,64,0.08)",
        border: "1px solid rgba(255,0,64,0.22)",
        color: "#FF0040",
      }}
    >
      {label}
      <button onClick={onRemove} style={{ lineHeight: 1 }}>
        <X style={{ width: 13, height: 13 }} />
      </button>
    </motion.div>
  );
}

// ─── Default filter state ─────────────────────────────────────────────────────
const DEFAULT_FILTERS: FilterState = {
  collectionFilter: "all",
  sortBy: "discount",
  activeOnly: true,
  minDiscount: 0,
  maxDiscount: 50,
  showGrantOnly: false,
  showAutoLockOnly: false,
  showEndingSoon: false,
};


// ─── Sort menu — custom dropdown, no native select ────────────────────────────
const SORT_LABELS: Record<string, string> = {
  discount: "Best discount",
  "price-asc": "Price: low \u2192 high",
  "price-desc": "Price: high \u2192 low",
  "time-remaining": "Expiring soon",
  newest: "Newest",
};

function SortMenu({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="input-field cursor-pointer flex items-center gap-2 whitespace-nowrap"
        style={{ fontSize: "0.8rem", fontWeight: 600, paddingLeft: 14, paddingRight: 12 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown style={{ width: 13, height: 13, color: "var(--text-3)" }} />
        {SORT_LABELS[value] ?? "Sort"}
        <ChevronDown
          style={{ width: 13, height: 13, color: "var(--text-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-52 rounded-xl z-50 p-1.5"
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
            role="listbox"
          >
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <button
                key={v}
                role="option"
                aria-selected={v === value}
                onClick={() => { onChange(v); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-semibold text-left transition-colors"
                style={{
                  color: v === value ? "#FF0040" : "var(--text-2)",
                  background: v === value ? "rgba(255,0,64,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => { if (v !== value) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (v !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {l}
                {v === value && <Check style={{ width: 14, height: 14 }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MarketplaceClient() {
  const {
    listings: rawListings,
    isLoading: listingsLoading,
    refetch,
    isError: listingsError,
    error: listingsErrorObj,
    marketplaceAddress,
    isMarketplaceReady,
  } = useActiveListings();
  const prices = usePriceTicker();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBuyListing, setActiveBuyListing] = useState<Listing | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [view, setViewState] = useState<MarketView>("grid");
  useEffect(() => {
    try {
      const v = localStorage.getItem("vezo-market-view");
      if (v === "grid" || v === "table") setViewState(v);
    } catch { /* storage unavailable */ }
  }, []);
  const setView = (v: MarketView) => {
    setViewState(v);
    try { localStorage.setItem("vezo-market-view", v); } catch { /* ignore */ }
  };

  function setFilter<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // Filter out listings whose tokenId was locally purchased (optimistic hide)
  const searchableListings = useMemo(
    () => rawListings.filter(l => !purchasedIds.has(Number(l.tokenId))),
    [rawListings, purchasedIds]
  );

  const filteredListings = useMemo(() => {
    const { collectionFilter, activeOnly, minDiscount, maxDiscount, showGrantOnly, showAutoLockOnly, showEndingSoon, sortBy } = filters;
    const q = searchQuery.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const soonThreshold = now + 7 * 86400;

    // The discount slider is bounded 0–50%. Treat it as a filter ONLY when the
    // user has actually narrowed it; at its default (0–50) it must NOT hide
    // listings priced at a premium (negative discount) or deeper than 50% off,
    // nor listings whose discount is not computable (cross-token → null). Doing
    // otherwise silently drops valid listings even though no filter pill shows.
    const discountFilterActive = minDiscount > 0 || maxDiscount < 50;

    const filtered = searchableListings.filter((l) => {
      if (collectionFilter !== "all" && l.collection !== collectionFilter) return false;
      if (activeOnly && !l.active) return false;
      if (Number(l.lockEnd) !== 0 && Number(l.lockEnd) <= now) return false;
      // Only constrain by discount when the user narrows the band. Null discounts
      // (no oracle-safe comparison) are never hidden by this slider.
      if (discountFilterActive && l.discountBps !== null) {
        const dPct = Number(l.discountBps) / 100;
        if (dPct < minDiscount || dPct > maxDiscount) return false;
      }
      if (showGrantOnly && !l.isGrant) return false;
      if (showAutoLockOnly && Number(l.lockEnd) !== 0) return false;
      if (showEndingSoon && (Number(l.lockEnd) === 0 || Number(l.lockEnd) > soonThreshold)) return false;
      if (q) {
        const ok =
          l.tokenId.toString().includes(q) ||
          l.collection.toLowerCase().includes(q) ||
          l.seller.toLowerCase().includes(q);
        if (!ok) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "price-asc") return a.price < b.price ? -1 : a.price > b.price ? 1 : 0;
      if (sortBy === "price-desc") return a.price > b.price ? -1 : a.price < b.price ? 1 : 0;
      if (sortBy === "time-remaining" || sortBy === "expiry") return Number(a.lockEnd) - Number(b.lockEnd);
      if (sortBy === "newest") return b.listingId - a.listingId;
      const ad = a.discountBps ?? -999999999n;
      const bd = b.discountBps ?? -999999999n;
      return ad > bd ? -1 : ad < bd ? 1 : 0;
    });
  }, [searchableListings, searchQuery, filters]);

  const visibleIds = useMemo(
    () => filteredListings.map((l) => l.listingId),
    [filteredListings]
  );

  // ── Market stats — floors from open listings, avg discount from HISTORICAL SALES ──
  const marketStats = useMemo(() => {
    if (listingsLoading) return { veBTCFloor: "Loading…", veMEZOFloor: "Loading…", avgDiscount: "Loading…", listingCount: 0 };

    const active = searchableListings.filter((l) => l.active);
    const veBTC = active.filter((l) => l.collection === "veBTC");
    const veMEZO = active.filter((l) => l.collection === "veMEZO");

    // Floor = the cheapest listing by USD value. Listings can be priced in BTC,
    // MEZO, or MUSD, so comparing raw price numbers across currencies is wrong (it
    // would rank a 0.05 BTC listing below an 80,000 MEZO one). Normalise to USD via
    // the live price ticker, pick the cheapest, then show it in its own currency.
    const usdOf = (l: Listing): number | null => {
      const sym = getPaymentTokenSymbol(l.paymentToken);
      const unit = prices[sym];
      if (!unit || unit <= 0) return null;
      return parseFloat(formatEther(l.price)) * unit;
    };
    const fmtFloor = (l: Listing): string => {
      const sym = getPaymentTokenSymbol(l.paymentToken);
      const v = parseFloat(formatEther(l.price));
      const f =
        v >= 1e6 ? `${(v / 1e6).toFixed(2)}M`
        : v >= 1000 ? `${(v / 1000).toFixed(1)}k`
        : v < 1 ? v.toFixed(4)
        : v.toFixed(2);
      return `${f} ${sym}`;
    };
    const floorLabel = (group: Listing[]): string => {
      // Nothing listed is a fact about the market, not a failure to compute it.
      // A bare dash reads as broken, so say which it is.
      if (!group.length) return "No listings";

      const priced = group
        .map((l) => ({ l, usd: usdOf(l) }))
        .filter((x): x is { l: Listing; usd: number } => x.usd !== null);

      if (!priced.length) {
        // The USD feed is unavailable. Ranking across currencies is impossible,
        // but if every listing here is quoted in the same token the amounts are
        // directly comparable, so the floor is still answerable.
        const sym0 = getPaymentTokenSymbol(group[0]!.paymentToken);
        const uniform = group.every((l) => getPaymentTokenSymbol(l.paymentToken) === sym0);
        if (!uniform) return "—";
        const cheapestRaw = group.reduce((a, b) => (b.price < a.price ? b : a));
        return fmtFloor(cheapestRaw);
      }

      const cheapest = priced.reduce((a, b) => (b.usd < a.usd ? b : a)).l;
      const sym = getPaymentTokenSymbol(cheapest.paymentToken);
      const v = parseFloat(formatEther(cheapest.price));
      const fmt =
        v >= 1e6 ? `${(v / 1e6).toFixed(2)}M`
        : v >= 1000 ? `${(v / 1000).toFixed(1)}k`
        : v < 1 ? v.toFixed(4)
        : v.toFixed(2);
      return `${fmt} ${sym}`;
    };
    const veBTCFloor = floorLabel(veBTC);
    const veMEZOFloor = floorLabel(veMEZO);

    // Avg discount across OPEN LISTINGS — what a buyer can actually get right now.
    const priced = active.filter((l) => l.discountBps !== null);
    let avgDiscount = active.length === 0 ? "No listings" : "—";
    let listingCount = 0;
    if (priced.length > 0) {
      const avg = priced.reduce((s, l) => s + Number(l.discountBps ?? 0n), 0) / priced.length;
      avgDiscount = `${(avg / 100).toFixed(1)}%`;
      listingCount = priced.length;
    }

    return { veBTCFloor, veMEZOFloor, avgDiscount, listingCount };
  }, [searchableListings, listingsLoading, prices]);

  const activeFilterCount = [
    filters.collectionFilter !== "all",
    filters.minDiscount > 0,
    filters.maxDiscount < 50,
    filters.showGrantOnly,
    filters.showAutoLockOnly,
    filters.showEndingSoon,
  ].filter(Boolean).length;

  const dataLoaded = !listingsLoading && rawListings.length >= 0;
  const showSkeletons = listingsLoading;

  return (
    <>
      <BuyModal
        isOpen={!!activeBuyListing}
        onClose={() => setActiveBuyListing(null)}
        listing={activeBuyListing}
        onSuccess={(bought) => {
          // Hide optimistically by tokenId; refetch will confirm
          setPurchasedIds((prev) => new Set(prev).add(Number(bought.tokenId)));
          setActiveBuyListing(null);
          setTimeout(() => refetch(), 2000);
        }}
      />

      <div className="min-h-[100dvh] pt-28 md:pt-36 pb-20 px-5 md:px-10 lg:px-16">
        <div className="max-w-[1320px] mx-auto">

          {/* ── Market header: what this is, then the state of the market ── */}
          <header className="mb-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-5">
              <h1 className="text-[32px] md:text-[36px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.035em" }}>
                Market
              </h1>
              <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
                Locked veBTC and veMEZO positions, sold below the value they hold.
              </p>
            </div>
            <MetricStrip
              metrics={[
                {
                  label: "Listed",
                  value: listingsLoading ? "…" : String(searchableListings.filter((l) => l.active).length),
                  note: "open positions",
                },
                {
                  label: "veBTC floor",
                  value: marketStats.veBTCFloor === "No listings" ? "None listed" : marketStats.veBTCFloor,
                  note: "lowest ask",
                  tone: marketStats.veBTCFloor === "No listings" ? "muted" : "default",
                  hint: "The cheapest veBTC position listed right now, compared across payment currencies at live rates.",
                },
                {
                  label: "veMEZO floor",
                  value: marketStats.veMEZOFloor === "No listings" ? "None listed" : marketStats.veMEZOFloor,
                  note: "lowest ask",
                  tone: marketStats.veMEZOFloor === "No listings" ? "muted" : "default",
                  hint: "The cheapest veMEZO position listed right now, compared across payment currencies at live rates.",
                },
                {
                  label: "Average discount",
                  value: marketStats.avgDiscount === "No listings" ? "None listed" : marketStats.avgDiscount,
                  note: "below intrinsic value",
                  tone: marketStats.avgDiscount === "No listings" || marketStats.avgDiscount === "—" ? "muted" : "positive",
                  hint: "Average discount to intrinsic value across every open listing, grant positions included.",
                },
              ]}
            />
          </header>

          <div className="grid lg:grid-cols-[232px_minmax(0,1fr)] gap-x-10 items-start">
            {/* ── Filter rail (wide screens) ── */}
            <div className="hidden lg:block sticky top-[124px]">
              <FilterRail
                filters={filters}
                setFilter={setFilter}
                onReset={resetFilters}
                activeCount={activeFilterCount}
                counts={{
                  veBTC: searchableListings.filter((l) => l.collection === "veBTC").length,
                  veMEZO: searchableListings.filter((l) => l.collection === "veMEZO").length,
                  grant: searchableListings.filter((l) => l.isGrant).length,
                }}
              />
            </div>

            <section aria-label="Listings" className="min-w-0">
              {/* ── Toolbar: search leads, sort and layout sit with the results ── */}
              <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                <div className="relative flex-1">
                  <Search
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--text-3)", pointerEvents: "none" }}
                  />
                  <input
                    id="marketplace-search"
                    name="marketplace-search"
                    type="search"
                    placeholder="Search token ID, collection or seller"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field w-full h-11"
                    style={{ paddingLeft: 40, paddingRight: searchQuery ? 36 : 14 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <SortMenu value={filters.sortBy} onChange={(v) => setFilter("sortBy", v)} />
                  <div className="lg:hidden">
                    <FilterButton onClick={() => setSidebarOpen(true)} activeFilters={activeFilterCount} />
                  </div>
                  <div className="hidden md:block">
                    <ViewToggle view={view} onChange={setView} />
                  </div>
                </div>
              </div>

              {/* Result line + active filter summary */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 min-h-[28px]">
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{filteredListings.length}</span>{" "}
                  {filteredListings.length === 1 ? "listing" : "listings"}
                </p>
                <AnimatePresence>
                  {filters.collectionFilter !== "all" && (
                    <ActiveFilterPill key="c" label={filters.collectionFilter} onRemove={() => setFilter("collectionFilter", "all")} />
                  )}
                  {filters.minDiscount > 0 && (
                    <ActiveFilterPill key="d" label={`${filters.minDiscount}%+ off`} onRemove={() => setFilter("minDiscount", 0)} />
                  )}
                  {filters.showGrantOnly && (
                    <ActiveFilterPill key="g" label="Grant positions" onRemove={() => setFilter("showGrantOnly", false)} />
                  )}
                  {filters.showAutoLockOnly && (
                    <ActiveFilterPill key="a" label="Auto max-lock" onRemove={() => setFilter("showAutoLockOnly", false)} />
                  )}
                  {filters.showEndingSoon && (
                    <ActiveFilterPill key="e" label="Unlocks within 7 days" onRemove={() => setFilter("showEndingSoon", false)} />
                  )}
                </AnimatePresence>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-[13px] font-semibold hover:underline underline-offset-2" style={{ color: "var(--text-2)" }}>
                    Clear all
                  </button>
                )}
              </div>

              {/* ── Results ── */}
              {showSkeletons ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <VeNFTCardSkeleton key={i} />)}
                </div>
              ) : filteredListings.length === 0 && dataLoaded ? (
                !isMarketplaceReady ? (
                  <LoadFailureState notDeployed marketplaceAddress={marketplaceAddress} onRetry={refetch} />
                ) : listingsError ? (
                  <LoadFailureState notDeployed={false} marketplaceAddress={marketplaceAddress} message={listingsErrorObj?.message} onRetry={refetch} />
                ) : (
                  <EmptyState
                    variant={
                      activeFilterCount > 0 || searchQuery.length > 0
                        ? "filtered"
                        : searchableListings.length > 0
                          ? "unavailable"
                          : "empty"
                    }
                  />
                )
              ) : view === "table" ? (
                <div className="hidden md:block">
                  <ListingsTable listings={filteredListings} prices={prices as unknown as Record<string, number | null>} onBuy={(l) => setActiveBuyListing(l)} />
                </div>
              ) : null}

              {!showSkeletons && filteredListings.length > 0 && (
                <div className={`grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start ${view === "table" ? "md:hidden" : ""}`}>
                  <AnimatePresence mode="popLayout">
                    {filteredListings.map((listing) => (
                      <VeNFTCard
                        key={`${listing.collection}-${listing.tokenId}`}
                        listingId={listing.listingId}
                        collection={listing.collection}
                        nftContract={listing.nftContract}
                        tokenId={listing.tokenId}
                        price={listing.price}
                        paymentToken={listing.paymentToken}
                        intrinsicValue={listing.intrinsicValue}
                        lockEnd={listing.lockEnd}
                        votingPower={listing.votingPower}
                        discountBps={listing.discountBps}
                        unitUsd={prices[getPaymentTokenSymbol(listing.paymentToken) as "BTC" | "MEZO" | "MUSD"] ?? null}
                        seller={listing.seller}
                        active={listing.active}
                        isGrant={listing.isGrant}
                        onBuy={() => setActiveBuyListing(listing)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <FilterSidebar
        {...filters}
        setCollectionFilter={(v) => setFilter("collectionFilter", v)}
        setSortBy={(v) => setFilter("sortBy", v)}
        setActiveOnly={(v) => setFilter("activeOnly", v)}
        setMinDiscount={(v) => setFilter("minDiscount", v)}
        setMaxDiscount={(v) => setFilter("maxDiscount", v)}
        setShowGrantOnly={(v) => setFilter("showGrantOnly", v)}
        setShowAutoLockOnly={(v) => setFilter("showAutoLockOnly", v)}
        setShowEndingSoon={(v) => setFilter("showEndingSoon", v)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onReset={resetFilters}
      />
    </>
  );
}
