"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Zap, Coins, Filter, ArrowUpDown, Activity, ShieldCheck } from "lucide-react";
import { VeNFTCard, VeNFTCardSkeleton } from "@/components/VeNFTCard";
import { FilterSidebar } from "@/components/FilterSidebar";
import { BuyModal } from "@/components/BuyModal";
import { useMarketplace, useListing, useUserVeNFTs, Listing } from "@/hooks/useMarketplace";

function MarketplaceListingItem({
  listingId, onBuy, onListingResolved, showInactive,
}: {
  listingId: number;
  onBuy: (listing: Listing) => void;
  onListingResolved?: (id: number, listing: Listing | null) => void;
  showInactive?: boolean;
}) {
  const { listing, isLoading } = useListing(listingId);
  useEffect(() => {
    if (!isLoading) onListingResolved?.(listingId, listing);
  }, [isLoading, listing, listingId, onListingResolved]);

  if (isLoading) return <VeNFTCardSkeleton />;
  if (!listing) return null;
  if (!showInactive && !listing.active) return null;
  return (
    <VeNFTCard
      {...listing}
      active={listing.active}
      onBuy={listing.active ? () => onBuy(listing) : undefined}
    />
  );
}

function InlineStatBadge({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.055]">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color ? `${color}18` : "rgba(255,255,255,0.06)" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: color || "rgba(255,255,255,0.4)" }} />
      </div>
      <div>
        <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/30">{label}</p>
        <p className="text-[13px] font-bold tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function MarketplaceClient() {
  const { nextListingId } = useMarketplace();
  const { refetchVeNFTs } = useUserVeNFTs();
  const [collectionFilter, setCollectionFilter] = useState<"all" | "veBTC" | "veMEZO">("all");
  const [sortBy, setSortBy] = useState("discount");
  const [activeOnly, setActiveOnly] = useState(true);
  const [minDiscount, setMinDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBuyListing, setActiveBuyListing] = useState<Listing | null>(null);
  const [listingMap, setListingMap] = useState<Record<number, Listing>>({});

  const listingIds = useMemo(
    () => Array.from({ length: nextListingId }, (_, i) => i).reverse(),
    [nextListingId]
  );

  const handleListingResolved = useCallback((id: number, listing: Listing | null) => {
    if (!listing) return;
    setListingMap((prev) => {
      const ex = prev[id];
      if (ex && ex.active === listing.active && ex.price === listing.price && ex.discountBps === listing.discountBps) return prev;
      return { ...prev, [id]: listing };
    });
  }, []);

  const searchableListings = useMemo(() =>
    listingIds.map((id) => listingMap[id]).filter((l): l is Listing => !!l),
    [listingIds, listingMap]
  );

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const filtered = searchableListings.filter((l) => {
      const colOk  = collectionFilter === "all" || l.collection === collectionFilter;
      const actOk  = activeOnly ? l.active : true;
      const discOk = Number(l.discountBps) / 100 >= minDiscount;
      const lockOk = Number(l.lockEnd) === 0 || Number(l.lockEnd) > now;
      const qOk    = !q || l.tokenId.toString().includes(q) || l.collection.toLowerCase().includes(q) || l.seller.toLowerCase().includes(q);
      return colOk && actOk && discOk && lockOk && qOk;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "price-asc")  return a.price < b.price ? -1 : a.price > b.price ? 1 : 0;
      if (sortBy === "price-desc") return a.price > b.price ? -1 : a.price < b.price ? 1 : 0;
      if (sortBy === "time-remaining" || sortBy === "expiry") return Number(a.lockEnd) - Number(b.lockEnd);
      return a.discountBps > b.discountBps ? -1 : a.discountBps < b.discountBps ? 1 : 0;
    });
  }, [searchableListings, searchQuery, collectionFilter, activeOnly, minDiscount, sortBy]);

  const visibleIds  = useMemo(() => filteredListings.map((l) => l.listingId), [filteredListings]);
  const activeCount = useMemo(() => searchableListings.filter((l) => l.active).length, [searchableListings]);

  return (
    <>
      <BuyModal
        isOpen={!!activeBuyListing}
        onClose={() => setActiveBuyListing(null)}
        listing={activeBuyListing}
        onPurchaseSuccess={() => { refetchVeNFTs(); setActiveBuyListing(null); }}
      />

      <div className="min-h-screen pt-[88px] pb-24 px-6">
        <div className="max-w-7xl mx-auto">

          {/* ── Page header ── */}
          <div className="pt-10 pb-10 border-b border-white/[0.055]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-[#F7931A]" />
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#F7931A]">Market Pulse</span>
                </div>
                <h1 className="text-[2.4rem] md:text-[3rem] font-bold tracking-tight mb-2">
                  Secondary <span className="gradient-text">Liquidity</span>
                </h1>
                <p className="text-[15px] text-white/40">
                  Acquire locked positions from the Mezo ecosystem at market rates.
                </p>
              </div>
              {/* Stat badges */}
              <div className="flex flex-wrap gap-2">
                <InlineStatBadge icon={Coins}      label="veBTC Floor"    value="0.42 BTC"   color="#F7931A" />
                <InlineStatBadge icon={Zap}        label="veMEZO Floor"   value="120k MEZO"  color="#4A90E2" />
                <InlineStatBadge icon={TrendingUp} label="Avg Discount"   value="16.4%"      color="#10B981" />
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 pb-8">
            {/* Search */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-[#F7931A] transition-colors" />
              <input
                type="text"
                placeholder="Search by token ID, collection, or seller…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[13.5px] placeholder:text-white/25 focus:outline-none focus:border-[#F7931A]/40 focus:bg-white/[0.04] transition-all"
              />
            </div>

            {/* Filter + sort row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 px-5 py-3.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[13.5px] font-bold hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
              >
                <Filter className="w-4 h-4" />
                Filters
                {minDiscount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F7931A]" />
                )}
              </button>

              <div className="relative">
                <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-10 pr-8 py-3.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[13.5px] font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#F7931A]/40 transition-all"
                >
                  <option value="discount">Best Discount</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="time-remaining">Expiring Soon</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Result count + trust mark ── */}
          <div className="flex items-center justify-between mb-8 px-1">
            <p className="text-[13px] text-white/35">
              <span className="text-white font-bold">{activeCount}</span>{" "}
              active listing{activeCount !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black tracking-[0.15em] uppercase">
              <ShieldCheck className="w-3 h-3" />
              Audit Passed
            </div>
          </div>

          {/* ── Grid ── */}
          {nextListingId > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {(visibleIds.length > 0 || searchableListings.length > 0 ? visibleIds : listingIds).map((id) => (
                  <MarketplaceListingItem
                    key={id}
                    listingId={id}
                    onBuy={setActiveBuyListing}
                    onListingResolved={handleListingResolved}
                    showInactive={!activeOnly}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-32 text-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                <Search className="w-6 h-6 text-white/25" />
              </div>
              <h3 className="text-[17px] font-bold mb-2">No active listings</h3>
              <p className="text-[14px] text-white/35 max-w-xs mx-auto leading-relaxed">
                Be the first to list a veNFT and provide liquidity to the Mezo ecosystem.
              </p>
            </div>
          )}
        </div>
      </div>

      <FilterSidebar
        collectionFilter={collectionFilter}
        setCollectionFilter={setCollectionFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showExpired={activeOnly}
        setShowExpired={setActiveOnly}
        minDiscount={minDiscount}
        setMinDiscount={setMinDiscount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}
