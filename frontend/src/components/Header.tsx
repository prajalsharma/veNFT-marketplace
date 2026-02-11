"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import Link from "next/link";

export function Header() {
  const { network, isTestnet, toggleNetwork, isMezoNetwork } = useNetwork();

  return (
    <header className="bg-mezo-secondary border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-mezo-primary">Mezo</span>
            <span className="text-xl text-white">veNFT</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/marketplace"
              className="text-gray-300 hover:text-white transition"
            >
              Marketplace
            </Link>
            <Link
              href="/my-listings"
              className="text-gray-300 hover:text-white transition"
            >
              My Listings
            </Link>
            <Link
              href="/activity"
              className="text-gray-300 hover:text-white transition"
            >
              Activity
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Network Toggle */}
            <button
              onClick={toggleNetwork}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                isTestnet
                  ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                  : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
              }`}
            >
              {isTestnet ? "Testnet" : "Mainnet"}
            </button>

            {/* Wallet Connect */}
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
