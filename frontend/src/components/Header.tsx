"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, ArrowUpRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePriceTicker, formatUSD } from "@/hooks/usePriceTicker";
import { WalletMenu } from "@/components/header/WalletMenu";
import { NetworkMenu } from "@/components/header/NetworkMenu";

// ─── Official Vezo V-chevron mark ────────────────────────────────────────────
export function VezoLogoMark({ size = 28, notchColor }: { size?: number; notchColor?: string }) {
  const nc = notchColor ?? "var(--logo-notch)";
  const h = Math.round(size * 0.714);
  return (
    <svg width={size} height={h} viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polygon points="8,4 54,4 70,88 24,88" fill="#FF0040" />
      <polygon points="36,4 54,4 62,38 44,38" fill={nc} />
      <polygon points="132,4 86,4 70,88 116,88" fill="#FF0040" />
      <polygon points="104,4 86,4 78,38 96,38" fill={nc} />
      <line x1="70" y1="10" x2="70" y2="88" stroke={nc} strokeWidth="2" />
    </svg>
  );
}

// ─── Minimal logo lockup: mark + wordmark (no sub-tag) ───────────────────────
function VezoLogotype() {
  return (
    <motion.div
      className="flex items-center gap-2"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <VezoLogoMark size={30} />
      <span
        className="text-[22px] sm:text-[25px]"
        style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, color: "var(--text-1)", transition: "color 380ms ease" }}
      >
        vezo
      </span>
    </motion.div>
  );
}

// ─── Theme toggle hook ────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(false); // default: light
  useEffect(() => {
    const saved = localStorage.getItem("vezo-theme");
    const dark = saved === "dark"; // default light unless the user chose dark
    setIsDark(dark);
    applyTheme(dark);
  }, []);
  function applyTheme(dark: boolean) {
    const html = document.documentElement;
    html.classList.toggle("dark", dark);
    html.classList.toggle("light", !dark);
  }
  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("vezo-theme", next ? "dark" : "light");
    applyTheme(next);
  }
  return { isDark, toggle };
}

// ─── Price carousel ──────────────────────────────────────────────────────────
// Live prices scroll continuously under the bar (pauses on hover). The
// "Live prices" label and update time stay fixed at either end on desktop.
function PriceStrip() {
  const prices = usePriceTicker();
  const rows = [
    { label: "BTC", value: prices.BTC, change: prices.changes.BTC },
    { label: "MEZO", value: prices.MEZO, change: prices.changes.MEZO },
    { label: "MUSD", value: prices.MUSD, change: prices.changes.MUSD },
  ];
  const Item = ({ r }: { r: (typeof rows)[number] }) => {
    const loaded = r.value !== null;
    const up = r.change !== null && r.change > 0.05;
    const down = r.change !== null && r.change < -0.05;
    return (
      <span className="inline-flex items-baseline gap-2 px-6 shrink-0 tabular-nums">
        <span className="font-semibold" style={{ color: "var(--text-3)" }}>{r.label}</span>
        {loaded ? (
          <span className="font-semibold" style={{ color: "var(--text-1)" }}>{formatUSD(r.value)}</span>
        ) : (
          <span className="inline-block h-3 w-14 rounded skeleton self-center" aria-label={`Loading ${r.label} price`} />
        )}
        {loaded && r.change !== null && (
          <span className="font-medium" style={{ color: up ? "var(--success)" : down ? "#DC2626" : "var(--text-3)" }}>
            {up ? "+" : down ? "−" : ""}{Math.abs(r.change).toFixed(2)}%
          </span>
        )}
      </span>
    );
  };
  return (
    <div className="h-10 flex items-center text-[13px] sm:text-[14px]">
      <span className="hidden sm:inline-flex items-center shrink-0 h-full pl-5 md:pl-10 lg:pl-16 pr-4 font-semibold" style={{ color: "var(--text-3)", borderRight: "1px solid var(--hairline)" }}>
        Live prices
      </span>
      <div
        className="flex-1 h-full flex items-center overflow-hidden marquee-hover-pause"
        aria-label="Live prices"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 28px, black calc(100% - 28px), transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 28px, black calc(100% - 28px), transparent)",
        }}
      >
        <div className="marquee-track marquee-slow items-center">
          {[...rows, ...rows, ...rows, ...rows].map((r, i) => <Item key={i} r={r} />)}
        </div>
      </div>
      {prices.lastUpdated && (
        <span className="hidden md:inline shrink-0 pl-4 pr-5 md:pr-10 lg:pr-16 text-[12px]" style={{ color: "var(--text-3)" }}>
          24h · updated {new Date(prices.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
// One solid bar: identity and product navigation on the left, state and
// account on the right. Red appears once, under the current page. The price
// carousel of live prices runs beneath it.

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/my-listings", label: "Portfolio" },
  { href: "/activity", label: "Activity" },
  { href: "https://docs.vezo.exchange", label: "Docs", external: true },
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Publish the header's live height so anything pinned beneath it (network
  // notice, support nudge, sticky cards) lines up as it compacts.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: "var(--header-solid)", borderBottom: "1px solid var(--hairline)" }}
    >
      {/* The bar sits on its own layer above the carousel: the carousel's
          fade mask creates a stacking context that otherwise paints over the
          network and wallet dropdowns and swallows their clicks. */}
      <div className="relative z-20 max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16">
        <div className="flex items-center h-[64px] lg:h-[76px] gap-3">
          <Link href="/" className="flex items-center shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]" aria-label="Vezo home">
            <VezoLogotype />
          </Link>

          <nav className="hidden lg:flex items-stretch self-stretch ml-10 gap-1.5" aria-label="Primary">
            {NAV.map((l) => {
              const active = !("external" in l) && (pathname === l.href || pathname?.startsWith(l.href + "/"));
              const cls = "hdr-nav relative inline-flex items-center gap-1 px-3.5 text-[16px] font-medium focus-visible:outline-none";
              const inner = (
                <>
                  {l.label}
                  {"external" in l && <ArrowUpRight style={{ width: 13, height: 13, opacity: 0.55 }} aria-hidden />}
                  {active && <motion.span layoutId="hdr-active" className="absolute left-3 right-3 -bottom-px h-[2px] rounded-t" style={{ background: "var(--vezo-red)" }} transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                </>
              );
              return "external" in l ? (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
              ) : (
                <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cls} data-active={active || undefined}>{inner}</Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
            <div className="hidden lg:block"><NetworkMenu /></div>
            <button
              onClick={toggleTheme}
              className="hdr-ghost hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-lg"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
            </button>
            <span className="hidden lg:block w-px h-5 mx-1.5" style={{ background: "var(--hairline)" }} aria-hidden />
            <WalletMenu />
            <button
              className="hdr-ghost lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Live price carousel */}
      <div className="relative z-0" style={{ borderTop: "1px solid var(--hairline)" }}>
        <PriceStrip />
      </div>

      {/* Mobile menu: settings only; routes live in the bottom tab bar */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden overflow-hidden"
            style={{ borderTop: "1px solid var(--hairline)", background: "var(--header-solid)" }}
          >
            <div className="px-5 py-5 grid gap-5">
              <div>
                <p className="text-[13px] font-semibold mb-2 px-1" style={{ color: "var(--text-3)" }}>Network</p>
                <NetworkMenu variant="list" />
              </div>
              <button onClick={toggleTheme} className="flex items-center justify-between px-3.5 py-3 rounded-xl text-[15px] font-semibold" style={{ background: "var(--bg-2)", color: "var(--text-1)" }}>
                {isDark ? "Light mode" : "Dark mode"}
                {isDark ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
