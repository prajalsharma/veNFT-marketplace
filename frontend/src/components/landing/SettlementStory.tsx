"use client";

// How a trade settles, told as one listing moving through its states.
//
// On wide screens the listing is pinned while the three steps scroll past;
// whichever step is centred drives the listing's state (listed, offered,
// settled). On phones the steps simply stack, each with its own snapshot.
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

function StateCard({ step, listing }: { step: number; listing: Listing | null }) {
  const reduce = useReducedMotion();
  const s = STATES[step]!;
  const price = listing ? `${fmtAmount(listing.price)} ${getPaymentTokenSymbol(listing.paymentToken)}` : "11,500 MEZO";
  const name = listing ? `${listing.collection} #${listing.tokenId.toString()}` : "veMEZO #0000";
  return (
    <div className="rounded-2xl p-6 md:p-7" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-lg)" }}>
      <div className="flex items-center gap-3 mb-6">
        {listing ? <PositionGlyph collection={listing.collection} lockEnd={listing.lockEnd} size={44} /> : <span className="w-11 h-11 rounded-full" style={{ border: "4px solid var(--hairline)" }} />}
        <div>
          <p className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>{name}</p>
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{listing ? "A live listing" : "Example listing"}</p>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-6">
        <p className="text-[28px] font-bold tabular-nums" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>{price}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={s.label}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-[14px] font-semibold inline-flex items-center gap-1.5"
            style={{ color: s.tone }}
          >
            {step === 2 && <Check style={{ width: 15, height: 15 }} />}
            {s.label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* The three checkpoints, filling in as the story advances */}
      <ol className="grid grid-cols-3 gap-2 mb-5">
        {STATES.map((st, k) => (
          <li key={st.label} className="h-1.5 rounded-full transition-colors duration-500" style={{ background: k <= step ? (k === 2 ? "var(--success)" : "var(--text-1)") : "var(--hairline)" }} />
        ))}
      </ol>
      <div className="flex justify-between text-[13px]" style={{ color: "var(--text-3)" }}>
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

export function SettlementStory({ listing }: { listing: Listing | null }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
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
      <ol>
        {STEPS.map((s, k) => (
          <li
            key={s.title}
            ref={(el) => { refs.current[k] = el; }}
            data-step={k}
            className="lg:min-h-[55vh] flex flex-col justify-center py-8 lg:py-0"
            style={{ borderTop: k ? "1px solid var(--hairline)" : undefined }}
          >
            <p className="text-[14px] font-semibold tabular-nums mb-3 transition-colors duration-300" style={{ color: active === k ? "var(--vezo-red)" : "var(--text-3)" }}>
              Step {k + 1} of 3
            </p>
            <h3 className="font-bold mb-4 transition-opacity duration-300" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--text-1)", opacity: active === k ? 1 : 0.55 }}>
              {s.title}
            </h3>
            <p className="text-[16px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "46ch" }}>{s.body}</p>
            <div className="lg:hidden mt-6"><StateCard step={k} listing={listing} /></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
