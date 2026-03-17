"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FlaskConical, Globe, Github } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { network, isTestnet, toggleNetwork } = useNetwork();
  const { addNetwork } = useAddNetwork();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNetworkSwitch = async () => {
    try {
      await addNetwork(isTestnet ? "mainnet" : "testnet");
      toggleNetwork();
    } catch (e) {
      console.error("Network switch failed:", e);
    }
  };

  const navLinks = [
    { href: "/marketplace",  label: "Marketplace" },
    { href: "/my-listings",  label: "Portfolio" },
    { href: "/activity",     label: "Activity" },
    { href: "/docs",         label: "Docs" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Backdrop strip */}
      <div className="absolute inset-0 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/[0.05]" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-[80px] gap-4">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#F7931A,#c97415)" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#000" viewBox="0 0 24 24" strokeWidth={2.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <a href="https://mezo.org" target="_blank" rel="noopener noreferrer" className="text-[17px] font-bold tracking-tight hidden sm:block hover:opacity-80 transition-opacity">
              Ve<span className="text-[#F7931A]">zo</span>
            </a>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-[14px] font-medium rounded-lg transition-colors duration-150 ${
                  isActive(link.href)
                    ? "text-white"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-white/[0.06]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* ── Right cluster ── */}
          <div className="flex items-center gap-2.5">

            {/* Network pill */}
            <div className="hidden md:flex items-center bg-white/[0.04] border border-white/[0.07] rounded-full p-[3px] gap-0 relative text-[12px] font-bold">
              <motion.div
                className="absolute top-[3px] bottom-[3px] rounded-full z-0"
                animate={{
                  left:  isTestnet ? "3px"  : "50%",
                  right: isTestnet ? "50%"  : "3px",
                  backgroundColor: isTestnet
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(34,197,94,0.15)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
              <button
                onClick={isTestnet ? undefined : handleNetworkSwitch}
                className={`relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors duration-150 ${
                  isTestnet ? "text-amber-400" : "text-white/30 hover:text-white/55"
                }`}
              >
                <FlaskConical className="w-3 h-3 flex-shrink-0" />
                <span>Testnet</span>
                {isTestnet && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
              <button
                onClick={isTestnet ? handleNetworkSwitch : undefined}
                className={`relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors duration-150 ${
                  !isTestnet ? "text-emerald-400" : "text-white/30 hover:text-white/55"
                }`}
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span>Mainnet</span>
                {!isTestnet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>

            {/* GitHub icon */}
            <a
              href="https://github.com/prajalsharma/veNFT-marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:flex p-2 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              <Github className="w-4.5 h-4.5" />
            </a>

            {/* Wallet */}
            <ConnectButton
              chainStatus="none"
              showBalance={false}
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {/* Note: Mobile toggle sits in header, mobile menu below */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden relative border-t border-white/[0.05] bg-[#030303]/95 backdrop-blur-2xl overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-5 py-5 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-white bg-white/[0.06]"
                      : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile network */}
              <div className="pt-4 pb-1">
                <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-full p-[3px] relative text-[12px] font-bold">
                  <motion.div
                    className="absolute top-[3px] bottom-[3px] rounded-full z-0"
                    animate={{
                      left:  isTestnet ? "3px"  : "50%",
                      right: isTestnet ? "50%"  : "3px",
                      backgroundColor: isTestnet ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                  <button
                    onClick={isTestnet ? undefined : handleNetworkSwitch}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-colors ${
                      isTestnet ? "text-amber-400" : "text-white/35"
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />Testnet
                  </button>
                  <button
                    onClick={isTestnet ? handleNetworkSwitch : undefined}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-colors ${
                      !isTestnet ? "text-emerald-400" : "text-white/35"
                    }`}
                  >
                    <Globe className="w-4 h-4" />Mainnet
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
