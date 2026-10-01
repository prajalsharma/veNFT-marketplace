"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Filter, X, SlidersHorizontal, Star, Clock, TrendingDown, Zap, Award } from "lucide-react";

export interface FilterState {
  collectionFilter: "all" | "veBTC" | "veMEZO";
  sortBy: string;
  activeOnly: boolean;
  minDiscount: number;
  maxDiscount: number;
  showGrantOnly: boolean;
  showAutoLockOnly: boolean;
  showEndingSoon: boolean;
}

interface FilterSidebarProps extends FilterState {
  setCollectionFilter: (v: "all" | "veBTC" | "veMEZO") => void;
  setSortBy: (v: string) => void;
  setActiveOnly: (v: boolean) => void;
  setMinDiscount: (v: number) => void;
  setMaxDiscount: (v: number) => void;
  setShowGrantOnly: (v: boolean) => void;
  setShowAutoLockOnly: (v: boolean) => void;
  setShowEndingSoon: (v: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>{children}</p>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  icon: Icon,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: any;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center justify-center h-10 px-3 rounded-xl border text-[13px] font-semibold transition-all duration-150"
      style={{
        background: active ? "var(--text-1)" : "transparent",
        borderColor: active ? "var(--text-1)" : "var(--hairline)",
        color: active ? "var(--bg-1)" : "var(--text-2)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--hairline)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
        }
      }}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
    </button>
  );
}


function PresetChip({
  label,
  active,
  onClick,
  icon: Icon,
  hint,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: any;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className="h-10 px-3 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all duration-150"
      style={{
        background: active ? "var(--text-1)" : "transparent",
        borderColor: active ? "var(--text-1)" : "var(--hairline)",
        color: active ? "var(--bg-1)" : "var(--text-2)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.color = "var(--text-1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--hairline)";
          e.currentTarget.style.color = "var(--text-2)";
        }
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className="relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0"
      style={{
        background: checked ? "var(--text-1)" : "var(--bg-4)",
        width: 40,
        height: 22,
      }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-[3px] w-4 h-4 rounded-full"
        style={{ width: 16, height: 16, background: "var(--bg-1)" }}
      />
    </button>
  );
}

const SORT_OPTIONS = [
  { value: "discount", label: "Highest Discount" },
  { value: "price-asc", label: "Lowest Price" },
  { value: "price-desc", label: "Highest Price" },
  { value: "time-remaining", label: "Expiring Soon" },
  { value: "newest", label: "Newest First" },
];

export function FilterSidebar({
  collectionFilter: appliedCollection, setCollectionFilter: commitCollection,
  sortBy: appliedSortBy, setSortBy: commitSortBy,
  activeOnly, setActiveOnly,
  minDiscount: appliedMinDiscount, setMinDiscount: commitMinDiscount,
  maxDiscount: appliedMaxDiscount, setMaxDiscount: commitMaxDiscount,
  showGrantOnly: appliedGrantOnly, setShowGrantOnly: commitGrantOnly,
  showAutoLockOnly: appliedAutoLock, setShowAutoLockOnly: commitAutoLock,
  showEndingSoon: appliedEndingSoon, setShowEndingSoon: commitEndingSoon,
  isOpen, onClose, onReset,
}: FilterSidebarProps) {

  // Draft-and-apply: the drawer edits a local draft; nothing touches the live
  // results until Apply commits it. Closing without applying discards changes,
  // and the grid re-filters exactly once per visit instead of on every tweak.
  const [draft, setDraft] = useState({
    collectionFilter: appliedCollection,
    sortBy: appliedSortBy,
    minDiscount: appliedMinDiscount,
    maxDiscount: appliedMaxDiscount,
    showGrantOnly: appliedGrantOnly,
    showAutoLockOnly: appliedAutoLock,
    showEndingSoon: appliedEndingSoon,
  });
  // Escape dismisses the drawer without applying the draft, same as the backdrop.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setDraft({
        collectionFilter: appliedCollection,
        sortBy: appliedSortBy,
        minDiscount: appliedMinDiscount,
        maxDiscount: appliedMaxDiscount,
        showGrantOnly: appliedGrantOnly,
        showAutoLockOnly: appliedAutoLock,
        showEndingSoon: appliedEndingSoon,
      });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const { collectionFilter, sortBy, minDiscount, maxDiscount, showGrantOnly, showAutoLockOnly, showEndingSoon } = draft;
  const setCollectionFilter = (v: FilterState["collectionFilter"]) => setDraft((d) => ({ ...d, collectionFilter: v }));
  const setSortBy = (v: string) => setDraft((d) => ({ ...d, sortBy: v }));
  const setMinDiscount = (v: number) => setDraft((d) => ({ ...d, minDiscount: v }));
  const setMaxDiscount = (v: number) => setDraft((d) => ({ ...d, maxDiscount: v }));
  const setShowGrantOnly = (v: boolean) => setDraft((d) => ({ ...d, showGrantOnly: v }));
  const setShowAutoLockOnly = (v: boolean) => setDraft((d) => ({ ...d, showAutoLockOnly: v }));
  const setShowEndingSoon = (v: boolean) => setDraft((d) => ({ ...d, showEndingSoon: v }));

  const applyDraft = () => {
    commitCollection(draft.collectionFilter);
    commitSortBy(draft.sortBy);
    commitMinDiscount(draft.minDiscount);
    commitMaxDiscount(draft.maxDiscount);
    commitGrantOnly(draft.showGrantOnly);
    commitAutoLock(draft.showAutoLockOnly);
    commitEndingSoon(draft.showEndingSoon);
    onClose();
  };
  // Phones get a bottom sheet (thumb reach); wider screens a right drawer.
  // Read at render: the drawer only renders client-side (portal), and the
  // enter animation must know its direction on the first frame.
  const sheet = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  const resetDraft = () =>
    setDraft({ collectionFilter: "all", sortBy: "discount", minDiscount: 0, maxDiscount: 50, showGrantOnly: false, showAutoLockOnly: false, showEndingSoon: false });

  const activeFilterCount = [
    collectionFilter !== "all",
    minDiscount > 0,
    maxDiscount < 50,
    showGrantOnly,
    showAutoLockOnly,
    showEndingSoon,
  ].filter(Boolean).length;

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[90]"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={sheet ? { y: "100%" } : { x: "100%" }}
            animate={sheet ? { y: 0 } : { x: 0 }}
            exit={sheet ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[95] flex flex-col overflow-hidden inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl sm:rounded-none sm:inset-x-auto sm:top-0 sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-[360px]"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            style={{
              background: "var(--bg-1)",
              borderLeft: "1px solid var(--hairline)",
              boxShadow: "var(--shadow-2xl)",
            }}
          >
            <div className="sm:hidden flex justify-center pt-2.5" aria-hidden>
              <span className="w-10 h-1 rounded-full" style={{ background: "var(--border-strong)" }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b" style={{ borderColor: "var(--hairline)" }}>
              <div className="flex items-baseline gap-2.5">
                <h3 className="text-[19px] font-bold" style={{ letterSpacing: "-0.02em" }}>Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-3)" }}>
                    {activeFilterCount} on
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close filters"
                className="p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7" style={{ background: "var(--bg-1)" }}>

              {/* ── Asset Type ── */}
              <section>
                <SectionLabel>Collection</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "veBTC", label: "veBTC" },
                    { id: "veMEZO", label: "veMEZO" },
                  ].map((item) => (
                    <FilterChip
                      key={item.id}
                      label={item.label}
                      active={collectionFilter === item.id}
                      onClick={() => setCollectionFilter(item.id as any)}
                    />
                  ))}
                </div>
              </section>

              {/* ── Discount Range ── */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <SectionLabel>Discount range</SectionLabel>
                  <span className="text-[13px] font-semibold tabular-nums mb-3" style={{ color: "var(--text-1)" }}>
                    {minDiscount}% – {maxDiscount}%
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-2" style={{ color: "var(--text-3)" }}>
                      <span>Min discount</span>
                      <span className="font-bold" style={{ color: "var(--text-2)" }}>{minDiscount}%</span>
                    </div>
                    <input
                      id="filter-min-discount"
                      name="filter-min-discount"
                      type="range"
                      min="0"
                      max="45"
                      step="5"
                      value={minDiscount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setMinDiscount(v);
                        if (v > maxDiscount) setMaxDiscount(v);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-2" style={{ color: "var(--text-3)" }}>
                      <span>Max discount</span>
                      <span className="font-bold" style={{ color: "var(--text-2)" }}>{maxDiscount}%</span>
                    </div>
                    <input
                      id="filter-max-discount"
                      name="filter-max-discount"
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={maxDiscount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setMaxDiscount(v);
                        if (v < minDiscount) setMinDiscount(v);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold" style={{ color: "var(--text-4)" }}>
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
              </section>

              {/* ── Discount presets — radio-style: click the active one to clear ── */}
              <section>
                <SectionLabel>Minimum discount</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <PresetChip
                    label="Any"
                    hint="No minimum discount"
                    active={minDiscount === 0}
                    onClick={() => { setMinDiscount(0); setMaxDiscount(50); }}
                  />
                  <PresetChip
                    label="10%+"
                    hint="Only listings at least 10% below intrinsic value"
                    active={minDiscount === 10}
                    onClick={() => {
                      if (minDiscount === 10) { setMinDiscount(0); } else { setMinDiscount(10); setMaxDiscount(50); }
                    }}
                  />
                  <PresetChip
                    label="20%+"
                    hint="Only listings at least 20% below intrinsic value"
                    active={minDiscount === 20}
                    onClick={() => {
                      if (minDiscount === 20) { setMinDiscount(0); } else { setMinDiscount(20); setMaxDiscount(50); }
                    }}
                  />
                </div>
              </section>

              {/* ── Quick filters — real toggles ── */}
              <section>
                <SectionLabel>Quick filters</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <PresetChip
                    label="Ending soon"
                    hint="Locks expiring soonest first"
                    icon={Clock}
                    active={showEndingSoon}
                    onClick={() => {
                      const next = !showEndingSoon;
                      setShowEndingSoon(next);
                      if (next) setSortBy("time-remaining");
                    }}
                  />
                  <PresetChip
                    label="Grant NFTs"
                    hint="Positions issued through Mezo\u2019s grant and vesting program"
                    icon={Award}
                    active={showGrantOnly}
                    onClick={() => setShowGrantOnly(!showGrantOnly)}
                  />
                </div>
              </section>

              {/* ── Toggles ── */}
              <section>
                <SectionLabel>Options</SectionLabel>
                <div className="space-y-3">
                  {[
                    { label: "Auto max-lock only", sub: "Continuously max-locked positions", val: showAutoLockOnly, set: setShowAutoLockOnly },
                  ].map((toggle) => (
                    <div
                      key={toggle.label}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-xl cursor-pointer"
                      style={{ border: "1px solid var(--hairline)" }}
                      onClick={() => toggle.set(!toggle.val)}
                    >
                      <div>
                        <p className="text-[14px] font-semibold">{toggle.label}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>{toggle.sub}</p>
                      </div>
                      <ToggleSwitch checked={toggle.val} onChange={toggle.set} />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer actions */}
            <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t grid grid-cols-[auto_1fr] gap-2" style={{ borderColor: "var(--hairline)", background: "var(--bg-1)" }}>
              <button
                onClick={resetDraft}
                className="h-12 px-5 rounded-xl text-[15px] font-semibold transition-colors"
                style={{ background: "var(--bg-2)", color: "var(--text-1)" }}
              >
                Reset
              </button>
              <button
                onClick={applyDraft}
                className="h-12 rounded-xl text-[15px] font-semibold transition-transform active:scale-[0.98]"
                style={{ background: "var(--text-1)", color: "var(--bg-1)" }}
              >
                Show results
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function FilterButton({ onClick, activeFilters }: { onClick: () => void; activeFilters: number }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all duration-150"
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
      }}
    >
      <Filter className="w-4 h-4" />
      Filters
      {activeFilters > 0 && (
        <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white"
          style={{ background: "#FF0040" }}>
          {activeFilters}
        </span>
      )}
    </button>
  );
}
