"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function MyListingsPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">My Listings</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to view and manage your listings
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Listings</h1>
          <p className="text-gray-400">Manage your veNFT listings</p>
        </div>
        <Link
          href="/list"
          className="px-4 py-2 bg-mezo-primary text-black font-semibold rounded-lg hover:bg-mezo-primary/90 transition"
        >
          + Create Listing
        </Link>
      </div>

      {/* Empty state */}
      <div className="bg-mezo-secondary rounded-xl border border-gray-700 p-16 text-center">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📋</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">No active listings</h2>
        <p className="text-gray-400 mb-6">
          You don&apos;t have any veNFTs listed for sale yet
        </p>
        <Link
          href="/list"
          className="inline-block px-6 py-3 bg-mezo-primary text-black font-semibold rounded-lg hover:bg-mezo-primary/90 transition"
        >
          List Your First veNFT
        </Link>
      </div>

      {/* Info */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="bg-mezo-secondary p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">How to List</h3>
          <ol className="text-gray-400 space-y-2 list-decimal list-inside">
            <li>Go to your veNFT collection</li>
            <li>Select the veNFT you want to sell</li>
            <li>Set your price and payment token</li>
            <li>Approve and confirm the listing</li>
          </ol>
        </div>
        <div className="bg-mezo-secondary p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Seller Tips</h3>
          <ul className="text-gray-400 space-y-2 list-disc list-inside">
            <li>Price below intrinsic value for faster sales</li>
            <li>Longer lock times = more attractive to buyers</li>
            <li>Accept multiple payment tokens for flexibility</li>
            <li>Monitor floor prices to stay competitive</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
