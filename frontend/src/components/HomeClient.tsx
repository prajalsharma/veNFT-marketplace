"use client";

// The landing page is a product story told with the product itself:
//
//   1. Statement, beside a live position preview that cycles through real listings
//   2. The market band: what is buyable right now, and what has traded since launch
//   3. The trade drawn as a position over time: pay below value, hold, unlock in full
//   4. What is listed now, as rows you can act on
//   5. How a trade settles, as the sequence it actually is
//   6. The rules
//
// Every number comes from useLiveMarket (on-chain verified listings) or
// useMarketHistory (Goldsky-indexed events). Each data surface designs its own
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
import { useLiveMarket, useMarketHistory, useTweenedNumber, fmtCompact } from "@/hooks/useMarketData";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { CountdownCompact } from "@/components/CountdownTimer";
import { PositionGlyph, PriceValueBar } from "@/components/market/PositionVisuals";
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

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-center gap-2 text-[13px] font-semibold mb-4" style={{ color: "var(--text-2)" }}>
    <span className="w-3 h-[2px] rounded-full" style={{ background: "var(--vezo-red)" }} />
    {children}
  </p>
);

// ─── 1. Live position preview ────────────────────────────────────────────────

function PreviewFrame({ children, label }: { children: React.ReactNode; label: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-xl)" }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
        {label}
        <Link href="/marketplace" className="text-[13px] font-semibold inline-flex items-center gap-1 hover:underline underline-offset-4" style={{ color: "var(--text-2)" }}>
          Market <ArrowRight style={{ width: 13, height: 13 }} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function PositionAnatomy({ l, usd }: { l: Listing; usd: number | null }) {
  const lockedSym = l.collection === "veBTC" ? "BTC" : "MEZO";
  const sym = getPaymentTokenSymbol(l.paymentToken);
  const rows: [string, React.ReactNode][] = [
    ["Holds", `${fmtAmount(l.intrinsicValue)} ${lockedSym}`],
    ["Voting power", parseFloat(formatEther(l.votingPower)).toLocaleString("en-US", { maximumFractionDigits: 2 })],
    ["Unlocks in", Number(l.lockEnd) === 0 ? "Permanent lock" : <CountdownCompact key="c" lockEnd={l.lockEnd} />],
  ];
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-7">
        <PositionGlyph collection={l.collection} lockEnd={l.lockEnd} size={56} />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
              {l.collection} <span style={{ color: "var(--text-3)" }}>#{l.tokenId.toString()}</span>
            </p>
            {l.isGrant && <GrantTag />}
          </div>
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Listed now on Vezo</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 mb-1">
        <p style={{ fontSize: "2.6rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text-1)", fontVariantNumeric: "tabular-nums" }}>
          {fmtAmount(l.price)}<span className="text-[16px] font-semibold ml-2" style={{ color: "var(--text-2)", letterSpacing: 0 }}>{sym}</span>
        </p>
        <p className="text-[16px] font-bold pb-1"><DiscountText discountBps={l.discountBps} /></p>
      </div>
      <p className="text-[13px] mb-6 tabular-nums" style={{ color: "var(--text-3)" }}>
        {usd !== null ? <>&#8776; ${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</> : " "}
      </p>
      <PriceValueBar discountBps={l.discountBps} />
      <p className="text-[12px] mt-2 mb-6" style={{ color: "var(--text-3)" }}>Filled: what you pay. Gap: the discount to what it holds.</p>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
            <dt className="text-[14px]" style={{ color: "var(--text-3)" }}>{k}</dt>
            <dd className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LivePreview() {
  const live = useLiveMarket();
  const prices = usePriceTicker();
  const reduce = useReducedMotion();
  const pool = live.byDiscount.slice(0, 5);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (pool.length < 2 || paused || reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % pool.length), 5000);
    return () => clearInterval(t);
  }, [pool.length, paused, reduce]);

  const current = pool.length ? pool[i % pool.length]! : null;
  const usd = current
    ? (() => {
        const unit = prices[getPaymentTokenSymbol(current.paymentToken) as "BTC" | "MEZO" | "MUSD"];
        return unit ? unit * parseFloat(formatEther(current.price)) : null;
      })()
    : null;

  const liveLabel = (
    <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--vezo-red)" }} />
      {live.status === "ready" || live.status === "stale"
        ? `Live listing${pool.length > 1 ? ` ${(i % pool.length) + 1} of ${pool.length}` : ""}`
        : "The market"}
    </p>
  );

  if (live.status === "loading") {
    return (
      <PreviewFrame label={liveLabel}>
        <div className="p-6 space-y-5" aria-busy="true">
          <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full skeleton" /><div className="space-y-2"><div className="h-4 w-36 skeleton rounded" /><div className="h-3 w-24 skeleton rounded" /></div></div>
          <div className="h-10 w-48 skeleton rounded" />
          <div className="h-1.5 w-full skeleton rounded-full" />
          {[0, 1, 2].map((k) => <div key={k} className="h-4 w-full skeleton rounded" />)}
        </div>
      </PreviewFrame>
    );
  }

  if (!current) {
    // Zero state: no listing to show, so explain how to read one instead.
    const empty = live.status === "empty";
    return (
      <PreviewFrame label={liveLabel}>
        <div className="p-6">
          <p className="text-[17px] font-bold mb-2" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>
            {empty ? "No positions are listed right now" : "Live listings are unavailable right now"}
          </p>
          <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--text-2)" }}>
            {empty
              ? "Holders list when they need liquidity. Every listing shows the same four things:"
              : "The market is still there; this preview could not reach it. Every listing shows the same four things:"}
          </p>
          <ol className="space-y-3 mb-7">
            {[
              ["The lock ring", "how much lock time remains, against the maximum"],
              ["The price", "in BTC, MEZO or MUSD, with a live USD equivalent"],
              ["The value bar", "what you pay, against what the position holds"],
              ["The unlock date", "when the full locked amount can be withdrawn"],
            ].map(([a, b], k) => (
              <li key={a} className="grid grid-cols-[20px_1fr] gap-x-3 text-[14px]">
                <span className="tabular-nums font-semibold" style={{ color: "var(--text-3)" }}>{k + 1}</span>
                <span style={{ color: "var(--text-2)" }}><span className="font-semibold" style={{ color: "var(--text-1)" }}>{a}</span>: {b}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Link href="/my-listings" className="btn-buy h-11 px-5 rounded-lg text-[14px] font-semibold inline-flex items-center">List a position</Link>
            {!empty && (
              <button onClick={live.refetch} className="btn-quiet h-11 px-5 rounded-lg text-[14px] font-semibold">Try again</button>
            )}
          </div>
        </div>
      </PreviewFrame>
    );
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <PreviewFrame label={liveLabel}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${current.collection}-${current.tokenId}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease }}
          >
            <PositionAnatomy l={current} usd={usd} />
          </motion.div>
        </AnimatePresence>
        {pool.length > 1 && (
          <div className="flex gap-1.5 px-6 pb-5" role="tablist" aria-label="Live listings">
            {pool.map((p, k) => (
              <button
                key={`${p.collection}-${p.tokenId}`}
                role="tab"
                aria-selected={k === i % pool.length}
                aria-label={`${p.collection} #${p.tokenId.toString()}`}
                onClick={() => setI(k)}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ background: k === i % pool.length ? "var(--vezo-red)" : "var(--hairline)" }}
              />
            ))}
          </div>
        )}
      </PreviewFrame>
    </div>
  );
}

// ─── 2. Market band ──────────────────────────────────────────────────────────

function Figure({ value, label, note, tone }: { value: React.ReactNode; label: string; note?: string; tone?: "positive" | "muted" }) {
  return (
    <div className="kpi">
      <dt className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd
        className="kpi-value tabular-nums"
        style={{ color: tone === "positive" ? "var(--success)" : tone === "muted" ? "var(--text-3)" : "var(--text-1)" }}
      >
        {value}
      </dd>
      <dd className="text-[12px]" style={{ color: "var(--text-3)" }}>{note ?? " "}</dd>
    </div>
  );
}

function SkeletonFigure({ label }: { label: string }) {
  return (
    <div className="kpi" aria-busy="true">
      <dt className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd><div className="h-7 w-20 skeleton rounded mt-1" /></dd>
      <dd>&nbsp;</dd>
    </div>
  );
}

function Tweened({ n, format }: { n: number; format: (x: number) => string }) {
  const v = useTweenedNumber(n);
  return <>{v === null ? "n/a" : format(v)}</>;
}

function MarketBand() {
  const live = useLiveMarket();
  const hist = useMarketHistory();
  const s = hist.stats;
  const floor = live.floor.veMEZO ?? live.floor.veBTC;

  return (
    <section className="max-w-[1320px] mx-auto pb-20 md:pb-28">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-px rounded-2xl overflow-hidden" style={{ background: "var(--hairline)", border: "1px solid var(--hairline)" }}>
        {/* Right now */}
        <div className="p-6 md:p-8" style={{ background: "var(--surface)" }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold mb-6" style={{ color: "var(--text-1)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--vezo-red)" }} />
            Right now
          </p>
          <dl className="kpi-grid kpi-grid--2">
            {live.status === "loading" ? (
              <><SkeletonFigure label="Positions listed" /><SkeletonFigure label="Average discount" /></>
            ) : live.status === "error" ? (
              <div className="col-span-2 text-[14px]" style={{ color: "var(--text-3)" }}>
                Live listings could not be loaded.{" "}
                <button onClick={live.refetch} className="font-semibold underline underline-offset-4" style={{ color: "var(--text-1)" }}>Retry</button>
              </div>
            ) : (
              <>
                <Figure label="Positions listed" value={<Tweened n={live.count} format={(x) => Math.round(x).toString()} />} note={floor ? `from ${fmtAmount(floor.price)} ${getPaymentTokenSymbol(floor.paymentToken)}` : "none listed yet"} />
                <Figure
                  label="Average discount"
                  value={live.avgDiscountPct !== null ? <Tweened n={live.avgDiscountPct} format={(x) => `${x.toFixed(1)}%`} /> : "None yet"}
                  tone={live.avgDiscountPct !== null ? "positive" : "muted"}
                  note="below intrinsic value"
                />
              </>
            )}
          </dl>
        </div>

        {/* Since launch */}
        <div className="p-6 md:p-8" style={{ background: "var(--surface)" }}>
          <p className="text-[13px] font-semibold mb-6" style={{ color: "var(--text-1)" }}>
            Since launch
            {hist.status === "stale" && <span className="font-normal" style={{ color: "var(--text-3)" }}> · index catching up</span>}
          </p>
          <dl className="kpi-grid kpi-grid--4">
            {hist.status === "loading" ? (
              ["Sales", "MEZO traded", "MUSD traded", "Participants"].map((l) => <SkeletonFigure key={l} label={l} />)
            ) : hist.status === "error" || !s ? (
              <div className="col-span-full text-[14px]" style={{ color: "var(--text-3)" }}>
                Market history is temporarily unavailable. The{" "}
                <a href="https://dune.com/vezo/vezo" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4" style={{ color: "var(--text-1)" }}>Dune dashboard</a>{" "}
                has the same figures.
              </div>
            ) : (
              <>
                <Figure label="Sales" value={<Tweened n={s.totalSales} format={(x) => Math.round(x).toLocaleString("en-US")} />} note={`${s.totalListings.toLocaleString("en-US")} listings`} />
                <Figure label="MEZO traded" value={<Tweened n={parseFloat(s.volume.MEZO)} format={fmtCompact} />} note={s.averageSale.MEZO ? `avg ${fmtCompact(parseFloat(s.averageSale.MEZO))} per sale` : "no MEZO sales yet"} />
                <Figure label="MUSD traded" value={<Tweened n={parseFloat(s.volume.MUSD)} format={fmtCompact} />} note={s.averageSale.MUSD ? `avg ${fmtCompact(parseFloat(s.averageSale.MUSD))} per sale` : "no MUSD sales yet"} />
                <Figure label="Participants" value={<Tweened n={s.participants} format={(x) => Math.round(x).toLocaleString("en-US")} />} note={`${s.buyers} buyers, ${s.sellers} sellers`} />
              </>
            )}
          </dl>
        </div>
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
  const W = 640, x0 = 40, x1 = W - 40, yVal = 44, yPrice = yVal + Math.max(0.1, Math.min(0.55, d)) * 300, H = yPrice + 44;

  return (
    <section className="max-w-[1320px] mx-auto py-20 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-12 lg:gap-20 items-center">
        <motion.div {...reveal}>
          <Kicker>The trade</Kicker>
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

        <motion.figure {...reveal} className="rounded-2xl p-6 md:p-8" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
          <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full h-auto" role="img" aria-label="Price paid against value held, from purchase to unlock">
            <defs>
              <linearGradient id="gap" x1="0" x2="1">
                <stop offset="0" stopColor="var(--vezo-red)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--vezo-red)" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {/* Drawn on mount with CSS, never gated on scroll position: the
                final state is the default, so a paused tab, a screenshot or a
                reduced-motion setting all still show the complete chart. */}
            <path d={`M ${x0} ${yVal} L ${x1} ${yVal} L ${x0} ${yPrice} Z`} fill="url(#gap)" className="chart-fade" />
            <line x1={x0} y1={yVal} x2={x1} y2={yVal} stroke="var(--text-1)" strokeWidth="2" pathLength={1} className="chart-draw" />
            <line x1={x0} y1={yPrice} x2={x1} y2={yVal} stroke="var(--vezo-red)" strokeWidth="2.5" className="chart-fade chart-fade--late" />
            <circle cx={x0} cy={yPrice} r="5" fill="var(--vezo-red)" />
            <circle cx={x1} cy={yVal} r="5" fill="var(--text-1)" />
            <text x={x0} y={yVal - 14} fontSize="13" fontWeight="600" fill="var(--text-2)">Value held</text>
            <text x={x0 + 12} y={yPrice + 22} fontSize="13" fontWeight="600" fill="var(--vezo-red)">
              {illustrative ? "Price paid" : `Price paid · ${(d * 100).toFixed(1)}% below`}
            </text>
            <line x1={x0} y1={H + 6} x2={x1} y2={H + 6} stroke="var(--hairline)" />
            <text x={x0} y={H + 30} fontSize="12" fill="var(--text-3)">Buy</text>
            <text x={(x0 + x1) / 2} y={H + 30} fontSize="12" fill="var(--text-3)" textAnchor="middle">Hold: vote and earn rewards</text>
            <text x={x1} y={H + 30} fontSize="12" fill="var(--text-3)" textAnchor="end">Unlock: withdraw in full</text>
          </svg>
        </motion.figure>
      </div>
    </section>
  );
}

// ─── 4. Listed now ───────────────────────────────────────────────────────────

function ListedNow() {
  const live = useLiveMarket();
  const rows = live.byDiscount.slice(0, 5);
  return (
    <section className="max-w-[1320px] mx-auto py-20 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <motion.div {...reveal}>
          <Kicker>Listed now</Kicker>
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
              {live.status === "error" ? "Listings could not be loaded" : "Nothing is listed at the moment"}
            </p>
            <p className="text-[15px]" style={{ color: "var(--text-2)", maxWidth: "56ch" }}>
              {live.status === "error"
                ? "This is a connection problem on our side, not an empty market. Try again in a moment."
                : "The market fills as holders need liquidity. If you hold a veBTC or veMEZO position, you can be the first listing here."}
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
              <Link href="/marketplace" className="market-row grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1.2fr_1fr_1fr_auto] items-center gap-x-5 px-6 py-5">
                <PositionGlyph collection={l.collection} lockEnd={l.lockEnd} size={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{l.collection} <span style={{ color: "var(--text-3)" }}>#{l.tokenId.toString()}</span></span>
                    {l.isGrant && <GrantTag />}
                  </div>
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>
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
  const reduce = useReducedMotion();
  const enter = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease } });

  return (
    <div className="px-5 md:px-10 lg:px-16">
      {/* 1. Statement + live preview */}
      <section className="max-w-[1320px] mx-auto pt-32 md:pt-40 pb-14 md:pb-20 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-12 lg:gap-16 items-center">
        <div>
          <motion.div {...enter(0)}><Kicker>The veNFT market on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}</Kicker></motion.div>
          <motion.h1
            {...enter(0.05)}
            className="font-bold mb-6"
            style={{ fontSize: "clamp(2.6rem, 5.4vw, 4.5rem)", lineHeight: 1.0, letterSpacing: "-0.045em", color: "var(--text-1)", textWrap: "balance" }}
          >
            Buy locked Bitcoin positions for less than they hold.
          </motion.h1>
          <motion.p {...enter(0.1)} className="text-[18px] leading-[1.6] mb-9" style={{ color: "var(--text-2)", maxWidth: "50ch", textWrap: "pretty" }}>
            Vezo is where veBTC and veMEZO holders who need liquidity sell their lock,
            and where buyers pick up the position, its voting power and its rewards
            at a discount. Each trade settles in one transaction.
          </motion.p>
          <motion.div {...enter(0.15)} className="flex flex-wrap gap-3">
            <Link href="/marketplace" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
              Browse the market <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/my-listings" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
              Sell a position
            </Link>
          </motion.div>
        </div>
        <motion.div {...enter(0.2)}><LivePreview /></motion.div>
      </section>

      {/* 2. The market, now and since launch */}
      <MarketBand />

      {/* 3. The trade */}
      <TradeTimeline />

      {/* 4. Listed now */}
      <ListedNow />

      {/* 5. Settlement: a real sequence, so it is numbered */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-28" style={{ borderTop: "1px solid var(--hairline)" }}>
        <motion.div {...reveal} className="mb-12 md:mb-16">
          <Kicker>Settlement</Kicker>
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
                <span className="h-px flex-1" style={{ background: k === 2 ? "transparent" : "var(--border-strong)" }} />
              </div>
              <h3 className="text-[19px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{t}</h3>
              <p className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{b}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* 6. Rules */}
      <section className="max-w-[1320px] mx-auto py-20 md:py-28 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
        <motion.div {...reveal}>
          <Kicker>Rules</Kicker>
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
      <section className="max-w-[1320px] mx-auto py-20 md:py-24 flex flex-col md:flex-row md:items-end justify-between gap-8" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H2>See what is listed right now.</H2>
        <div className="flex flex-wrap gap-3">
          <Link href="/marketplace" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
            Browse the market <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
          <a href="https://dune.com/vezo/vezo" target="_blank" rel="noopener noreferrer" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center">
            Market data on Dune
          </a>
        </div>
      </section>
    </div>
  );
}
