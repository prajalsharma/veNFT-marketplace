"use client";

// The landing page sells Vezo with the product itself. The hero's right side is
// the live market, not an illustration: real listings, real prices, real
// discounts, read from the same API the marketplace uses. Everything below
// explains, in the order a newcomer asks, what they would be buying, how a
// trade settles, and what the rules are. No figure on this page is invented.

import Link from "next/link";
import { useMemo } from "react";
import { formatEther } from "viem";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useActiveListings, type Listing } from "@/hooks/useMarketplace";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { CountdownCompact } from "@/components/CountdownTimer";
import { PositionGlyph, PriceValueBar } from "@/components/market/PositionVisuals";
import { fmtAmount, DiscountText, GrantTag } from "@/components/VeNFTCard";

const ease = [0.16, 1, 0.3, 1] as const;

function useLiveMarket() {
  const { listings, isLoading } = useActiveListings();
  return useMemo(() => {
    const open = listings.filter((l) => l.active);
    const byDiscount = [...open].sort((a, b) => Number((b.discountBps ?? -1n) - (a.discountBps ?? -1n)));
    const priced = open.filter((l) => l.discountBps !== null);
    const avg = priced.length
      ? priced.reduce((s, l) => s + Number(l.discountBps), 0) / priced.length / 100
      : null;
    return { open, top: byDiscount.slice(0, 3), best: byDiscount[0] ?? null, avg, isLoading };
  }, [listings, isLoading]);
}

// ─── Hero: the live market ───────────────────────────────────────────────────

function MarketRow({ l }: { l: Listing }) {
  return (
    <Link
      href="/marketplace"
      className="market-row grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-4"
      style={{ borderTop: "1px solid var(--hairline)" }}
    >
      <PositionGlyph collection={l.collection} lockEnd={l.lockEnd} size={36} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
            {l.collection} <span className="tabular-nums" style={{ color: "var(--text-3)" }}>#{l.tokenId.toString()}</span>
          </span>
          {l.isGrant && <GrantTag />}
        </div>
        <div className="mt-2 max-w-[180px]"><PriceValueBar discountBps={l.discountBps} /></div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
          {fmtAmount(l.price)} <span className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>{getPaymentTokenSymbol(l.paymentToken)}</span>
        </div>
        <div className="text-[13px] font-semibold"><DiscountText discountBps={l.discountBps} /></div>
      </div>
    </Link>
  );
}

function LiveMarketPanel() {
  const { open, top, avg, isLoading } = useLiveMarket();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-lg)" }}
      aria-label="Live market"
    >
      <div className="flex items-baseline justify-between px-5 pt-5 pb-4">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Market now</p>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>Live listings, best discount first</p>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-bold tabular-nums" style={{ color: avg !== null ? "var(--success)" : "var(--text-3)", letterSpacing: "-0.02em" }}>
            {avg !== null ? `${avg.toFixed(1)}%` : "n/a"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>average discount</p>
        </div>
      </div>

      {isLoading ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[36px_1fr_80px] items-center gap-x-4 px-5 py-4" style={{ borderTop: "1px solid var(--hairline)" }}>
            <div className="w-9 h-9 rounded-full skeleton" />
            <div className="space-y-2"><div className="h-3 w-28 skeleton rounded" /><div className="h-1.5 w-40 skeleton rounded-full" /></div>
            <div className="h-4 w-20 skeleton rounded justify-self-end" />
          </div>
        ))
      ) : top.length === 0 ? (
        <div className="px-5 py-10 text-center" style={{ borderTop: "1px solid var(--hairline)" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-2)" }}>No open listings right now</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Holders list positions as they need liquidity.</p>
        </div>
      ) : (
        top.map((l) => <MarketRow key={`${l.collection}-${l.tokenId}`} l={l} />)
      )}

      <Link
        href="/marketplace"
        className="market-row flex items-center justify-between px-5 py-3.5 text-[13px] font-semibold"
        style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-2)" }}
      >
        {open.length > 0 ? `View all ${open.length} listing${open.length === 1 ? "" : "s"}` : "Open the market"}
        <ArrowRight style={{ width: 14, height: 14 }} />
      </Link>
    </motion.div>
  );
}

// ─── Worked example from the best live listing ───────────────────────────────

function WorkedExample() {
  const { best } = useLiveMarket();
  const prices = usePriceTicker();
  if (!best || best.discountBps === null) return null;
  const sym = getPaymentTokenSymbol(best.paymentToken);
  const lockedSym = best.collection === "veBTC" ? "BTC" : "MEZO";
  const unit = prices[sym as "BTC" | "MEZO" | "MUSD"];
  const usd = unit ? unit * parseFloat(formatEther(best.price)) : null;
  const rows: [string, React.ReactNode][] = [
    ["You pay", <>{fmtAmount(best.price)} {sym}{usd !== null && <span style={{ color: "var(--text-3)" }}> &#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>}</>],
    ["The position holds", <>{fmtAmount(best.intrinsicValue)} {lockedSym}</>],
    ["Discount", <DiscountText key="d" discountBps={best.discountBps} />],
    ["Unlocks in", Number(best.lockEnd) === 0 ? "Permanent lock" : <CountdownCompact key="c" lockEnd={best.lockEnd} />],
    ["Voting power", parseFloat(formatEther(best.votingPower)).toLocaleString("en-US", { maximumFractionDigits: 2 })],
  ];
  return (
    <div className="rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center gap-3 px-5 py-4">
        <PositionGlyph collection={best.collection} lockEnd={best.lockEnd} size={32} />
        <p className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
          {best.collection} #{best.tokenId.toString()}
          <span className="font-normal" style={{ color: "var(--text-3)" }}>, listed now</span>
        </p>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-5 py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
            <dt className="text-[14px]" style={{ color: "var(--text-3)" }}>{k}</dt>
            <dd className="text-[14px] font-semibold tabular-nums text-right" style={{ color: "var(--text-1)" }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "The seller lists",
    body: "They set a price in BTC, MEZO or MUSD and approve the marketplace. The veNFT stays in their wallet, still voting and still earning, and they can cancel at any time.",
  },
  {
    title: "A buyer accepts the price",
    body: "Or makes an offer instead. Offers are approvals too, so the buyer's funds stay in their own wallet until the seller accepts.",
  },
  {
    title: "One transaction settles both sides",
    body: "The contract checks ownership, approval and expiry, moves the veNFT to the buyer and the payment to the seller together. If any check fails, nothing moves.",
  },
];

const RULES: [string, string][] = [
  ["Protocol fee", "1% of the sale, deducted from the seller's proceeds. Buyers pay the listed price."],
  ["Fee limits", "Hard-capped at 5% in the contract. Any change waits behind a 48-hour on-chain timelock."],
  ["Custody", "None. Listings are approvals, bids are approvals, and no contract ever holds a position between trades."],
  ["Audit", "The contracts were audited by the Mezo team before mainnet launch."],
];

export default function HomeClient() {
  const { network } = useNetwork();

  return (
    <div className="px-5 md:px-10 lg:px-16">
      {/* ══ Hero ══ */}
      <section className="max-w-[1320px] mx-auto pt-32 md:pt-40 pb-20 md:pb-28 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12 lg:gap-16 items-center">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="text-[13px] font-semibold mb-5"
            style={{ color: "var(--text-3)" }}
          >
            The veNFT market on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease }}
            className="font-bold mb-6"
            style={{ fontSize: "clamp(2.5rem, 5.2vw, 4.25rem)", lineHeight: 1.02, letterSpacing: "-0.04em", color: "var(--text-1)", textWrap: "balance" }}
          >
            Buy locked Bitcoin positions for less than they hold.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease }}
            className="text-[17px] leading-[1.6] mb-8"
            style={{ color: "var(--text-2)", maxWidth: "52ch", textWrap: "pretty" }}
          >
            Vezo is where veBTC and veMEZO holders who need liquidity sell their lock.
            Buyers get the whole position, its voting power and its rewards, at a
            discount set by the market. Every trade settles in a single transaction.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease }}
            className="flex flex-wrap gap-3"
          >
            <Link href="/marketplace" className="btn-buy h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
              Browse the market
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/my-listings" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
              Sell a position
            </Link>
          </motion.div>
        </div>
        <LiveMarketPanel />
      </section>

      {/* ══ What you are buying ══ */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-28 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-start" style={{ borderTop: "1px solid var(--hairline)" }}>
        <div className="lg:sticky lg:top-32">
          <h2 className="font-bold mb-5" style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)", textWrap: "balance" }}>
            Why a locked position trades below its value
          </h2>
          <div className="space-y-4 text-[16px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "54ch" }}>
            <p>
              Locking BTC or MEZO on Mezo mints a veNFT: a position that votes on
              emissions and earns rewards until the lock ends, when the tokens can
              be withdrawn. Until then they cannot be.
            </p>
            <p>
              A holder who needs that capital now has two choices: wait, or sell the
              lock. The discount is the price of not waiting. The buyer pays less
              than the position holds, and in return takes on the wait along with
              everything the position earns along the way.
            </p>
            <p>
              The bar on every listing shows that relationship directly: the filled
              part is what you pay, the space after it is the discount.
            </p>
          </div>
        </div>
        <WorkedExample />
      </section>

      {/* ══ How a trade settles: a real sequence, so it is numbered ══ */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
        <h2 className="font-bold mb-12 md:mb-16" style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)", maxWidth: "20ch" }}>
          How a trade settles
        </h2>
        <ol className="grid md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="pt-6" style={{ borderTop: "2px solid var(--text-1)" }}>
              <p className="text-[13px] font-semibold tabular-nums mb-3" style={{ color: "var(--text-3)" }}>Step {i + 1}</p>
              <h3 className="text-[19px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{s.title}</h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ══ The rules ══ */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-28 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
        <div>
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)" }}>
            The rules, in full
          </h2>
          <p className="text-[16px] leading-[1.65]" style={{ color: "var(--text-2)", maxWidth: "40ch" }}>
            Short enough to read before your first trade. The{" "}
            <a href="https://docs.vezo.exchange" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4" style={{ color: "var(--text-1)" }}>
              documentation
            </a>{" "}
            covers the contracts line by line.
          </p>
        </div>
        <dl>
          {RULES.map(([k, v]) => (
            <div key={k} className="grid sm:grid-cols-[160px_1fr] gap-x-8 gap-y-1 py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
              <dt className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{k}</dt>
              <dd className="text-[15px] leading-[1.6]" style={{ color: "var(--text-2)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ══ Close ══ */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-24 flex flex-col md:flex-row md:items-end justify-between gap-8" style={{ borderTop: "1px solid var(--hairline)" }}>
        <h2 className="font-bold" style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)", maxWidth: "18ch" }}>
          See what is listed right now.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/marketplace" className="btn-buy h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
            Browse the market
            <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
          <a href="https://dune.com/vezo/vezo" target="_blank" rel="noopener noreferrer" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
            Market data on Dune
          </a>
        </div>
      </section>
    </div>
  );
}
