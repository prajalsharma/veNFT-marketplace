"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { network, isTestnet, toggleNetwork } = useNetwork();
  const { addNetwork } = useAddNetwork();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNetworkSwitch = async () => {
    try {
      await addNetwork(isTestnet ? "mainnet" : "testnet");
      toggleNetwork();
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/my-listings", label: "My Listings" },
    { href: "/activity", label: "Activity" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-heavy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 bg-mezo-gradient rounded-xl flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-6 h-6 text-black" />
              </motion.div>
              <div className="hidden sm:block">
                <span className="text-2xl font-bold gradient-text">Mezo</span>
                <span className="text-xl font-light text-white/80 ml-1">veNFT</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-gray-300 hover:text-white transition-colors group"
                >
                  <span className="relative z-10">{link.label}</span>
                  <motion.div
                    className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100"
                    layoutId="navbar-hover"
                    transition={{ duration: 0.2 }}
                  />
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Network Toggle */}
              <motion.button
                onClick={handleNetworkSwitch}
                className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isTestnet
                    ? "bg-mezo-warning/20 text-mezo-warning border border-mezo-warning/30 hover:bg-mezo-warning/30"
                    : "bg-mezo-success/20 text-mezo-success border border-mezo-success/30 hover:bg-mezo-success/30"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTestnet ? "bg-mezo-warning" : "bg-mezo-success"
                  } animate-pulse`}
                />
                {isTestnet ? "Testnet" : "Mainnet"}
              </motion.button>

              {/* Wallet Connect */}
              <ConnectButton
                chainStatus="icon"
                showBalance={false}
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-white/70 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleNetworkSwitch}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  isTestnet
                    ? "bg-mezo-warning/20 text-mezo-warning"
                    : "bg-mezo-success/20 text-mezo-success"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTestnet ? "bg-mezo-warning" : "bg-mezo-success"
                  }`}
                />
                {isTestnet ? "Switch to Mainnet" : "Switch to Testnet"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}
