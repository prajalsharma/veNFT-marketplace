"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FlaskConical, Globe } from "lucide-react";
import { useState } from "react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// Clean geometric "V" logomark
function VezoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="#F7931A"/>
      {/* Clean V mark with lock hint — two downward strokes meeting at center bottom */}
      <path
        d="M9 10L16 22L23 10"
        stroke="black"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12.5 10L16 16.5L19.5 10"
        stroke="black"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}

export function Header() {
  const { isTestnet, toggleNetwork } = useNetwork();
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
    { href: "/marketplace", label: "Marketplace" },
    { href: "/my-listings", label: "Portfolio" },
    { href: "/activity",    label: "Activity" },
    { href: "/docs",        label: "Docs" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-[#020202]/92 backdrop-blur-2xl border-b border-white/[0.05]" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F7931A]/25 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-[72px] gap-4">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <VezoMark size={34} />
            <span className="hidden sm:block text-[18px] font-black tracking-[-0.03em]">
              Ve<span className="text-[#F7931A]">zo</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-[13.5px] font-semibold rounded-lg transition-colors duration-150 ${
                  isActive(link.href) ? "text-white" : "text-white/38 hover:text-white/72"
                }`}
              >
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-white/[0.055]"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.38 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-[#F7931A]"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* ── Right cluster ── */}
          <div className="flex items-center gap-1.5">

            {/* Network pill */}
            <div className="hidden md:flex items-center bg-white/[0.03] border border-white/[0.065] rounded-full p-[3px] relative text-[11.5px] font-bold">
              <motion.div
                className="absolute top-[3px] bottom-[3px] rounded-full z-0"
                animate={{
                  left:  isTestnet ? "3px"  : "50%",
                  right: isTestnet ? "50%"  : "3px",
                  backgroundColor: isTestnet ? "rgba(251,191,36,0.13)" : "rgba(34,197,94,0.13)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
              <button
                onClick={isTestnet ? undefined : handleNetworkSwitch}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors duration-150 ${
                  isTestnet ? "text-amber-400" : "text-white/25 hover:text-white/50"
                }`}
              >
                <FlaskConical className="w-[11px] h-[11px] flex-shrink-0" />
                <span>Testnet</span>
                {isTestnet && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
              <button
                onClick={isTestnet ? handleNetworkSwitch : undefined}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors duration-150 ${
                  !isTestnet ? "text-emerald-400" : "text-white/25 hover:text-white/50"
                }`}
              >
                <Globe className="w-[11px] h-[11px] flex-shrink-0" />
                <span>Mainnet</span>
                {!isTestnet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>

            {/* GitHub */}
            <a
              href="https://github.com/prajalsharma/veNFT-marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:flex p-2 text-white/22 hover:text-white/60 transition-colors rounded-lg hover:bg-white/[0.04]"
              title="View on GitHub"
            >
              <GithubIcon className="w-[17px] h-[17px]" />
            </a>

            {/* Twitter / X — coming soon */}
            <div className="hidden xl:block relative group">
              <div className="p-2 text-white/15 rounded-lg cursor-not-allowed select-none">
                <XIcon className="w-[15px] h-[15px]" />
              </div>
              <div className="absolute -bottom-[38px] left-1/2 -translate-x-1/2 bg-[#161616] border border-white/[0.1] text-[10px] font-bold text-white/45 px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                Coming Soon
              </div>
            </div>

            {/* Wallet */}
            <ConnectButton
              chainStatus="none"
              showBalance={false}
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden relative border-t border-white/[0.05] bg-[#020202]/98 backdrop-blur-2xl overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-5 py-5 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-colors ${
                    isActive(link.href)
                      ? "text-white bg-white/[0.055] border-l-2 border-[#F7931A]"
                      : "text-white/40 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 pb-1">
                <div className="flex items-center bg-white/[0.03] border border-white/[0.065] rounded-full p-[3px] relative text-[12px] font-bold">
                  <motion.div
                    className="absolute top-[3px] bottom-[3px] rounded-full z-0"
                    animate={{
                      left:  isTestnet ? "3px"  : "50%",
                      right: isTestnet ? "50%"  : "3px",
                      backgroundColor: isTestnet ? "rgba(251,191,36,0.13)" : "rgba(34,197,94,0.13)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                  <button
                    onClick={isTestnet ? undefined : handleNetworkSwitch}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-colors ${
                      isTestnet ? "text-amber-400" : "text-white/32"
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />Testnet
                  </button>
                  <button
                    onClick={isTestnet ? handleNetworkSwitch : undefined}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-colors ${
                      !isTestnet ? "text-emerald-400" : "text-white/32"
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
