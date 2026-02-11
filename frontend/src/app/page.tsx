"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";

export default function Home() {
  const { isConnected } = useAccount();
  const { network, contracts } = useNetwork();

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-mezo-primary">veNFT</span> Marketplace
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Trade vote-escrowed Bitcoin and MEZO positions on the Mezo Network.
            Discover discounted veNFTs with locked voting power.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="px-8 py-3 bg-mezo-primary text-black font-semibold rounded-lg hover:bg-mezo-primary/90 transition text-lg"
            >
              Browse Marketplace
            </Link>
            {!isConnected && (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-mezo-secondary/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Trade veNFTs?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-mezo-secondary p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-mezo-primary/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Buy at a Discount</h3>
              <p className="text-gray-400">
                Acquire locked BTC and MEZO positions below their intrinsic
                value. See instant discount badges on every listing.
              </p>
            </div>

            <div className="bg-mezo-secondary p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-mezo-primary/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Voting Power</h3>
              <p className="text-gray-400">
                Each veNFT carries voting power for protocol governance. veMEZO
                boosts veBTC by up to 5x.
              </p>
            </div>

            <div className="bg-mezo-secondary p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-mezo-primary/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Escrowless Trading</h3>
              <p className="text-gray-400">
                Direct P2P transfers with no escrow risk. Pay with BTC, MEZO, or
                MUSD stablecoin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Collections</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* veBTC */}
            <div className="bg-gradient-to-br from-orange-500/10 to-mezo-secondary p-8 rounded-xl border border-orange-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">₿</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">veBTC</h3>
                  <p className="text-gray-400">Vote-escrowed Bitcoin</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                Lock BTC for up to 28 days to earn protocol fees and governance
                power. Linear decay model.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/marketplace?collection=veBTC"
                  className="px-4 py-2 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400 transition"
                >
                  Browse veBTC
                </Link>
                <a
                  href="https://mezo.org/docs/users/mezo-earn/lock/vebtc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500/10 transition"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* veMEZO */}
            <div className="bg-gradient-to-br from-purple-500/10 to-mezo-secondary p-8 rounded-xl border border-purple-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🔮</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">veMEZO</h3>
                  <p className="text-gray-400">Vote-escrowed MEZO</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                Lock MEZO for up to 4 years to boost veBTC voting power by up to
                5x. Auto-max lock available.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/marketplace?collection=veMEZO"
                  className="px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-400 transition"
                >
                  Browse veMEZO
                </Link>
                <a
                  href="https://mezo.org/docs/users/mezo-earn/lock/vemezo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Info */}
      <section className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>
            Connected to Mezo {network === "testnet" ? "Testnet" : "Mainnet"} |
            Chain ID: {contracts.chainId}
          </p>
          <p className="mt-1">
            <a
              href={contracts.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mezo-accent hover:underline"
            >
              View on Explorer
            </a>
            {network === "testnet" && (
              <>
                {" | "}
                <a
                  href="https://faucet.test.mezo.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mezo-accent hover:underline"
                >
                  Get Testnet BTC
                </a>
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
