"use client";

// The landing page is a product story told with the product itself:
//
//   1. Statement, beside a live position preview that cycles through real listings
//   2. For sellers, the side that fills the market (and leads it when empty)
//   3. The trade drawn as a position over time: pay below value, hold, unlock in full
//   4. What is listed now, as rows you can act on
//   5. How a trade settles, as the sequence it actually is
//   6. The rules
//
// Every number comes from useLiveMarket (on-chain verified listings). Market
// history lives on Activity and Dune rather than being repeated here. Each data surface designs its own
// loading, empty and failure states, so the page is complete with zero listings
// and nothing on it is ever invented. The one illustration (the position chart
// when nothing is listed) is labelled as one.

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import type { Listing } from "@/hooks/useMarketplace";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { useLiveMarket } from "@/hooks/useMarketData";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { CountdownCompact } from "@/components/CountdownTimer";
import { PositionGlyph, PriceValueBar } from "@/components/market/PositionVisuals";
import { DiscountDial } from "@/components/market/DiscountDial";
import { fmtAmount, DiscountText, GrantTag } from "@/components/VeNFTCard";

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { y: 16 },
  whileInView: { y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease },
};

const H2 = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h2
    className={`font-bold ${className}`}
    style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.75rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: "var(--text-1)", textWrap: "balance" }}
  >
    {children}
  </h2>
);

// ─── 1. Hero band ────────────────────────────────────────────────────────────

const BACKERS = [
  { name: "Supernormal Foundation", href: "https://www.supernormal.foundation", src: "/partners/supernormal-foundation.png", ratio: 671 / 143 },
  { name: "Mezo", href: "https://mezo.org", src: "/partners/mezo.svg", ratio: 4098 / 566 },
];

function Backers() {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-10">
      <p className="text-[13px] font-semibold shrink-0" style={{ color: "var(--text-3)" }}>Supported by</p>
      <ul className="flex flex-wrap items-center gap-x-10 gap-y-5">
        {BACKERS.map((b) => (
          <li key={b.name}>
            <a
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={b.name}
              title={b.name}
              className="backer block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-4"
              style={{ height: b.name === "Mezo" ? 24 : 34, width: Math.round((b.name === "Mezo" ? 24 : 34) * b.ratio) }}
            >
              {/* Official marks, unaltered: Mezo's white full mark (its guidelines
                  allow a monotone version) and Supernormal's white logo. Shown at
                  reduced opacity until hovered, so the pair reads calmly. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.name} className="block w-full h-full object-contain object-left" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroBand({ network }: { network: string }) {
  const live = useLiveMarket();
  const reduce = useReducedMotion();
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });
  return (
    <section className="band-dark relative overflow-hidden">
      {/* One restrained light source behind the dial; the only atmosphere on the page */}
      <div aria-hidden className="absolute pointer-events-none" style={{ right: "-10%", top: "-20%", width: 760, height: 760, background: "radial-gradient(closest-side, rgba(255,0,64,0.12), transparent)" }} />
      <div className="relative max-w-[1320px] mx-auto px-5 md:px-10 lg:px-16 pt-32 md:pt-40 pb-14">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-14 lg:gap-10 items-center">
          <div>
            <motion.p {...enter(0)} className="text-[15px] font-semibold mb-6 flex items-center gap-2" style={{ color: "var(--text-2)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--vezo-red)" }} />
              The veNFT market on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
            </motion.p>
            <motion.h1
              {...enter(0.06)}
              className="font-bold mb-7"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5.25rem)", lineHeight: 0.98, letterSpacing: "-0.05em", textWrap: "balance" }}
            >
              <span style={{ color: "var(--text-1)" }}>Buy locked Bitcoin </span>
              <span style={{ color: "var(--text-3)" }}>for less than it holds.</span>
            </motion.h1>
            <motion.p {...enter(0.12)} className="text-[18px] leading-[1.6] mb-10" style={{ color: "var(--text-2)", maxWidth: "48ch", textWrap: "pretty" }}>
              Vezo is the secondary market for veBTC and veMEZO. Holders who need
              liquidity sell their lock; buyers take the position, its voting power
              and its rewards at a discount. One transaction settles both sides.
            </motion.p>
            <motion.div {...enter(0.18)} className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
              <Link href="/marketplace" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
                Browse the market <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
              </Link>
              <Link href="/my-listings" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center">
                Sell a position
              </Link>
            </motion.div>
          </div>
          <motion.div {...enter(0.2)}>
            <DiscountDial listings={live.byDiscount} status={live.status} />
          </motion.div>
        </div>
        <div className="mt-16 md:mt-20 pt-8" style={{ borderTop: "1px solid var(--hairline)" }}>
          <Backers />
        </div>
      </div>
    </section>
  );
}

// ─── 2. For sellers ──────────────────────────────────────────────────────────

const SELLER_FACTS: [string, string][] = [
  ["Keep everything until it sells", "Listing is an approval, not a transfer. Your veNFT stays in your wallet, voting and earning rewards, until the moment a buyer pays."],
  ["Set the price in what you want", "BTC, MEZO or MUSD. Buyers can still pay for MUSD listings in BTC; Vezo routes the swap and you receive MUSD."],
  ["Take offers, or wait for your price", "Buyers can bid on your position directly. Accept the one you like, ignore the rest."],
  ["Pay only when it sells", "1% of the sale, taken at settlement. Listing, repricing and cancelling cost nothing but gas."],
];

function SellerSection() {
  const live = useLiveMarket();
  const empty = live.status === "empty";
  return (
    <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12 lg:gap-20 items-start">
        <div className="reveal-up lg:sticky lg:top-32">
          <H2 className="mb-5">
            {empty ? "The market is open for its next listing." : "Hold a veNFT? Sell the lock, not your patience."}
          </H2>
          <p className="text-[16px] leading-[1.7] mb-8" style={{ color: "var(--text-2)", maxWidth: "48ch" }}>
            {empty
              ? "Nothing is listed right now, which means a new listing leads the market: it is the first position every buyer sees, here and on the market page."
              : "If you need the capital locked in a veBTC or veMEZO position, list it here. Buyers see your price, your discount and your lock, and the trade settles in one transaction."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/my-listings" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
              List a position <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
            </Link>
            <a href="https://docs.vezo.exchange/guides/selling/" target="_blank" rel="noopener noreferrer" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
              How selling works
            </a>
          </div>
        </div>
        <dl>
          {SELLER_FACTS.map(([k, v], i) => (
            <div key={k} className="reveal-up grid grid-cols-[20px_1fr] gap-x-3 py-6" style={{ borderTop: i ? "1px solid var(--hairline)" : undefined }}>
              <span className="w-2 h-2 rounded-full mt-2.5" style={{ background: "var(--vezo-red)" }} />
              <div>
                <dt className="text-[18px] font-bold mb-1.5" style={{ color: "var(--text-1)", letterSpacing: "-0.015em" }}>{k}</dt>
                <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{v}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ─── 3. The trade, drawn as a position over time ─────────────────────────────

function TradeTimeline() {
  const live = useLiveMarket();
  const best = live.byDiscount.find((l) => l.discountBps !== null && Number(l.discountBps) > 0) ?? null;
  const d = best ? Number(best.discountBps) / 10_000 : 0.18;
  const illustrative = !best;

  // Geometry: value is a flat line at the top; the price line starts lower and
  // meets value at unlock. The shaded wedge between them is the discount.
  // Percent coordinates in a stretchable 100x100 box: value line near the top,
  // price line lower by the discount (clamped so tiny and huge gaps stay legible).
  const gy0 = 12, gy1 = gy0 + Math.max(0.12, Math.min(0.7, d * 2.2)) * 100;

  return (
    <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-12 lg:gap-20 items-center">
        <motion.div {...reveal}>
          <H2 className="mb-5">You pay less now. The position pays out in full at unlock.</H2>
          <p className="text-[16px] leading-[1.7] mb-4" style={{ color: "var(--text-2)", maxWidth: "52ch" }}>
            A veNFT is BTC or MEZO locked until a fixed date. A holder who needs the
            capital sooner sells the lock below its value. The buyer takes on the
            wait, and everything the position earns along the way.
          </p>
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            {illustrative
              ? "Illustration. Shapes are representative; there is no live listing to draw from right now."
              : <>Drawn from {best!.collection} #{best!.tokenId.toString()}, listed now at <DiscountText discountBps={best!.discountBps} />.</>}
          </p>
        </motion.div>

        <figure className="reveal-up rounded-2xl p-5 md:p-8" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
          {/* Labels are HTML, not SVG text: the drawing stretches to any width
              while the type stays at a readable size on every screen. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              <span className="w-4 h-[2px] rounded-full" style={{ background: "var(--text-1)" }} />
              Value held{best ? `: ${fmtAmount(best.intrinsicValue)} ${best.collection === "veBTC" ? "BTC" : "MEZO"}` : ""}
            </p>
            <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--vezo-red)" }}>
              <span className="w-4 h-[2px] rounded-full" style={{ background: "var(--vezo-red)" }} />
              Price paid{best ? `: ${fmtAmount(best.price)} ${getPaymentTokenSymbol(best.paymentToken)}` : ""}
            </p>
          </div>
          <div className="relative h-[120px] md:h-[180px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" role="img"
              aria-label="Price paid against value held, from purchase to unlock">
              <defs>
                <linearGradient id="gap" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--vezo-red)" stopOpacity="0.24" />
                  <stop offset="1" stopColor="var(--vezo-red)" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <path d={`M 0 ${gy0} L 100 ${gy0} L 0 ${gy1} Z`} fill="url(#gap)" className="chart-fade" />
              <line x1="0" y1={gy0} x2="100" y2={gy0} stroke="var(--text-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="chart-fade" />
              <line x1="0" y1={gy1} x2="100" y2={gy0} stroke="var(--vezo-red)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="chart-fade chart-fade--late" />
            </svg>
            <span className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: 0, top: `${gy1}%`, background: "var(--vezo-red)" }} />
            <span className="absolute w-2.5 h-2.5 rounded-full translate-x-1/2 -translate-y-1/2" style={{ right: 0, top: `${gy0}%`, background: "var(--text-1)" }} />
            <span
              className="absolute left-3 text-[13px] font-bold tabular-nums"
              style={{ top: `calc(${gy1}% + 10px)`, color: "var(--vezo-red)" }}
            >
              {(d * 100).toFixed(1)}% below value
            </span>
          </div>
          <div className="flex justify-between gap-3 pt-3 mt-3 text-[12px] md:text-[13px]" style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-3)" }}>
            <span>Buy</span>
            <span className="hidden sm:inline">Hold: vote and earn rewards</span>
            <span className="text-right">Unlock: withdraw in full</span>
          </div>
        </figure>
      </div>
    </section>
  );
}

// ─── 4. Listed now ───────────────────────────────────────────────────────────

function ListedNow() {
  const live = useLiveMarket();
  const rows = live.byDiscount.slice(0, 5);
  return (
    <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <motion.div {...reveal}>
          <H2>Positions you can buy today</H2>
        </motion.div>
        <Link href="/marketplace" className="text-[14px] font-semibold inline-flex items-center gap-1.5 hover:underline underline-offset-4" style={{ color: "var(--text-1)" }}>
          Open the market <ArrowRight style={{ width: 15, height: 15 }} />
        </Link>
      </div>

      {live.status === "loading" ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }} aria-busy="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex items-center gap-4 px-6 py-5" style={{ borderTop: k ? "1px solid var(--hairline)" : undefined }}>
              <div className="w-10 h-10 rounded-full skeleton" /><div className="h-4 w-40 skeleton rounded" /><div className="h-4 w-24 skeleton rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl px-6 py-14 md:px-10 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ border: "1px dashed var(--border-strong)" }}>
          <div>
            <p className="text-[18px] font-bold mb-1.5" style={{ color: "var(--text-1)" }}>
              {live.status === "error" ? "Listings could not be loaded" : "No positions are listed yet"}
            </p>
            <p className="text-[15px]" style={{ color: "var(--text-2)", maxWidth: "56ch" }}>
              {live.status === "error"
                ? "This is a connection problem on our side, not an empty market. Try again in a moment."
                : "Listings appear here the moment they go live. If you hold a veBTC or veMEZO position, listing takes two transactions and your NFT never leaves your wallet."}
            </p>
          </div>
          {live.status === "error" ? (
            <button onClick={live.refetch} className="btn-quiet h-11 px-5 rounded-lg text-[14px] font-semibold">Try again</button>
          ) : (
            <Link href="/my-listings" className="btn-buy h-11 px-5 rounded-lg text-[14px] font-semibold inline-flex items-center">List a position</Link>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}>
          {rows.map((l, k) => (
            <motion.li
              key={`${l.collection}-${l.tokenId}`}
              initial={{ y: 10 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: k * 0.05, ease }}
              style={{ borderTop: k ? "1px solid var(--hairline)" : undefined }}
            >
              <Link href="/marketplace" className="market-row grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_1.2fr_1fr_1fr_auto] items-center gap-x-4 md:gap-x-5 px-4 md:px-6 py-4 md:py-5">
                <PositionGlyph collection={l.collection} lockEnd={l.lockEnd} size={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold whitespace-nowrap truncate" style={{ color: "var(--text-1)" }}>{l.collection} <span style={{ color: "var(--text-3)" }}>#{l.tokenId.toString()}</span></span>
                    {l.isGrant && <span className="hidden sm:inline-flex"><GrantTag /></span>}
                  </div>
                  <span className="text-[13px] tabular-nums whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                    {Number(l.lockEnd) === 0 ? "Permanent lock" : <>Unlocks in <CountdownCompact lockEnd={l.lockEnd} /></>}
                  </span>
                </div>
                <div className="hidden md:block max-w-[200px]"><PriceValueBar discountBps={l.discountBps} /></div>
                <div className="hidden md:block text-[14px] tabular-nums" style={{ color: "var(--text-2)" }}>
                  Holds {fmtAmount(l.intrinsicValue)} {l.collection === "veBTC" ? "BTC" : "MEZO"}
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
                    {fmtAmount(l.price)} <span className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>{getPaymentTokenSymbol(l.paymentToken)}</span>
                  </div>
                  <div className="text-[13px] font-semibold"><DiscountText discountBps={l.discountBps} /></div>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── 5–6. Settlement and rules ───────────────────────────────────────────────

const STEPS = [
  ["The seller lists", "A price in BTC, MEZO or MUSD, and an approval for the marketplace. The veNFT stays in their wallet, still voting and earning, and they can cancel at any time."],
  ["A buyer accepts", "Or makes an offer. Offers are approvals too, so the buyer's funds stay in their own wallet until the seller accepts."],
  ["One transaction settles", "The contract checks ownership, approval and expiry, then moves the veNFT and the payment together. If any check fails, nothing moves."],
] as const;

const RULES: [string, string][] = [
  ["Protocol fee", "1% of the sale, deducted from the seller's proceeds. Buyers pay the listed price."],
  ["Fee limits", "Hard-capped at 5% in the contract. Any change waits behind a 48-hour on-chain timelock."],
  ["Custody", "None. Listings and bids are approvals; no contract ever holds a position between trades."],
  ["Audit", "The contracts were audited by the Mezo team before mainnet launch."],
];

export default function HomeClient() {
  const { network } = useNetwork();

  return (
    <div>
      <HeroBand network={network} />
      <div className="px-5 md:px-10 lg:px-16">

      {/* 2. Sellers: who fills the market, so present whatever the market holds */}
      <SellerSection />

      {/* 3. The trade */}
      <TradeTimeline />

      {/* 4. Listed now */}
      <ListedNow />

      {/* 5. Settlement: a real sequence, so it is numbered */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
        <motion.div {...reveal} className="mb-12 md:mb-16">
          <H2>How a trade settles</H2>
        </motion.div>
        <ol className="relative grid md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map(([t, b], k) => (
            <motion.li key={t} initial={{ y: 14 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay: k * 0.12, ease }}>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[13px] font-bold tabular-nums shrink-0"
                  style={k === 2 ? { background: "var(--vezo-red)", color: "#fff" } : { border: "1px solid var(--border-strong)", color: "var(--text-1)" }}>
                  {k + 1}
                </span>
                <span className="step-line h-px flex-1" style={{ background: k === 2 ? "transparent" : "var(--border-strong)" }} />
              </div>
              <h3 className="text-[19px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{t}</h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{b}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* 6. Rules */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-28 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
        <motion.div {...reveal}>
          <H2 className="mb-4">Short enough to read before your first trade</H2>
          <p className="text-[16px] leading-[1.65]" style={{ color: "var(--text-2)", maxWidth: "40ch" }}>
            The{" "}
            <a href="https://docs.vezo.exchange" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4" style={{ color: "var(--text-1)" }}>documentation</a>{" "}
            covers the contracts line by line.
          </p>
        </motion.div>
        <dl>
          {RULES.map(([k, v]) => (
            <div key={k} className="grid sm:grid-cols-[160px_1fr] gap-x-8 gap-y-1 py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
              <dt className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{k}</dt>
              <dd className="text-[15px] leading-[1.6]" style={{ color: "var(--text-2)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Close */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-24 flex flex-col md:flex-row md:items-end justify-between gap-8" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H2>See what is listed right now.</H2>
        <div className="flex flex-wrap gap-3">
          <Link href="/marketplace" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
            Browse the market <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
          </Link>
          <a href="https://dune.com/vezo/vezo" target="_blank" rel="noopener noreferrer" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
            Market data on Dune
          </a>
        </div>
      </section>
      </div>
    </div>
  );
}
