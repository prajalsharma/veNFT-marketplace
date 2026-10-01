"use client";

// The discount dial: Vezo's hero object, drawn from a live listing.
//
// Outer ring: the position's full value. The light arc is what the buyer pays,
// the red arc after it is the discount. Inner ring: lock time remaining, as a
// share of the collection's maximum. Centre: the discount itself.
//
// It shows the single best live listing and links to it in the marketplace
// (never to checkout). With no listings it draws a labelled illustration that
// invites a seller to take the spot.

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Listing } from "@/hooks/useMarketplace";
import { getPaymentTokenSymbol } from "@/lib/tokens";
import { fmtAmount } from "@/components/VeNFTCard";
import { lockRemainingFraction, COLLECTION_COLOR } from "./PositionVisuals";

const SIZE = 440;
const C = SIZE / 2;
const SWEEP = 300; // degrees of the gauge; the gap sits at the bottom
const START = 90 + (360 - SWEEP) / 2; // start angle, measured clockwise from 3 o'clock

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}
function arc(r: number, from: number, to: number) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function Dial({ paid, lock, lockColor, animKey }: { paid: number; lock: number; lockColor: string; animKey: string }) {
  const paidEnd = START + SWEEP * paid;
  const lockEnd = START + SWEEP * Math.max(0.004, lock);
  return (
    <svg key={animKey} viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" aria-hidden>
      {/* tick marks: a quiet instrument scale */}
      {Array.from({ length: 31 }).map((_, i) => {
        const deg = START + (SWEEP * i) / 30;
        const [x1, y1] = polar(205, deg);
        const [x2, y2] = polar(i % 5 === 0 ? 192 : 198, deg);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-3)" strokeWidth={i % 5 === 0 ? 1.5 : 1} opacity={0.5} />;
      })}
      {/* value track */}
      <path d={arc(176, START, START + SWEEP)} fill="none" stroke="var(--hairline)" strokeWidth="14" strokeLinecap="round" />
      {/* what you pay */}
      <path d={arc(176, START, paidEnd)} fill="none" stroke="var(--text-1)" strokeWidth="14" strokeLinecap="round" pathLength={1} className="dial-draw" />
      {/* the discount */}
      {paid < 0.995 && (
        <path d={arc(176, paidEnd + 2.5, START + SWEEP)} fill="none" stroke="var(--vezo-red)" strokeWidth="14" strokeLinecap="round" pathLength={1} className="dial-draw dial-draw--late" />
      )}
      {/* lock remaining */}
      <path d={arc(146, START, START + SWEEP)} fill="none" stroke="var(--hairline)" strokeWidth="5" strokeLinecap="round" />
      <path d={arc(146, START, lockEnd)} fill="none" stroke={lockColor} strokeWidth="5" strokeLinecap="round" pathLength={1} className="dial-draw dial-draw--lock" />
    </svg>
  );
}

export function DiscountDial({ listing, status }: { listing: Listing | null; status: "loading" | "ready" | "empty" | "stale" | "error" }) {
  const reduce = useReducedMotion();
  const l = listing && listing.discountBps !== null ? listing : null;
  const illustrative = !l;
  const d = l ? Number(l.discountBps) / 10_000 : 0.15;
  const paid = Math.max(0, Math.min(1, 1 - Math.max(0, d)));
  const lock = l ? lockRemainingFraction(l.collection, l.lockEnd) : 0.62;
  const lockColor = l ? COLLECTION_COLOR[l.collection] : "var(--text-3)";
  const key = l ? `${l.collection}-${l.tokenId}` : "illustration";

  const centre = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key + status}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {status === "loading" ? (
          <div className="space-y-3 flex flex-col items-center" aria-busy="true">
            <div className="h-14 w-36 skeleton rounded" />
            <div className="h-3 w-24 skeleton rounded" />
          </div>
        ) : illustrative ? (
          <>
            <p className="text-[19px] font-bold mb-2" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              {status === "error" ? "Listings are unreachable" : "This spot is open"}
            </p>
            <p className="text-[13px] leading-relaxed max-w-[26ch] mx-auto [text-wrap:balance]" style={{ color: "var(--text-2)" }}>
              {status === "error"
                ? "The market is still there; this view could not load it."
                : "The best-priced listing sits here. List yours and it could be the one."}
            </p>
            <Link href="/my-listings" className="btn-brand inline-flex items-center gap-1.5 mt-5 h-10 px-4 rounded-lg text-[13px] font-semibold">
              List your veNFT
            </Link>
          </>
        ) : (
          <>
            <p className="text-[12px] font-semibold mb-2 inline-flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
              <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: "var(--vezo-red)" }} /> Best listing right now
            </p>
            <p className="tabular-nums font-bold" style={{ fontSize: "clamp(3rem, 7vw, 4.4rem)", lineHeight: 0.95, letterSpacing: "-0.05em", color: "var(--text-1)" }}>
              {(d * 100).toFixed(1)}<span style={{ fontSize: "0.5em", letterSpacing: "-0.02em" }}>%</span>
            </p>
            <p className="text-[14px] font-semibold mt-2" style={{ color: "var(--vezo-red)" }}>below value</p>
            <p className="text-[13px] mt-3 tabular-nums" style={{ color: "var(--text-2)" }}>
              {l!.collection} #{l!.tokenId.toString()}
            </p>
            <p className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>
              {fmtAmount(l!.price)} {getPaymentTokenSymbol(l!.paymentToken)} for {fmtAmount(l!.intrinsicValue)} {l!.collection === "veBTC" ? "BTC" : "MEZO"}
            </p>
            <span className="dial-cta inline-flex items-center gap-1 mt-4 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              See it in the market <span aria-hidden className="cta-arrow">→</span>
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const body = (
    <>
      <Dial paid={paid} lock={lock} lockColor={lockColor} animKey={key} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-14 sm:px-16">{centre}</div>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[460px]">
      {l ? (
        <Link
          href={`/marketplace?focus=${l.listingId}`}
          className="dial-link relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] focus-visible:ring-offset-4"
          aria-label={`See ${l.collection} #${l.tokenId.toString()}, ${(d * 100).toFixed(1)}% below value, in the market`}
        >
          {body}
        </Link>
      ) : (
        <div className="relative">{body}</div>
      )}

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 -mt-6 text-[12px] font-semibold">
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
          <span className="w-3 h-[3px] rounded-full" style={{ background: "var(--text-1)" }} /> Price paid
        </span>
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
          <span className="w-3 h-[3px] rounded-full" style={{ background: "var(--vezo-red)" }} /> Discount
        </span>
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
          <span className="w-3 h-[3px] rounded-full" style={{ background: l ? lockColor : "var(--text-3)" }} /> Lock remaining
        </span>
      </div>
      {illustrative && status !== "loading" && (
        <p className="text-center text-[12px] mt-2" style={{ color: "var(--text-3)" }}>Illustration, not a listing</p>
      )}
    </div>
  );
}
