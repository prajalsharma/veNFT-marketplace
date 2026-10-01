"use client";

// How a trade settles, told as one listing moving through its states.
//
// On wide screens the listing is pinned while the three steps scroll past;
// whichever step is centred drives the listing's state (listed, offered,
// settled). Phones get the same idea in a compact card pinned under the
// header, instead of repeating a full snapshot after every step.
// The listing shown is the best live one, or a clearly labelled example.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { Listing } from "@/hooks/useMarketplace";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { fmtAmount } from "@/components/VeNFTCard";
import { PositionGlyph } from "@/components/market/PositionVisuals";

const STEPS = [
  {
    title: "The seller lists",
    body: "A price in BTC, MEZO or MUSD, and an approval for the marketplace. The veNFT stays in the seller's wallet, still voting and earning, and they can cancel at any time.",
  },
  {
    title: "A buyer commits",
    body: "They accept the price, or make an offer the seller can take. An offer is an approval too, so the buyer's funds stay in their own wallet until the trade happens.",
  },
  {
    title: "One transaction settles both sides",
    body: "The contract checks ownership, approval and expiry, then moves the veNFT to the buyer and the payment to the seller together. If any check fails, nothing moves.",
  },
] as const;

const STATES = [
  { label: "Listed", owner: "In seller's wallet", tone: "var(--text-2)" },
  { label: "Offer accepted", owner: "Still in seller's wallet", tone: "#B45309" },
  { label: "Settled", owner: "In buyer's wallet", tone: "var(--success)" },
] as const;

function StateCard({ step, listing, compact = false }: { step: number; listing: Listing | null; compact?: boolean }) {
  const reduce = useReducedMotion();
  const s = STATES[step]!;
  const price = listing ? `${fmtAmount(listing.price)} ${getPaymentTokenSymbol(listing.paymentToken)}` : "11,500 MEZO";
  const name = listing ? `${listing.collection} #${listing.tokenId.toString()}` : "veMEZO #0000";
  return (
    <div className={`rounded-2xl ${compact ? "p-4" : "p-6 md:p-7"}`} style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-lg)" }}>
      <div className={`flex items-center gap-3 ${compact ? "mb-3" : "mb-6"}`}>
        {listing ? <PositionGlyph collection={listing.collection} lockEnd={listing.lockEnd} size={compact ? 34 : 44} /> : <span className={`${compact ? "w-[34px] h-[34px]" : "w-11 h-11"} rounded-full shrink-0`} style={{ border: "4px solid var(--hairline)" }} />}
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-[14px]" : "text-[16px]"} font-bold truncate`} style={{ color: "var(--text-1)" }}>{name}</p>
          <p className={`${compact ? "text-[12px]" : "text-[13px]"} tabular-nums`} style={{ color: "var(--text-3)" }}>{compact ? price : listing ? "A live listing" : "Example listing"}</p>
        </div>
        {compact && <StatusLabel s={s} step={step} reduce={reduce} />}
      </div>

      {!compact && (
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-[28px] font-bold tabular-nums" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>{price}</p>
          <StatusLabel s={s} step={step} reduce={reduce} />
        </div>
      )}

      {/* The three checkpoints, filling in as the story advances */}
      <ol className={`grid grid-cols-3 gap-2 ${compact ? "mb-3" : "mb-5"}`}>
        {STATES.map((st, k) => (
          <li key={st.label} className="h-1.5 rounded-full transition-colors duration-500" style={{ background: k <= step ? (k === 2 ? "var(--success)" : "var(--text-1)") : "var(--hairline)" }} />
        ))}
      </ol>
      <div className={`flex justify-between ${compact ? "text-[12px]" : "text-[13px]"}`} style={{ color: "var(--text-3)" }}>
        <span>The veNFT</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={s.owner} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.25 }} className="font-semibold" style={{ color: "var(--text-1)" }}>
            {s.owner}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusLabel({ s, step, reduce }: { s: (typeof STATES)[number]; step: number; reduce: boolean | null }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={s.label}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="text-[14px] font-semibold inline-flex items-center gap-1.5 shrink-0"
        style={{ color: s.tone }}
      >
        {step === 2 && <Check style={{ width: 15, height: 15 }} />}
        {s.label}
      </motion.span>
    </AnimatePresence>
  );
}

export function SettlementStory({ listing }: { listing: Listing | null }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  // The site header is fixed and its height varies by width (the price
  // ticker wraps), so the phone card pins to its measured bottom edge.
  const [headerH, setHeaderH] = useState(96);
  useEffect(() => {
    const h = document.querySelector("header");
    if (!h) return;
    const set = () => setHeaderH(h.getBoundingClientRect().height);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      // Desktop: the step crossing the middle of the screen. Phones: the step
      // just below the pinned card, which is what the reader is looking at.
      { rootMargin: window.matchMedia("(min-width: 1024px)").matches ? "-42% 0px -42% 0px" : "-32% 0px -58% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 lg:gap-20">
      <div className="hidden lg:block">
        <div className="sticky top-[30vh]">
          <StateCard step={active} listing={listing} />
        </div>
      </div>
      <div className="lg:hidden sticky z-10 -mx-1 px-1 pt-2 pb-3" style={{ top: headerH, background: "var(--bg)" }}>
        <StateCard step={active} listing={listing} compact />
      </div>
      <ol className="-mt-8 lg:mt-0">
        {STEPS.map((s, k) => (
          <li
            key={s.title}
            ref={(el) => { refs.current[k] = el; }}
            data-step={k}
            className="min-h-[38vh] lg:min-h-[40vh] flex flex-col justify-center py-8 lg:py-0"
            style={{ borderTop: k ? "1px solid var(--hairline)" : undefined }}
          >
            <p className="text-[14px] font-semibold tabular-nums mb-3 transition-colors duration-300" style={{ color: active === k ? "var(--vezo-red)" : "var(--text-3)" }}>
              Step {k + 1} of 3
            </p>
            <h3 className="font-bold mb-4 transition-opacity duration-300" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text-1)", opacity: active === k ? 1 : 0.55 }}>
              {s.title}
            </h3>
            <p className="text-[16px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "46ch" }}>{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
