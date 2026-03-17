"use client";

import { Header } from "@/components/Header";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import Link from "next/link";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 -z-50 pointer-events-none">
        <div className="absolute inset-0 bg-[#030303]" />
        <div
          className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #F7931A 0%, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[45%] h-[45%] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #4A90E2 0%, transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Header />
      <NetworkSwitcher />
      <main className="relative">{children}</main>

      {/* ── Footer ── */}
      <footer className="relative mt-24 border-t border-white/[0.055]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            {/* Footer logo — matches header */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#F7931A,#c97415)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="#000" viewBox="0 0 24 24" strokeWidth={2.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <a
                  href="https://mezo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[17px] font-bold tracking-tight hover:opacity-80 transition-opacity block"
                >
                  Ve<span className="text-[#F7931A]">zo</span>
                </a>
                <p className="text-[11px] text-white/30 mt-0.5 tracking-wide">Built for the Mezo Network</p>
              </div>
            </div>

            {/* Footer nav */}
            <nav className="flex flex-wrap gap-x-8 gap-y-4">
              {[
                { label: "Marketplace", href: "/marketplace" },
                { label: "Portfolio",   href: "/my-listings" },
                { label: "Activity",    href: "/activity" },
                { label: "Docs",        href: "/docs" },
                { label: "Explorer",    href: "https://explorer.mezo.org", external: true },
                { label: "GitHub",      href: "https://github.com/prajalsharma/veNFT-marketplace", external: true },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  target={(l as any).external ? "_blank" : undefined}
                  rel={(l as any).external ? "noopener noreferrer" : undefined}
                  className="text-[14px] text-white/35 hover:text-white/75 transition-colors duration-150"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <p className="text-xs text-white/20 whitespace-nowrap">© 2026 Vezo</p>
          </div>
        </div>
      </footer>
    </>
  );
}
