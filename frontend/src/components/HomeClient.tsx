"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Shield, Lock, BarChart3, Zap,
  TrendingUp, MousePointer2, Github, ExternalLink
} from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Shield,
    title: "Escrowless Architecture",
    desc: "Sellers retain full control and voting rights until purchase is confirmed on-chain. Zero custody risk.",
    accent: "#F7931A",
  },
  {
    icon: BarChart3,
    title: "Real-time Value Analysis",
    desc: "Adapters compute intrinsic value of locked BTC accounting for voting power decay and lock duration.",
    accent: "#4A90E2",
  },
  {
    icon: MousePointer2,
    title: "Permissionless Market",
    desc: "Any holder can list their veNFT instantly. The protocol facilitates price discovery across the ecosystem.",
    accent: "#10B981",
  },
];

const stats = [
  { label: "Assets Supported",  value: "veBTC + veMEZO" },
  { label: "Protocol Fee",      value: "1.00%" },
  { label: "Settlement",        value: "Atomic" },
  { label: "Custody",           value: "Non-custodial" },
];

export default function HomeClient() {
  const { isConnected } = useAccount();
  const { network } = useNetwork();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpac = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>

      {/* ══════════════════════════════════════════════════════════
          HERO — asymmetric split layout
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100dvh] flex items-center pt-[68px]">

        {/* Large diagonal orange stripe behind right column */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-[0.028] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, transparent 0%, #F7931A 100%)",
            clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)",
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpac }}
          className="relative max-w-7xl mx-auto px-6 w-full py-20 lg:py-0"
        >
          <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] gap-16 xl:gap-24 items-center">

            {/* Left — copy */}
            <div>
              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.55, ease: [0.22,1,0.36,1] }}
                className="inline-flex items-center gap-2.5 mb-10"
              >
                <span className="dot-live" />
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/45">
                  Live on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22,1,0.36,1] }}
                className="text-[clamp(3rem,6.5vw,5.5rem)] font-bold leading-[0.96] tracking-[-0.035em] mb-8"
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
                className="text-[17px] text-white/45 leading-relaxed max-w-[480px] mb-12"
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
                <Link
                  href="/marketplace"
                  className="btn-primary px-8 py-4 text-[15px] rounded-xl group"
                >
                  Enter Marketplace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/docs"
                  className="btn-outline px-8 py-4 text-[15px] rounded-xl"
                >
                  Read the Docs
                </Link>
              </motion.div>

              {/* Stat strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-16 pt-8 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/30 mb-1.5">{s.label}</p>
                    <p className="text-[15px] font-bold text-white/80">{s.value}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — floating demo card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22,1,0.36,1] }}
              className="hidden lg:block"
            >
              <DemoCard />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES — staggered three-column
      ══════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">

          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#F7931A] mb-4">Why Vezo</p>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold max-w-2xl">
              Built on the foundations of{" "}
              <span className="text-white/40">security and fairness.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22,1,0.36,1] }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 overflow-hidden hover:border-white/[0.1] transition-all duration-300"
              >
                {/* Corner glow */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${f.accent}22 0%, transparent 70%)` }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 flex-shrink-0"
                  style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}28` }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                </div>
                <h3 className="text-[17px] font-bold mb-3 tracking-tight">{f.title}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA BAND
      ══════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 border-t border-white/[0.055]">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] bg-white/[0.02] px-10 md:px-16 py-16">
            {/* BG accent */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(247,147,26,0.07) 0%, transparent 60%)" }}
            />

            <div className="relative grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold mb-4 tracking-tight">
                  Join the future of Mezo governance.
                </h2>
                <p className="text-white/40 text-[15px] max-w-xl leading-relaxed">
                  Whether you are exiting a position early or accumulating discounted voting power — Vezo is where that happens.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <Link href="/marketplace" className="btn-primary px-8 py-4 text-[15px] rounded-xl">
                  Get Started
                </Link>
                <a
                  href="https://github.com/prajalsharma/veNFT-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-8 py-4 text-[15px] rounded-xl flex items-center gap-2"
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
      {/* Glow behind card */}
      <div
        className="absolute -inset-8 rounded-full opacity-20 blur-[60px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #F7931A 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div className="relative rounded-[1.5rem] border border-white/[0.08] bg-[#0a0a0a] overflow-hidden animate-float">
        {/* Top bar */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#F7931A]" />
            </div>
            <div>
              <p className="text-[13px] font-bold">veBTC #842</p>
              <p className="text-[10px] text-white/30 mt-0.5 font-mono">0x1a2b…c3d4</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-1">Price</p>
            <p className="text-[15px] font-bold text-emerald-400">0.45000 BTC</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Value bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-white/35 font-bold uppercase tracking-wider">Intrinsic Value</span>
              <span className="text-[13px] font-bold">0.52000 BTC</span>
            </div>
            <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "86%" }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.22,1,0.36,1] }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #F7931A, #ff9e2a)" }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Voting Power", value: "1,240.00" },
              { label: "Lock Ends",    value: "22d 4h" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3"
              >
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">{s.label}</p>
                <p className="text-[13px] font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Discount badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              13.5% OFF
            </span>
            <span className="text-[11px] text-white/30 font-bold uppercase tracking-wider">Mezo Testnet</span>
          </div>

          {/* CTA */}
          <button className="w-full py-3.5 rounded-xl bg-[#F7931A] text-black font-bold text-[14px] hover:bg-[#ff9e2a] transition-colors">
            Purchase veNFT
          </button>
        </div>
      </div>

      {/* Floating pill above */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-[#111] text-[11px] font-bold text-white/50 whitespace-nowrap"
      >
        <span className="dot-live scale-75" />
        Escrowless · Non-custodial · Audited
      </motion.div>
    </div>
  );
}
