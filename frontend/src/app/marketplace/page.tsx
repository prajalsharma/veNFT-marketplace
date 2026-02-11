"use client";

import { useState } from "react";
import { VeNFTCard } from "@/components/VeNFTCard";
import { useNetwork } from "@/hooks/useNetwork";

// Mock data for UI development
const MOCK_LISTINGS = [
  {
    listingId: 0,
    collection: "veBTC" as const,
    tokenId: 1n,
    price: 900000000000000000n, // 0.9 BTC
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 1000000000000000000n, // 1 BTC
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60), // 14 days
    votingPower: 500000000000000000n, // 0.5 veBTC
    discountBps: 1000n, // 10%
    seller: "0x1234567890123456789012345678901234567890",
  },
  {
    listingId: 1,
    collection: "veBTC" as const,
    tokenId: 2n,
    price: 450000000000000000n, // 0.45 BTC
    paymentToken: "0x7b7c000000000000000000000000000000000000",
    intrinsicValue: 500000000000000000n, // 0.5 BTC
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 21 * 24 * 60 * 60), // 21 days
    votingPower: 375000000000000000n,
    discountBps: 1000n,
    seller: "0x2345678901234567890123456789012345678901",
  },
  {
    listingId: 2,
    collection: "veMEZO" as const,
    tokenId: 1n,
    price: 100000000000000000000n, // 100 MEZO
    paymentToken: "0x7b7c000000000000000000000000000000000001",
    intrinsicValue: 120000000000000000000n, // 120 MEZO
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 year
    votingPower: 30000000000000000000n,
    discountBps: 1666n, // ~16.7%
    seller: "0x3456789012345678901234567890123456789012",
  },
  {
    listingId: 3,
    collection: "veMEZO" as const,
    tokenId: 2n,
    price: 50000000000000000000n, // 50 MUSD
    paymentToken: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503", // MUSD testnet
    intrinsicValue: 60000000000000000000n,
    lockEnd: BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 60 * 60), // 2 years
    votingPower: 20000000000000000000n,
    discountBps: 1666n,
    seller: "0x4567890123456789012345678901234567890123",
  },
];

type CollectionFilter = "all" | "veBTC" | "veMEZO";
type SortOption = "price-asc" | "price-desc" | "discount" | "expiry";

export default function MarketplacePage() {
  const { network, contracts } = useNetwork();
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("discount");

  const filteredListings = MOCK_LISTINGS.filter((listing) => {
    if (collectionFilter === "all") return true;
    return listing.collection === collectionFilter;
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
      default:
        return 0;
    }
  });

  const handleBuy = (listingId: number) => {
    console.log("Buy listing:", listingId);
    // TODO: Implement buy flow
    alert(`Buy listing #${listingId} - Connect wallet and implement buy flow`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">veNFT Marketplace</h1>
        <p className="text-gray-400">
          Browse and purchase vote-escrowed NFTs on Mezo{" "}
          {network === "testnet" ? "Testnet" : "Mainnet"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Collection Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setCollectionFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              collectionFilter === "all"
                ? "bg-mezo-primary text-black"
                : "bg-mezo-secondary text-gray-300 hover:bg-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCollectionFilter("veBTC")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              collectionFilter === "veBTC"
                ? "bg-orange-500 text-black"
                : "bg-mezo-secondary text-gray-300 hover:bg-gray-700"
            }`}
          >
            veBTC
          </button>
          <button
            onClick={() => setCollectionFilter("veMEZO")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              collectionFilter === "veMEZO"
                ? "bg-purple-500 text-white"
                : "bg-mezo-secondary text-gray-300 hover:bg-gray-700"
            }`}
          >
            veMEZO
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 bg-mezo-secondary text-white rounded-lg border border-gray-700 focus:border-mezo-primary outline-none"
        >
          <option value="discount">Highest Discount</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="expiry">Expiring Soon</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-mezo-secondary p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Total Listings</p>
          <p className="text-2xl font-bold">{filteredListings.length}</p>
        </div>
        <div className="bg-mezo-secondary p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">veBTC Floor</p>
          <p className="text-2xl font-bold text-orange-400">0.45 BTC</p>
        </div>
        <div className="bg-mezo-secondary p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">veMEZO Floor</p>
          <p className="text-2xl font-bold text-purple-400">50 MUSD</p>
        </div>
        <div className="bg-mezo-secondary p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Discount</p>
          <p className="text-2xl font-bold text-green-400">12.5%</p>
        </div>
      </div>

      {/* Listings Grid */}
      {filteredListings.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <VeNFTCard
              key={listing.listingId}
              {...listing}
              onBuy={() => handleBuy(listing.listingId)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No listings found</p>
          <p className="text-gray-500 mt-2">
            Try changing your filters or check back later
          </p>
        </div>
      )}

      {/* Note about mock data */}
      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-sm">
          <strong>Note:</strong> This is displaying mock data for UI
          development. Connect to a deployed marketplace contract to see real
          listings.
        </p>
      </div>
    </div>
  );
}
