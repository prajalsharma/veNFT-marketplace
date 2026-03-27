"use client";

import { Header } from "@/components/Header";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ActivityProvider } from "@/context/ActivityContext";
import Link from "next/link";
import { Zap, ExternalLink, Github } from "lucide-react";

// Twitter/X icon as SVG
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const footerLinks = {
  product: [
    { label: "Marketplace", href: "/marketplace" },
    { label: "Portfolio",   href: "/my-listings" },
    { label: "Activity",    href: "/activity" },
    { label: "Docs",        href: "/docs" },
  ],
  ecosystem: [
    { label: "Mezo Network",  href: "https://mezo.org",               external: true },
    { label: "Explorer",      href: "https://explorer.mezo.org",      external: true },
    { label: "Mezo Earn",     href: "https://testnet.mezo.org/earn",  external: true },
    { label: "Testnet Faucet",href: "https://faucet.test.mezo.org",   external: true },
  ],
  developers: [
    { label: "GitHub",          href: "https://github.com/prajalsharma/veNFT-marketplace", external: true },
    { label: "Smart Contracts", href: "/docs",                                               external: false },
  ],
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 -z-50 pointer-events-none">
        <div className="absolute inset-0 bg-[#030303]" />
        <div
          className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full opacity-[0.065]"
          style={{ background: "radial-gradient(circle, #F7931A 0%, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[45%] h-[45%] rounded-full opacity-[0.038]"
          style={{ background: "radial-gradient(circle, #4A90E2 0%, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.016]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Header />
      <NetworkSwitcher />
      <ActivityProvider>
        <main className="relative">{children}</main>
      </ActivityProvider>

      {/* ── Footer ── */}
      <footer className="relative mt-24 border-t border-white/[0.055]">
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F7931A]/18 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #F7931A, #c97415)" }}
                >
                  <Zap className="w-4.5 h-4.5 text-black" strokeWidth={2.8} />
                </div>
                <div>
                  <p className="text-[16px] font-black tracking-tight">
                    Ve<span className="text-[#F7931A]">zo</span>
                  </p>
                  <p className="text-[10px] text-white/25 tracking-[0.1em] uppercase leading-none">Mezo Network</p>
                </div>
              </div>
              <p className="text-[13px] text-white/28 leading-relaxed max-w-[190px]">
                The premier marketplace for trading veBTC and veMEZO locked positions.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-2.5 mt-5">
                <a
                  href="https://github.com/prajalsharma/veNFT-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.065] flex items-center justify-center text-white/32 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200"
                  title="GitHub"
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
                {/* Twitter / X — coming soon */}
                <div className="relative group">
                  <div
                    className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.055] flex items-center justify-center text-white/22 cursor-not-allowed"
                    title="Coming Soon"
                  >
                    <XIcon className="w-3 h-3" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/[0.1] text-[10px] font-bold text-white/50 px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 mb-5">Product</p>
              <ul className="space-y-3.5">
                {footerLinks.product.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-white/32 hover:text-white/72 transition-colors duration-150"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ecosystem links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 mb-5">Ecosystem</p>
              <ul className="space-y-3.5">
                {footerLinks.ecosystem.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-white/32 hover:text-white/72 transition-colors duration-150 flex items-center gap-1.5 group"
                    >
                      {l.label}
                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25 mb-5">Developers</p>
              <ul className="space-y-3.5 mb-6">
                {footerLinks.developers.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-white/32 hover:text-white/72 transition-colors duration-150 flex items-center gap-1.5 group"
                      >
                        {l.label}
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13px] text-white/32 hover:text-white/72 transition-colors duration-150"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              {/* Live network badge */}
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.055]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-white/28 tracking-wide">Mezo Network</span>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11.5px] text-white/18">
              © 2026 Vezo — Built for Mezo Network
            </p>
            <p className="text-[11px] text-white/15 font-medium">
              Non-custodial · Escrowless · Audited Smart Contracts
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
