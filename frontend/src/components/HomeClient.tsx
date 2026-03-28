"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronRight, Lock, Activity } from "lucide-react";
import { useRef } from "react";

const BestDealsCarousel = dynamic(() => import("@/components/BestDealsCarousel"), { ssr: false });

// ─── Professional custom SVG icon set ────────────────────────────────────────
// Thin-stroke geometric icons — Series C fintech quality

function IconWallet() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="18" height="14" rx="2.5"/>
      <path d="M2 9h18"/>
      <path d="M5 5V4a2 2 0 012-2h8a2 2 0 012 2v1"/>
      <circle cx="15.5" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="2"/>
      <rect x="12" y="2" width="8" height="8" rx="2"/>
      <rect x="2" y="12" width="8" height="8" rx="2"/>
      <rect x="12" y="12" width="8" height="8" rx="2"/>
    </svg>
  );
}

function IconArrowSwap() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h12M14 5l3 3-3 3"/>
      <path d="M17 14H5M8 11l-3 3 3 3"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2L3.5 5.5v5c0 4.1 3.1 7.9 7.5 8.5 4.4-.6 7.5-4.4 7.5-8.5v-5L11 2z"/>
      <path d="M8 11l2 2 4-4"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l4-5 4 3 4-6 4 3"/>
      <path d="M3 20h16"/>
      <rect x="3" y="3" width="3" height="5" rx="1"/>
      <rect x="9.5" y="6" width="3" height="2" rx="1"/>
      <rect x="16" y="4" width="3" height="4" rx="1"/>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="9"/>
      <path d="M2 11h18"/>
      <path d="M11 2a14 14 0 010 18M11 2a14 14 0 000 18"/>
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    Icon: IconShield,
    title: "Escrowless Architecture",
    desc: "Sellers retain full control and voting rights until purchase is confirmed on-chain. Zero custody risk.",
  },
  {
    Icon: IconChart,
    title: "Real-time Value Analysis",
    desc: "Adapters compute intrinsic value of locked BTC accounting for voting power decay and lock duration.",
  },
  {
    Icon: IconGlobe,
    title: "Permissionless Market",
    desc: "Any holder can list their veNFT instantly. The protocol facilitates price discovery across the ecosystem.",
  },
];

const stats = [
  { label: "Assets",      value: "veBTC + veMEZO", sub: "2 collections" },
  { label: "Fee",         value: "1.00%",           sub: "Competitive rate" },
  { label: "Settlement",  value: "Atomic",          sub: "Single block" },
  { label: "Custody",     value: "Non-custodial",   sub: "Your keys, your NFTs" },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect Wallet",
    desc: "Connect your MetaMask, Taho, Zerion or any EVM wallet supported on Mezo Network.",
    Icon: IconWallet,
  },
  {
    step: "02",
    title: "Browse Listings",
    desc: "Explore available veNFTs. Filter by collection, discount rate, lock duration, and more.",
    Icon: IconGrid,
  },
  {
    step: "03",
    title: "Acquire Positions",
    desc: "Buy veBTC or veMEZO positions at a market-determined discount. Settlement is fully atomic.",
    Icon: IconArrowSwap,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeClient() {
  const { isConnected } = useAccount();
  const { network } = useNetwork();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const heroOpac = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex items-center pt-[68px]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-8%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse, #F7931A 0%, transparent 70%)", filter: "blur(70px)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-[600px] h-[400px] opacity-[0.035]"
            style={{ background: "radial-gradient(ellipse, #4A90E2 0%, transparent 70%)", filter: "blur(80px)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.013]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpac }}
          className="relative max-w-7xl mx-auto px-6 w-full py-20 lg:py-0"
        >
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_500px] gap-16 xl:gap-24 items-center">

            {/* Left — copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.55, ease: [0.22,1,0.36,1] }}
                className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full border border-[#F7931A]/22 bg-[#F7931A]/[0.05]"
              >
                <span className="dot-live" />
                <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-[#F7931A]/80">
                  Live on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22,1,0.36,1] }}
                className="text-[clamp(2.8rem,6.5vw,5.2rem)] font-black leading-[0.93] tracking-[-0.04em] mb-7"
              >
                The liquidity layer<br />
                for{" "}
                <span className="gradient-text">locked Bitcoin.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.65, ease: [0.22,1,0.36,1] }}
                className="text-[16.5px] text-white/40 leading-relaxed max-w-[500px] mb-10"
              >
                Buy and sell vote-escrowed BTC and MEZO positions.
                Access governance NFTs at market-driven discounts — securely, transparently, atomically.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link href="/marketplace" className="btn-primary px-8 py-4 text-[14.5px] rounded-xl group">
                  Enter Marketplace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/docs" className="btn-outline px-8 py-4 text-[14.5px] rounded-xl">
                  Read the Docs
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-14 pt-8 border-t border-white/[0.05] grid grid-cols-2 md:grid-cols-4 gap-5"
              >
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/22 mb-1">{s.label}</p>
                    <p className="text-[14px] font-bold text-white/85">{s.value}</p>
                    <p className="text-[10px] text-white/18 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — floating demo card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.85, ease: [0.22,1,0.36,1] }}
              className="hidden lg:block"
            >
              <DemoCard />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative">
        <div className="divider-glow absolute top-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="section-badge text-[#F7931A] mb-4">
              <Activity className="w-3 h-3" />
              How It Works
            </div>
            <h2 className="text-[clamp(1.8rem,3.2vw,2.7rem)] font-bold max-w-xl">
              Three steps to acquire{" "}
              <span className="text-white/30">locked positions.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.045] rounded-2xl overflow-hidden border border-white/[0.045]">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22,1,0.36,1] }}
                className="relative bg-[#0b0b0b] p-8 group hover:bg-[#0f0f0f] transition-colors duration-200"
              >
                {/* Step number — top right, very subtle */}
                <span className="absolute top-6 right-7 text-[11px] font-black text-white/10 tracking-[0.1em]">
                  {step.step}
                </span>

                {/* Icon — clean, no background */}
                <div className="mb-6 text-white/30 group-hover:text-[#F7931A] transition-colors duration-300">
                  <step.Icon />
                </div>

                <h3 className="text-[15.5px] font-bold mb-2.5 tracking-tight">{step.title}</h3>
                <p className="text-[13px] text-white/32 leading-relaxed">{step.desc}</p>

                {/* Bottom accent on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F7931A] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative">
        <div className="divider-glow absolute top-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="section-badge text-[#F7931A] mb-4">
              <Activity className="w-3 h-3" />
              Why Vezo
            </div>
            <h2 className="text-[clamp(1.8rem,3.2vw,2.7rem)] font-bold max-w-2xl">
              Built on the foundations of{" "}
              <span className="text-white/30">security and fairness.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="group relative rounded-2xl border border-white/[0.06] bg-[#0b0b0b] p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-1"
              >
                {/* Subtle top-left corner glow on hover */}
                <div className="absolute top-0 left-0 w-48 h-48 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: "radial-gradient(circle at top left, rgba(247,147,26,0.06) 0%, transparent 65%)" }}
                />

                {/* Icon — large, minimal, no background box */}
                <div className="mb-6 text-white/28 group-hover:text-white/55 transition-colors duration-300">
                  <f.Icon />
                </div>

                <h3 className="text-[16px] font-bold mb-3 tracking-tight">{f.title}</h3>
                <p className="text-[13.5px] text-white/32 leading-relaxed">{f.desc}</p>

                {/* Bottom line accent */}
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: "linear-gradient(90deg, #F7931A, transparent)" }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BEST DEALS ════════════════════════════════════════════════════════ */}
      <BestDealsCarousel />

      {/* ══ CTA BAND ══════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="divider-glow mb-28" />
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.065] bg-[#0b0b0b] px-10 md:px-16 py-16">
            <div className="absolute inset-0 pointer-events-none">
              <div style={{ background: "radial-gradient(ellipse at 15% 50%, rgba(247,147,26,0.065) 0%, transparent 55%)", position: "absolute", inset: 0 }} />
              <div style={{ background: "radial-gradient(ellipse at 85% 50%, rgba(74,144,226,0.035) 0%, transparent 55%)", position: "absolute", inset: 0 }} />
            </div>

            <div className="relative grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <div className="section-badge text-[#F7931A] mb-5">
                  <Lock className="w-3 h-3" />
                  Get Started Today
                </div>
                <h2 className="text-[clamp(1.6rem,2.8vw,2.4rem)] font-bold mb-4 tracking-tight">
                  Join the future of Mezo governance.
                </h2>
                <p className="text-white/32 text-[15px] max-w-xl leading-relaxed">
                  Whether you are exiting a position early or accumulating discounted voting power — Vezo is where that happens.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <Link href="/marketplace" className="btn-primary px-8 py-4 text-[14.5px] rounded-xl group">
                  Get Started
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="https://github.com/prajalsharma/veNFT-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-8 py-4 text-[14.5px] rounded-xl flex items-center gap-2"
                >
                  <IconGithub />
                  Source Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Demo card ───────────────────────────────────────────────────────────────
function DemoCard() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-10 rounded-full opacity-18 blur-[70px] pointer-events-none animate-pulse-glow"
        style={{ background: "radial-gradient(circle, #F7931A 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 blur-[40px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #4A90E2 0%, transparent 70%)" }}
      />

      <div className="relative rounded-[1.75rem] border border-white/[0.07] bg-[#0c0c0c] overflow-hidden animate-float shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="h-[2px] bg-gradient-to-r from-[#F7931A] via-[#ff9e2a] to-transparent" />

        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7931A]/10 border border-[#F7931A]/20 flex items-center justify-center">
              {/* Custom BTC lock mark */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L2 4.5v4c0 3.1 2.6 5.9 6 6.5 3.4-.6 6-3.4 6-6.5v-4L8 1.5z" fill="#F7931A" opacity="0.2" stroke="#F7931A" strokeWidth="1.2"/>
                <path d="M6 7.5h4M8 6v3" stroke="#F7931A" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold">veBTC <span className="text-[#F7931A]">#842</span></p>
              <p className="text-[10px] text-white/22 mt-0.5 font-mono">0x1a2b…c3d4</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/22 uppercase tracking-wider font-bold mb-1">Ask Price</p>
            <p className="text-[16px] font-bold text-emerald-400 tabular-nums">0.45000 BTC</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[9.5px] text-white/28 font-bold uppercase tracking-wider">Intrinsic Value</span>
              <span className="text-[14px] font-bold tabular-nums">0.52000 BTC</span>
            </div>
            <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "86%" }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.22,1,0.36,1] }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #F7931A, #ffcf7a)" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-white/20 font-mono">≈ $44,200 USD</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/8 border border-emerald-500/18 text-emerald-400">
                {/* Tiny up arrow */}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M4 1.5v5M1.5 4L4 1.5 6.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                13.5% OFF
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Voting Power", value: "1,240.00", color: "#F7931A" },
              { label: "Lock Ends",    value: "22d 4h",   color: "#4A90E2" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/[0.025] border border-white/[0.045] px-4 py-3.5">
                <p className="text-[9px] text-white/22 font-bold uppercase tracking-wider mb-1.5">{s.label}</p>
                <p className="text-[14px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-white/20 font-bold uppercase tracking-wider">Mezo Testnet</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/65 font-bold">Live</span>
            </div>
          </div>

          <button className="w-full py-3.5 rounded-xl font-bold text-[14px] text-black transition-all duration-200 hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #F7931A 0%, #ff9e2a 100%)" }}>
            Purchase veNFT
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.07] bg-[#0c0c0c]/90 backdrop-blur-sm text-[10.5px] font-bold text-white/35 whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        <span className="dot-live scale-75" />
        Escrowless · Non-custodial · Audited
      </motion.div>
    </div>
  );
}
