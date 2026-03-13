"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Github, BookOpen, ExternalLink } from "lucide-react";
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
    { href: "/docs", label: "Docs", icon: BookOpen },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-mezo-border/40 backdrop-blur-xl bg-mezo-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              className="w-10 h-10 bg-mezo-gradient rounded-xl flex items-center justify-center shadow-glow"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-6 h-6 text-black fill-current" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold tracking-tight text-white">Mezo</span>
              <span className="text-xl font-light text-mezo-primary ml-1">Market</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-mezo-muted hover:text-white transition-all group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </span>
                <motion.div
                  className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"
                  layoutId="navbar-hover"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* GitHub Link */}
            <a
              href="https://github.com/prajalsharma/veNFT-marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 text-mezo-muted hover:text-white transition-colors"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>

            {/* Network Badge */}
            <motion.button
              onClick={handleNetworkSwitch}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                isTestnet
                  ? "bg-mezo-warning/10 text-mezo-warning border-mezo-warning/30 hover:bg-mezo-warning/20"
                  : "bg-mezo-success/10 text-mezo-success border-mezo-success/30 hover:bg-mezo-success/20"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? "bg-mezo-warning" : "bg-mezo-success"} animate-pulse`} />
              {isTestnet ? "Testnet" : "Mainnet"}
            </motion.button>

            {/* Wallet Connect */}
            <div className="scale-90 sm:scale-100">
              <ConnectButton
                chainStatus="none"
                showBalance={false}
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>

            {/* Mobile Toggle */}
            <button
              className="lg:hidden p-2 text-mezo-muted hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-mezo-border/40 bg-mezo-background/95 backdrop-blur-2xl overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-lg font-medium text-mezo-muted hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon && <link.icon className="w-5 h-5" />}
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-mezo-border/40 flex flex-col gap-3">
                <button
                  onClick={handleNetworkSwitch}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold uppercase tracking-widest ${
                    isTestnet ? "bg-mezo-warning/10 text-mezo-warning" : "bg-mezo-success/10 text-mezo-success"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isTestnet ? "bg-mezo-warning" : "bg-mezo-success"}`} />
                  Switch to {isTestnet ? "Mainnet" : "Testnet"}
                </button>
                <a
                  href="https://github.com/prajalsharma/veNFT-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-4 text-mezo-muted hover:text-white"
                >
                  <Github className="w-5 h-5" />
                  View Repository
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
