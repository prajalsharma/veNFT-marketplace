"use client";

// How a trade settles, told as one listing moving through its states.
//
// One compact block: the listing card beside the three steps. The card steps
// through its states (listed, offered, settled) on its own, and follows the
// step a reader hovers, focuses or taps. The listing shown is the best live
// one, or a clearly labelled example.

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
          <p className={`${compact ? "text-[13px]" : "text-[14px]"} tabular-nums`} style={{ color: "var(--text-3)" }}>{compact ? price : listing ? "A live listing" : "Example listing"}</p>
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
      <div className={`flex justify-between ${compact ? "text-[13px]" : "text-[14px]"}`} style={{ color: "var(--text-3)" }}>
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
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Only run the cycle while the section is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The listing steps through its states on its own; hovering, focusing or
  // tapping a step holds it there. Reduced motion: no auto-advance.
  useEffect(() => {
    if (reduce || held || !visible) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 3600);
    return () => clearInterval(id);
  }, [reduce, held, visible]);

  return (
    <div
      ref={rootRef}
      className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-16 items-center"
      onMouseLeave={() => setHeld(false)}
    >
      <StateCard step={active} listing={listing} />
      <ol role="list">
        {STEPS.map((s, k) => {
          const on = active === k;
          return (
            <li key={s.title} style={{ borderTop: k ? "1px solid var(--hairline)" : undefined }}>
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onMouseEnter={() => { setActive(k); setHeld(true); }}
                onFocus={() => { setActive(k); setHeld(true); }}
                onBlur={() => setHeld(false)}
                onClick={() => { setActive(k); setHeld(true); }}
                className="w-full text-left grid grid-cols-[28px_1fr] gap-x-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0040] rounded-lg"
              >
                <span className="text-[15px] font-bold tabular-nums pt-0.5 transition-colors duration-300" style={{ color: on ? "var(--vezo-red-text)" : "var(--text-3)" }}>
                  {k + 1}
                </span>
                <span>
                  <span className="block text-[18px] font-semibold transition-colors duration-300" style={{ color: on ? "var(--text-1)" : "var(--text-2)", letterSpacing: "-0.015em" }}>
                    {s.title}
                  </span>
                  <span className="block text-[15px] leading-[1.6] mt-1.5" style={{ color: "var(--text-2)", maxWidth: "52ch", opacity: on ? 1 : 0.75 }}>
                    {s.body}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
