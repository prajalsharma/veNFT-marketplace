"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Shield, BarChart3, MousePointer2,
  Zap, TrendingUp, Github, Lock, Activity, Layers,
  Bitcoin, Users, ChevronRight,
} from "lucide-react";
import { useRef } from "react";

const BestDealsCarousel = dynamic(() => import("@/components/BestDealsCarousel"), { ssr: false });

const features = [
  {
    icon: Shield,
    title: "Escrowless Architecture",
    desc: "Sellers retain full control and voting rights until purchase is confirmed on-chain. Zero custody risk.",
    accent: "#F7931A",
    glow: "rgba(247,147,26,0.12)",
    tag: "Security",
  },
  {
    icon: BarChart3,
    title: "Real-time Value Analysis",
    desc: "Adapters compute intrinsic value of locked BTC accounting for voting power decay and lock duration.",
    accent: "#4A90E2",
    glow: "rgba(74,144,226,0.12)",
    tag: "Analytics",
  },
  {
    icon: MousePointer2,
    title: "Permissionless Market",
    desc: "Any holder can list their veNFT instantly. The protocol facilitates price discovery across the ecosystem.",
    accent: "#10B981",
    glow: "rgba(16,185,129,0.12)",
    tag: "Open Protocol",
  },
];

const stats = [
  { label: "Assets Supported",  value: "veBTC + veMEZO", sub: "2 collections" },
  { label: "Protocol Fee",      value: "1.00%",           sub: "Competitive rate" },
  { label: "Settlement",        value: "Atomic",          sub: "Single block" },
  { label: "Custody",           value: "Non-custodial",   sub: "Your keys, your NFTs" },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect Wallet",
    desc: "Connect your MetaMask, Taho, Zerion or any EVM wallet supported on Mezo Network.",
    icon: Users,
    accent: "#F7931A",
  },
  {
    step: "02",
    title: "Browse Listings",
    desc: "Explore available veNFTs. Filter by collection, discount rate, lock duration, and more.",
    icon: Layers,
    accent: "#4A90E2",
  },
  {
    step: "03",
    title: "Acquire Positions",
    desc: "Buy veBTC or veMEZO positions at a market-determined discount. Settlement is fully atomic.",
    icon: Bitcoin,
    accent: "#10B981",
  },
];

export default function HomeClient() {
  const { isConnected } = useAccount();
  const { network } = useNetwork();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const heroOpac = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>

      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex items-center pt-[68px]">

        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-8%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.065]"
            style={{ background: "radial-gradient(ellipse, #F7931A 0%, transparent 70%)", filter: "blur(70px)" }}
          />
          <div
            className="absolute top-0 right-0 w-[55%] h-full opacity-[0.022]"
            style={{
              background: "linear-gradient(135deg, transparent 0%, #F7931A 100%)",
              clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0% 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[600px] h-[400px] opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, #4A90E2 0%, transparent 70%)", filter: "blur(80px)" }}
          />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.014]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
            }}
          />
          {/* Diagonal rule */}
          <div
            className="absolute top-[30%] left-[10%] w-[1px] h-[40%] opacity-[0.06]"
            style={{ background: "linear-gradient(to bottom, transparent, #F7931A, transparent)" }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpac }}
          className="relative max-w-7xl mx-auto px-6 w-full py-20 lg:py-0"
        >
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_500px] gap-16 xl:gap-24 items-center">

            {/* Left — copy */}
            <div>
              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.55, ease: [0.22,1,0.36,1] }}
                className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full border border-[#F7931A]/25 bg-[#F7931A]/[0.06]"
              >
                <span className="dot-live" />
                <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-[#F7931A]/85">
                  Live on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
                </span>
              </motion.div>

              {/* Headline */}
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

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.65, ease: [0.22,1,0.36,1] }}
                className="text-[16.5px] text-white/42 leading-relaxed max-w-[500px] mb-10"
              >
                Buy and sell vote-escrowed BTC and MEZO positions.
                Access governance NFTs at market-driven discounts — securely, transparently, atomically.
              </motion.p>

              {/* CTAs */}
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

              {/* Stat strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-14 pt-8 border-t border-white/[0.055] grid grid-cols-2 md:grid-cols-4 gap-5"
              >
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/25 mb-1">{s.label}</p>
                    <p className="text-[14px] font-bold text-white/88">{s.value}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — floating demo card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 28 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              transition={{ delay: 0.22, duration: 0.85, ease: [0.22,1,0.36,1] }}
              className="hidden lg:block"
            >
              <DemoCard />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════ */}
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
              <span className="text-white/35">locked positions.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-[52px] left-[calc(33.33%+2rem)] right-[calc(33.33%+2rem)] h-[1px] bg-gradient-to-r from-[#F7931A]/20 via-[#4A90E2]/20 to-[#10B981]/20" />

            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="relative rounded-2xl border border-white/[0.065] bg-[#0c0c0c] p-7"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${step.accent}18`, border: `1px solid ${step.accent}28` }}
                  >
                    <step.icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                  <span className="text-[11px] font-black text-white/18 tracking-[0.16em] mt-2.5">{step.step}</span>
                </div>
                <h3 className="text-[16px] font-bold mb-2.5 tracking-tight">{step.title}</h3>
                <p className="text-[13.5px] text-white/36 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════ */}
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
              <span className="text-white/35">security and fairness.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.65, ease: [0.22,1,0.36,1] }}
                className="group relative rounded-2xl border border-white/[0.065] bg-[#0c0c0c] p-8 overflow-hidden hover:border-white/[0.11] transition-all duration-300"
                style={{ transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                {/* Corner glow */}
                <div
                  className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${f.glow} 0%, transparent 70%)` }}
                />
                {/* Bottom line accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                  style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }}
                />

                {/* Tag */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.glow}`, border: `1px solid ${f.accent}28` }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <span
                    className="text-[9.5px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
                    style={{ color: f.accent, background: `${f.accent}12`, border: `1px solid ${f.accent}22` }}
                  >
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-[16.5px] font-bold mb-3 tracking-tight">{f.title}</h3>
                <p className="text-[13.5px] text-white/36 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          BEST DEALS CAROUSEL
      ══════════════════════════════════════════════════ */}
      <BestDealsCarousel />

      {/* ══════════════════════════════════════════════════
          CTA BAND
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="divider-glow mb-28" />
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] bg-[#0c0c0c] px-10 md:px-16 py-16">
            {/* BG accents */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 15% 50%, rgba(247,147,26,0.07) 0%, transparent 55%)" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 85% 50%, rgba(74,144,226,0.04) 0%, transparent 55%)" }}
              />
              {/* Diagonal lines */}
              <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 1px, transparent 0, transparent 50%)",
                backgroundSize: "24px 24px",
              }} />
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
                <p className="text-white/35 text-[15px] max-w-xl leading-relaxed">
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
                  <Github className="w-4 h-4" />
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

/* ── Demo card ── */
function DemoCard() {
  return (
    <div className="relative">
      {/* Outer glow */}
      <div
        className="absolute -inset-10 rounded-full opacity-20 blur-[70px] pointer-events-none animate-pulse-glow"
        style={{ background: "radial-gradient(circle, #F7931A 0%, transparent 70%)" }}
      />

      {/* Floating secondary orb */}
      <div
        className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-12 blur-[40px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #4A90E2 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div className="relative rounded-[1.75rem] border border-white/[0.08] bg-[#0c0c0c] overflow-hidden animate-float shadow-[0_24px_80px_rgba(0,0,0,0.7)]">

        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-[#F7931A] via-[#ff9e2a] to-transparent" />

        {/* Top bar */}
        <div className="px-6 py-5 border-b border-white/[0.055] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7931A]/12 border border-[#F7931A]/22 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#F7931A] fill-[#F7931A]/20" />
            </div>
            <div>
              <p className="text-[14px] font-bold">veBTC <span className="text-[#F7931A]">#842</span></p>
              <p className="text-[10px] text-white/25 mt-0.5 font-mono">0x1a2b…c3d4</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-bold mb-1">Ask Price</p>
            <p className="text-[16px] font-bold text-emerald-400 tabular-nums">0.45000 BTC</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Value bar */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[9.5px] text-white/30 font-bold uppercase tracking-wider">Intrinsic Value</span>
              <span className="text-[14px] font-bold tabular-nums">0.52000 BTC</span>
            </div>
            <div className="h-[3px] bg-white/[0.055] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "86%" }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.22,1,0.36,1] }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #F7931A, #ffcf7a)" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-white/22 font-mono">≈ $44,200 USD</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-2.5 h-2.5" />
                13.5% OFF
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Voting Power", value: "1,240.00",  accent: "#F7931A" },
              { label: "Lock Ends",    value: "22d 4h",    accent: "#4A90E2" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3.5"
              >
                <p className="text-[9px] text-white/25 font-bold uppercase tracking-wider mb-1.5">{s.label}</p>
                <p className="text-[14px] font-bold tabular-nums" style={{ color: s.accent }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Network tag */}
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-white/22 font-bold uppercase tracking-wider">Mezo Testnet</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/70 font-bold">Live</span>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full py-3.5 rounded-xl font-bold text-[14px] text-black transition-all duration-200 hover:filter hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #F7931A 0%, #ff9e2a 100%)" }}>
            Purchase veNFT
          </button>
        </div>
      </div>

      {/* Floating pill above */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-[#0c0c0c]/90 backdrop-blur-sm text-[10.5px] font-bold text-white/40 whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        <span className="dot-live scale-75" />
        Escrowless · Non-custodial · Audited
      </motion.div>
    </div>
  );
}
