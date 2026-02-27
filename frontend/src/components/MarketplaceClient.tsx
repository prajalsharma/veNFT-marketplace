"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  LayoutGrid, 
  List, 
  TrendingUp, 
  Zap, 
  Coins, 
  Clock,
  Filter,
  ArrowUpDown,
  Activity,
  ShieldCheck as ShieldCheckIcon
} from "lucide-react";
import { VeNFTCard, VeNFTCardSkeleton } from "@/components/VeNFTCard";
import { FilterSidebar, FilterButton } from "@/components/FilterSidebar";
import { useNetwork } from "@/hooks/useNetwork";
import { useMarketplace, useListing } from "@/hooks/useMarketplace";

function MarketplaceListingItem({ listingId, onBuy }: { listingId: number, onBuy: (id: number, price: bigint, isNative: boolean) => void }) {
  const { listing, isLoading } = useListing(listingId);

  if (isLoading) return <VeNFTCardSkeleton />;
  if (!listing || !listing.active) return null;

  return (
    <VeNFTCard 
      {...listing} 
      onBuy={() => onBuy(listingId, listing.price, listing.paymentToken.toLowerCase() === "0x7b7c000000000000000000000000000000000000")} 
    />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  color?: "primary" | "accent" | "success";
}) {
  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 blur-3xl opacity-10 ${color === 'primary' ? 'bg-mezo-primary' : color === 'accent' ? 'bg-mezo-accent' : 'bg-mezo-success'}`} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${color === 'primary' ? 'bg-mezo-primary/10 text-mezo-primary' : color === 'accent' ? 'bg-mezo-accent/10 text-mezo-accent' : 'bg-mezo-success/10 text-mezo-success'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-mezo-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {trend && <span className="text-[10px] font-bold text-mezo-success">{trend}</span>}
      </div>
    </div>
  );
}

export default function MarketplaceClient() {
  const { network } = useNetwork();
  const { nextListingId, buyListing, isConfirming, isPending } = useMarketplace();
  
  const [collectionFilter, setCollectionFilter] = useState<any>("all");
  const [sortBy, setSortBy] = useState("discount");
  const [showExpired, setShowExpired] = useState(false);
  const [minDiscount, setMinDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBuy = async (id: number, price: bigint, isNative: boolean) => {
    try {
      await buyListing(id, price, isNative);
    } catch (err) {
      console.error("Buy failed:", err);
    }
  };

  const listingIds = useMemo(() => {
    return Array.from({ length: nextListingId }, (_, i) => i).reverse();
  }, [nextListingId]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 text-mezo-primary mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Market Pulse</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Secondary <span className="gradient-text">Liquidity</span></h1>
            <p className="text-mezo-muted mt-2">Acquire locked positions from the Mezo ecosystem at market rates.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:grid grid-cols-3 gap-3">
              <StatCard icon={Coins} label="veBTC Floor" value="0.42 BTC" trend="↓ 4%" />
              <StatCard icon={Zap} label="veMEZO Floor" value="120k MEZO" color="accent" trend="↑ 12%" />
              <StatCard icon={TrendingUp} label="Avg Discount" value="16.4%" color="success" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mezo-muted group-focus-within:text-mezo-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by Token ID or Collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-mezo-card/50 border border-mezo-border rounded-2xl text-sm focus:outline-none focus:border-mezo-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-mezo-card border border-mezo-border rounded-2xl text-sm font-bold hover:bg-white/5 transition-all"
            >
              <Filter className="w-4 h-4" />
              Filters
              {minDiscount > 0 && <span className="w-2 h-2 bg-mezo-primary rounded-full" />}
            </button>
            <div className="relative group">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mezo-muted" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-12 pr-8 py-4 bg-mezo-card border border-mezo-border rounded-2xl text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-mezo-primary/50 transition-all"
              >
                <option value="discount">Highest Discount</option>
                <option value="price-asc">Lowest Price</option>
                <option value="price-desc">Highest Price</option>
                <option value="expiry">Nearest Expiry</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Main Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-mezo-muted">
                  Showing <span className="text-white">{nextListingId}</span> active listings
                </p>
                <div className="h-4 w-px bg-mezo-border" />
                  <div className="flex items-center gap-2 text-mezo-success text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheckIcon className="w-3 h-3" />
                    Audit Passed
                  </div>
              </div>
            </div>

            {nextListingId > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {listingIds.map((id) => (
                    <MarketplaceListingItem key={id} listingId={id} onBuy={handleBuy} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-32 text-center glass-card rounded-[2rem]">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-mezo-muted" />
                </div>
                <h3 className="text-xl font-bold mb-2">No active listings</h3>
                <p className="text-mezo-muted max-w-xs mx-auto text-sm">Be the first to list a veNFT and provide liquidity to the Mezo ecosystem.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterSidebar
        collectionFilter={collectionFilter}
        setCollectionFilter={setCollectionFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showExpired={showExpired}
        setShowExpired={setShowExpired}
        minDiscount={minDiscount}
        setMinDiscount={setMinDiscount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}
