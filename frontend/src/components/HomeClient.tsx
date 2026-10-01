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
import { SettlementStory } from "@/components/landing/SettlementStory";
import { SupportedBy } from "@/components/landing/SupportedBy";
import { Faq } from "@/components/landing/Faq";
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

function HeroBand({ network }: { network: string }) {
  const live = useLiveMarket();
  const reduce = useReducedMotion();
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });
  return (
    <section className="band-dark relative overflow-hidden">
      {/* One restrained light source behind the dial; the only atmosphere on the page */}
      <div className="relative max-w-[1320px] mx-auto px-5 md:px-10 lg:px-16 pt-32 md:pt-40 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-14 lg:gap-10 items-center">
          <div>
            <motion.p {...enter(0)} className="text-[15px] font-semibold mb-6 flex items-center gap-2" style={{ color: "var(--text-2)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--vezo-red)" }} />
              The veNFT market on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
            </motion.p>
            <h1
              className="font-bold mb-7"
              style={{ fontSize: "clamp(2.75rem, 6vw, 5.25rem)", lineHeight: 0.98, letterSpacing: "-0.05em", textWrap: "balance" }}
              aria-label="Buy locked Bitcoin for less than it holds."
            >
              {["Buy", "locked", "Bitcoin", "for", "less", "than", "it", "holds."].map((w, k) => (
                <span key={k} aria-hidden className="word-rise" style={{ animationDelay: `${80 + k * 55}ms`, color: k < 3 ? "var(--text-1)" : "var(--text-3)" }}>
                  {w}{k < 7 ? "\u00a0" : ""}
                </span>
              ))}
            </h1>
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
            <DiscountDial listing={live.byDiscount[0] ?? null} status={live.status} />
          </motion.div>
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
  const ranked = live.byDiscount;
  const total = ranked.length;
  // With three or more listings, the top two are already featured above
  // (hero dial, settlement story), so the list continues from rank three.
  // A fixed cap keeps this section the same height whether the market holds
  // 3 positions or 300; the rest live one click away in the marketplace.
  const CAP = 5;
  const start = total >= 3 ? 2 : 0;
  const rows = ranked.slice(start, start + CAP);
  const remaining = total - start - rows.length;

  return (
    <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <motion.div {...reveal}>
          <H2>Positions you can buy today</H2>
          {total > 0 && (
            <p className="text-[14px] mt-3 tabular-nums" style={{ color: "var(--text-3)" }}>
              {total} listed{start ? `, continuing from #${start + 1} by discount` : ", best discount first"}
            </p>
          )}
        </motion.div>
        <Link href="/marketplace" className="text-[14px] font-semibold inline-flex items-center gap-1.5 hover:underline underline-offset-4" style={{ color: "var(--text-1)" }}>
          Open the market <ArrowRight className="cta-arrow" style={{ width: 15, height: 15 }} />
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
        <div className="rounded-2xl px-6 py-12 md:px-10 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ border: "1px dashed var(--border-strong)" }}>
          <div>
            <p className="text-[18px] font-bold mb-1.5" style={{ color: "var(--text-1)" }}>
              {live.status === "error" ? "Listings could not be loaded" : "The market is waiting for its first listing"}
            </p>
            <p className="text-[15px]" style={{ color: "var(--text-2)", maxWidth: "56ch" }}>
              {live.status === "error"
                ? "A connection problem on our side, not an empty market. Try again in a moment."
                : "A position listed now is the first one every buyer sees. Listing takes two transactions, and your veNFT stays in your wallet, voting and earning, until it sells."}
            </p>
          </div>
          {live.status === "error" ? (
            <button onClick={live.refetch} className="btn-quiet h-11 px-5 rounded-lg text-[14px] font-semibold">Try again</button>
          ) : (
            <Link href="/my-listings" className="btn-brand h-11 px-5 rounded-lg text-[14px] font-semibold inline-flex items-center">List your veNFT</Link>
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
              <Link
                href={`/marketplace?focus=${l.listingId}`}
                className="market-row listing-row grid grid-cols-[auto_auto_minmax(0,1fr)_auto] md:grid-cols-[28px_auto_1.2fr_1fr_1fr_auto_20px] items-center gap-x-3 md:gap-x-5 px-4 md:px-6 py-4 md:py-5"
              >
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-3)" }}>{start + k + 1}</span>
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
                  <div className="text-[16px] font-bold tabular-nums whitespace-nowrap" style={{ color: "var(--text-1)" }}>
                    {fmtAmount(l.price)} <span className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>{getPaymentTokenSymbol(l.paymentToken)}</span>
                  </div>
                  <div className="text-[13px] font-semibold"><DiscountText discountBps={l.discountBps} /></div>
                </div>
                <ArrowRight className="row-arrow hidden md:block" style={{ width: 16, height: 16, color: "var(--text-3)" }} />
              </Link>
            </motion.li>
          ))}
          {remaining > 0 && (
            <li style={{ borderTop: "1px solid var(--hairline)" }}>
              <Link href="/marketplace" className="market-row flex items-center justify-between px-4 md:px-6 py-4 text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>
                <span className="tabular-nums">{remaining} more listed in the market</span>
                <ArrowRight className="cta-arrow" style={{ width: 15, height: 15 }} />
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

// ─── 5–6. Settlement and rules ───────────────────────────────────────────────

const RULES: [string, string][] = [
  ["Protocol fee", "1% of the sale, deducted from the seller's proceeds. Buyers pay the listed price."],
  ["Fee limits", "Hard-capped at 5% in the contract. Any change waits behind a 48-hour on-chain timelock."],
  ["Custody", "None. Listings and bids are approvals; no contract ever holds a position between trades."],
  ["Audit", "The contracts were audited by the Mezo team before mainnet launch."],
];

export default function HomeClient() {
  const { network } = useNetwork();
  const live = useLiveMarket();
  // Spread the best listings across the page instead of repeating one: the
  // hero dial takes the best, the settlement story the next, and the list
  // continues from there. With fewer listings, each surface falls back.
  const liveForStory = live.byDiscount[1] ?? live.byDiscount[0] ?? null;

  return (
    <div>
      <HeroBand network={network} />
      <div className="px-5 md:px-10 lg:px-16">

      {/* 2. The product, straight after the promise */}
      <ListedNow />

      {/* 3. Both sides of a trade: what a buyer gets, what a seller keeps */}
      <TradeTimeline />
      <SellerSection />

      {/* 4. How a trade settles, as one listing moving through its states */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
        <motion.div {...reveal} className="mb-10 md:mb-6">
          <H2>How a trade settles</H2>
        </motion.div>
        <SettlementStory listing={liveForStory} />
      </section>

      {/* 5. Rules */}
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

      {/* 6. Supported by: trust after the product has been explained */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-24" style={{ borderTop: "1px solid var(--hairline)" }}>
        <SupportedBy />
      </section>

      {/* 7. Questions */}
      <section className="max-w-[1320px] mx-auto py-14 md:py-28 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H2>Questions</H2>
        <Faq />
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
