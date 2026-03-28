"use client";

import { Header } from "@/components/Header";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ActivityProvider } from "@/context/ActivityContext";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

// Same mark as in Header for consistency
function VezoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="#F7931A"/>
      <path d="M9 10L16 22L23 10" stroke="black" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M12.5 10L16 16.5L19.5 10" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35"/>
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
    { label: "Mezo Network",   href: "https://mezo.org",               external: true },
    { label: "Explorer",       href: "https://explorer.mezo.org",      external: true },
    { label: "Mezo Earn",      href: "https://testnet.mezo.org/earn",  external: true },
    { label: "Testnet Faucet", href: "https://faucet.test.mezo.org",   external: true },
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
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <Header />
      <NetworkSwitcher />
      <ActivityProvider>
        <main className="relative">{children}</main>
      </ActivityProvider>

      {/* ── Footer ── */}
      <footer className="relative mt-24 border-t border-white/[0.05]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F7931A]/15 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <VezoMark size={32} />
                <span className="text-[17px] font-black tracking-[-0.03em]">
                  Ve<span className="text-[#F7931A]">zo</span>
                </span>
              </div>
              <p className="text-[13px] text-white/28 leading-relaxed max-w-[200px] mb-6">
                The premier marketplace for trading veBTC and veMEZO locked positions on Mezo.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/prajalsharma/veNFT-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.065] flex items-center justify-center text-white/30 hover:text-white/75 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-200"
                  title="GitHub"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                </a>
                <div className="relative group">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.025] border border-white/[0.05] flex items-center justify-center text-white/18 cursor-not-allowed select-none">
                    <XIcon className="w-3 h-3" />
                  </div>
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#161616] border border-white/[0.1] text-[10px] font-bold text-white/45 px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/22 mb-5">Product</p>
              <ul className="space-y-3.5">
                {footerLinks.product.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-white/30 hover:text-white/70 transition-colors duration-150">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ecosystem links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/22 mb-5">Ecosystem</p>
              <ul className="space-y-3.5">
                {footerLinks.ecosystem.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-white/30 hover:text-white/70 transition-colors duration-150 flex items-center gap-1.5 group"
                    >
                      {l.label}
                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11.5px] text-white/18">
              © 2026 Vezo — Built for{" "}
              <a
                href="https://mezo.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/40 transition-colors underline underline-offset-2 decoration-white/20"
              >
                Mezo Network
              </a>
            </p>
            <p className="text-[11px] text-white/13 font-medium">
              Non-custodial · Escrowless · Audited Smart Contracts
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
