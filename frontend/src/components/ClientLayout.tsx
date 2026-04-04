"use client";

import { Header } from "@/components/Header";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Background gradient mesh */}
      <div className="fixed inset-0 -z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-mezo-dark via-mezo-dark to-mezo-secondary" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-mezo-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-mezo-purple/10 rounded-full blur-[128px]" />
      </div>

      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 -z-40 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <Header />
      <NetworkSwitcher />
      <main className="relative">{children}</main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mezo-gradient rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">Mezo</span>
                <span className="text-lg font-light text-white/80 ml-1">veNFT</span>
              </div>
            </div>

            <div className="flex items-center gap-8 text-sm text-white/50">
              <a href="#" className="hover:text-white transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
            </div>

            <p className="text-sm text-white/30">Built on Mezo Network</p>
          </div>
        </div>
      </footer>
    </>
  );
}
