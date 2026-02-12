"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, TrendingDown, Lock, ExternalLink, Sparkles } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const { isConnected } = useAccount();
  const { network, contracts } = useNetwork();

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-4 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-mezo-primary/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-mezo-purple/20 rounded-full blur-[100px]"
          />
        </div>

        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="max-w-7xl mx-auto text-center relative z-10"
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mezo-primary/10 border border-mezo-primary/20 text-mezo-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Now Live on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
          >
            Trade{" "}
            <span className="gradient-text">veNFTs</span>
            <br />
            <span className="text-white/90">at a Discount</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl md:text-2xl text-white/60 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Buy vote-escrowed Bitcoin and MEZO positions below intrinsic value.
            Unlock governance power and yield on the Mezo Network.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/marketplace"
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-mezo-gradient rounded-2xl text-black font-bold text-lg hover:shadow-glow transition-all"
            >
              Explore Marketplace
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isConnected && (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeInUp}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto"
          >
            {[
              { value: "12+", label: "Active Listings" },
              { value: "15%", label: "Avg Discount" },
              { value: "4.2M", label: "Total Volume" },
              { value: "1.2K", label: "Traders" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="glass rounded-2xl p-4 md:p-6"
              >
                <p className="text-2xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-white/50 text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Trade <span className="gradient-text">veNFTs</span>?
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Unlock unique DeFi opportunities through vote-escrowed NFT trading
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingDown,
                title: "Buy at a Discount",
                description: "Acquire locked BTC and MEZO positions below their intrinsic value. See instant discount badges on every listing.",
                color: "primary",
              },
              {
                icon: Zap,
                title: "Voting Power",
                description: "Each veNFT carries voting power for protocol governance. veMEZO boosts veBTC by up to 5x.",
                color: "accent",
              },
              {
                icon: Shield,
                title: "Escrowless Trading",
                description: "Direct P2P transfers with no escrow risk. Pay with BTC, MEZO, or MUSD stablecoin.",
                color: "purple",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group glass rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                    feature.color === "primary"
                      ? "bg-mezo-primary/10 text-mezo-primary"
                      : feature.color === "accent"
                      ? "bg-mezo-accent/10 text-mezo-accent"
                      : "bg-mezo-purple/10 text-mezo-purple"
                  }`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:gradient-text transition-all">
                  {feature.title}
                </h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Collections</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Two powerful vote-escrow mechanisms for the Mezo ecosystem
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* veBTC Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-mezo-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass rounded-3xl p-8 border border-mezo-primary/20 group-hover:border-mezo-primary/40 transition-all overflow-hidden">
                {/* Background gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-mezo-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-mezo-primary/20 rounded-2xl flex items-center justify-center text-3xl border border-mezo-primary/30">
                      ₿
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">veBTC</h3>
                      <p className="text-white/50">Vote-escrowed Bitcoin</p>
                    </div>
                  </div>

                  <p className="text-white/70 mb-6 leading-relaxed">
                    Lock BTC for up to 28 days to earn protocol fees and governance
                    power. Linear decay model ensures fair value discovery.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      28 day max lock
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      Linear decay
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      Protocol fees
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href="/marketplace?collection=veBTC"
                      className="flex items-center gap-2 px-5 py-3 bg-mezo-primary text-black font-semibold rounded-xl hover:bg-mezo-primary/90 transition-all"
                    >
                      Browse veBTC
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a
                      href="https://mezo.org/docs/users/mezo-earn/lock/vebtc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 border border-mezo-primary/30 text-mezo-primary rounded-xl hover:bg-mezo-primary/10 transition-all"
                    >
                      Learn More
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* veMEZO Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-mezo-purple/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass rounded-3xl p-8 border border-mezo-purple/20 group-hover:border-mezo-purple/40 transition-all overflow-hidden">
                {/* Background gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-mezo-purple/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-mezo-purple/20 rounded-2xl flex items-center justify-center text-3xl border border-mezo-purple/30">
                      <Lock className="w-8 h-8 text-mezo-purple" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">veMEZO</h3>
                      <p className="text-white/50">Vote-escrowed MEZO</p>
                    </div>
                  </div>

                  <p className="text-white/70 mb-6 leading-relaxed">
                    Lock MEZO for up to 4 years to boost veBTC voting power by up to
                    5x. Auto-max lock available for maximum rewards.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      4 year max lock
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      5x boost
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-sm">
                      Auto-max lock
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href="/marketplace?collection=veMEZO"
                      className="flex items-center gap-2 px-5 py-3 bg-mezo-purple text-white font-semibold rounded-xl hover:bg-mezo-purple/90 transition-all"
                    >
                      Browse veMEZO
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a
                      href="https://mezo.org/docs/users/mezo-earn/lock/vemezo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 border border-mezo-purple/30 text-mezo-purple rounded-xl hover:bg-mezo-purple/10 transition-all"
                    >
                      Learn More
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative glass rounded-3xl p-8 md:p-12 text-center overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-mezo-primary/10 via-transparent to-mezo-purple/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-mezo-primary/50 to-transparent" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
                Connect your wallet and explore discounted veNFTs on the Mezo Network
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-mezo-gradient rounded-2xl text-black font-bold text-lg hover:shadow-glow transition-all"
                >
                  Browse Marketplace
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/my-listings"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/5 transition-all"
                >
                  Create Listing
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Network Info */}
      <section className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center text-sm text-white/40">
          <p className="flex items-center justify-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                network === "testnet" ? "bg-mezo-warning" : "bg-mezo-success"
              } animate-pulse`}
            />
            Connected to Mezo {network === "testnet" ? "Testnet" : "Mainnet"} | Chain ID: {contracts.chainId}
          </p>
          <p className="mt-2 flex items-center justify-center gap-4">
            <a
              href={contracts.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mezo-primary hover:underline inline-flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
            {network === "testnet" && (
              <a
                href="https://faucet.test.mezo.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mezo-accent hover:underline inline-flex items-center gap-1"
              >
                Get Testnet BTC
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
