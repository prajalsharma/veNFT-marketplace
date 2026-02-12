"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutGrid, List, TrendingUp, Zap, Coins, Clock } from "lucide-react";
import { VeNFTCard, VeNFTCardSkeleton } from "@/components/VeNFTCard";
import { FilterSidebar, FilterButton } from "@/components/FilterSidebar";
import { useNetwork } from "@/hooks/useNetwork";

// Mock data for UI development
const MOCK_LISTINGS = [
  {
    listingId: 0,
    collection: "veBTC" as const,
    tokenId: 1n,
    price: 900000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 1000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60),
    votingPower: 500000000000000000n,
    discountBps: 1000n,
    seller: "0x1234567890123456789012345678901234567890",
  },
  {
    listingId: 1,
    collection: "veBTC" as const,
    tokenId: 2n,
    price: 450000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 500000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60),
    votingPower: 375000000000000000n,
    discountBps: 1000n,
    seller: "0x2345678901234567890123456789012345678901",
  },
  {
    listingId: 2,
    collection: "veMEZO" as const,
    tokenId: 1n,
    price: 100000000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000001",
    intrinsicValue: 120000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
    votingPower: 30000000000000000000n,
    discountBps: 1666n,
    seller: "0x3456789012345678901234567890123456789012",
  },
  {
    listingId: 3,
    collection: "veMEZO" as const,
    tokenId: 2n,
    price: 50000000000000000000n,
    paymentToken: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    intrinsicValue: 60000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 60 * 60),
    votingPower: 20000000000000000000n,
    discountBps: 1666n,
    seller: "0x4567890123456789012345678901234567890123",
  },
  {
    listingId: 4,
    collection: "veBTC" as const,
    tokenId: 3n,
    price: 2100000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 2500000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60),
    votingPower: 1800000000000000000n,
    discountBps: 1600n,
    seller: "0x5678901234567890123456789012345678901234",
  },
  {
    listingId: 5,
    collection: "veMEZO" as const,
    tokenId: 3n,
    price: 200000000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000001",
    intrinsicValue: 250000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60),
    votingPower: 75000000000000000000n,
    discountBps: 2000n,
    seller: "0x6789012345678901234567890123456789012345",
  },
  {
    listingId: 6,
    collection: "veBTC" as const,
    tokenId: 4n,
    price: 150000000000000000n,
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 180000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60),
    votingPower: 50000000000000000n,
    discountBps: 1666n,
    seller: "0x7890123456789012345678901234567890123456",
  },
  {
    listingId: 7,
    collection: "veMEZO" as const,
    tokenId: 4n,
    price: 80000000000000000000n,
    paymentToken: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    intrinsicValue: 100000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 45 * 24 * 60 * 60),
    votingPower: 40000000000000000000n,
    discountBps: 2000n,
    seller: "0x8901234567890123456789012345678901234567",
  },
];

type CollectionFilter = "all" | "veBTC" | "veMEZO";

// Stats card component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  color?: "primary" | "purple" | "success" | "accent";
}) {
  const colorClasses = {
    primary: "text-mezo-primary bg-mezo-primary/10 border-mezo-primary/20",
    purple: "text-mezo-purple bg-mezo-purple/10 border-mezo-purple/20",
    success: "text-mezo-success bg-mezo-success/10 border-mezo-success/20",
    accent: "text-mezo-accent bg-mezo-accent/10 border-mezo-accent/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend >= 0
                ? "text-mezo-success bg-mezo-success/10"
                : "text-mezo-danger bg-mezo-danger/10"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <p className="text-white/50 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-white/40 text-xs mt-1">{subValue}</p>}
    </motion.div>
  );
}

export default function MarketplacePage() {
  const { network } = useNetwork();
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");
  const [sortBy, setSortBy] = useState("discount");
  const [showExpired, setShowExpired] = useState(false);
  const [minDiscount, setMinDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading] = useState(false);

  // Calculate active filters count
  const activeFilters = useMemo(() => {
    let count = 0;
    if (collectionFilter !== "all") count++;
    if (sortBy !== "discount") count++;
    if (showExpired) count++;
    if (minDiscount > 0) count++;
    return count;
  }, [collectionFilter, sortBy, showExpired, minDiscount]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    return MOCK_LISTINGS.filter((listing) => {
      // Collection filter
      if (collectionFilter !== "all" && listing.collection !== collectionFilter) {
        return false;
      }

      // Expired filter
      const isExpired = Number(listing.lockEnd) <= Math.floor(Date.now() / 1000);
      if (!showExpired && isExpired) {
        return false;
      }

      // Minimum discount filter
      const discount = Number(listing.discountBps) / 100;
      if (discount < minDiscount) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const tokenIdMatch = listing.tokenId.toString().includes(query);
        const collectionMatch = listing.collection.toLowerCase().includes(query);
        if (!tokenIdMatch && !collectionMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return Number(a.price - b.price);
        case "price-desc":
          return Number(b.price - a.price);
        case "discount":
          return Number(b.discountBps - a.discountBps);
        case "expiry":
          return Number(a.lockEnd - b.lockEnd);
        case "newest":
          return b.listingId - a.listingId;
        default:
          return 0;
      }
    });
  }, [collectionFilter, sortBy, showExpired, minDiscount, searchQuery]);

  const handleBuy = (listingId: number) => {
    console.log("Buy listing:", listingId);
    alert(`Buy listing #${listingId} - Connect wallet to complete purchase`);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const veBTCListings = MOCK_LISTINGS.filter((l) => l.collection === "veBTC");
    const veMEZOListings = MOCK_LISTINGS.filter((l) => l.collection === "veMEZO");

    const veBTCFloor = veBTCListings.length > 0
      ? Math.min(...veBTCListings.map((l) => Number(l.price) / 1e18))
      : 0;

    const veMEZOFloor = veMEZOListings.length > 0
      ? Math.min(...veMEZOListings.map((l) => Number(l.price) / 1e18))
      : 0;

    const avgDiscount =
      MOCK_LISTINGS.reduce((acc, l) => acc + Number(l.discountBps), 0) /
      MOCK_LISTINGS.length /
      100;

    return {
      totalListings: MOCK_LISTINGS.length,
      veBTCFloor: veBTCFloor.toFixed(2),
      veMEZOFloor: veMEZOFloor.toFixed(0),
      avgDiscount: avgDiscount.toFixed(1),
    };
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-mezo-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-mezo-purple/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">veNFT</span> Marketplace
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Trade vote-escrowed NFTs at a discount on Mezo{" "}
            <span className={`font-medium ${network === "testnet" ? "text-mezo-warning" : "text-mezo-success"}`}>
              {network === "testnet" ? "Testnet" : "Mainnet"}
            </span>
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={LayoutGrid}
            label="Total Listings"
            value={stats.totalListings.toString()}
            subValue="Active NFTs"
            color="primary"
          />
          <StatCard
            icon={Coins}
            label="veBTC Floor"
            value={`${stats.veBTCFloor} BTC`}
            trend={-5.2}
            color="primary"
          />
          <StatCard
            icon={Zap}
            label="veMEZO Floor"
            value={`${stats.veMEZOFloor} MEZO`}
            trend={12.8}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Discount"
            value={`${stats.avgDiscount}%`}
            subValue="Below intrinsic"
            color="success"
          />
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by token ID or collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl
                text-white placeholder-white/40 focus:outline-none focus:border-mezo-primary/50
                transition-colors"
            />
          </div>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-mezo-primary text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-mezo-primary text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Filter Button */}
          <FilterButton onClick={() => setSidebarOpen(true)} activeFilters={activeFilters} />
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Filter Sidebar */}
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

          {/* Listings Grid */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/60">
                <span className="text-white font-semibold">{filteredListings.length}</span>{" "}
                {filteredListings.length === 1 ? "listing" : "listings"} found
              </p>
              {activeFilters > 0 && (
                <button
                  onClick={() => {
                    setCollectionFilter("all");
                    setSortBy("discount");
                    setShowExpired(false);
                    setMinDiscount(0);
                    setSearchQuery("");
                  }}
                  className="text-sm text-mezo-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <VeNFTCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <motion.div
                layout
                className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                <AnimatePresence mode="popLayout">
                  {filteredListings.map((listing) => (
                    <motion.div
                      key={listing.listingId}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <VeNFTCard
                        {...listing}
                        onBuy={() => handleBuy(listing.listingId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-white/30" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No listings found</h3>
                <p className="text-white/50 max-w-md mx-auto">
                  Try adjusting your filters or check back later for new veNFT listings.
                </p>
                <button
                  onClick={() => {
                    setCollectionFilter("all");
                    setSortBy("discount");
                    setShowExpired(false);
                    setMinDiscount(0);
                    setSearchQuery("");
                  }}
                  className="mt-6 px-6 py-3 bg-mezo-primary text-black font-semibold rounded-xl hover:bg-mezo-primary/90 transition-colors"
                >
                  Reset Filters
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 glass rounded-2xl border border-mezo-primary/20"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-mezo-primary/10 text-mezo-primary">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Development Mode</h4>
              <p className="text-white/60 text-sm">
                Displaying mock data for UI development. Connect to a deployed marketplace
                contract to see real listings. veNFTs represent locked voting power that can
                be traded at a discount before the lock expires.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
