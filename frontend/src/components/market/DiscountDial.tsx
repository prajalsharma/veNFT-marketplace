"use client";

// The discount dial: Vezo's hero object, drawn from a live listing.
//
// Outer ring: the position's full value. The light arc is what the buyer pays,
// the red arc after it is the discount. Inner ring: lock time remaining, as a
// share of the collection's maximum. Centre: the discount itself.
//
// It cycles through live listings (best discount first) and pauses on hover.
// With no listings it draws a labelled illustration, never a fake listing.

import Link from "next/link";
import { useEffect, useState } from "react";
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

export function DiscountDial({ listings, status }: { listings: Listing[]; status: "loading" | "ready" | "empty" | "stale" | "error" }) {
  const reduce = useReducedMotion();
  const pool = listings.filter((l) => l.discountBps !== null).slice(0, 5);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (pool.length < 2 || paused || reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % pool.length), 6000);
    return () => clearInterval(t);
  }, [pool.length, paused, reduce]);

  const l = pool.length ? pool[i % pool.length]! : null;
  const illustrative = !l;
  const d = l ? Number(l.discountBps) / 10_000 : 0.15;
  const paid = Math.max(0, Math.min(1, 1 - Math.max(0, d)));
  const lock = l ? lockRemainingFraction(l.collection, l.lockEnd) : 0.62;
  const lockColor = l ? COLLECTION_COLOR[l.collection] : "var(--text-3)";
  const key = l ? `${l.collection}-${l.tokenId}` : "illustration";

  return (
    <div className="relative mx-auto w-full max-w-[460px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Dial paid={paid} lock={lock} lockColor={lockColor} animKey={key} />

      {/* Centre readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-16">
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
                <p className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>How a listing reads</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {status === "error" ? "Live listings are unreachable right now." : "No position is listed right now."}
                  <br />The ring shows price against value.
                </p>
                <Link href="/my-listings" className="inline-block mt-4 text-[13px] font-semibold underline underline-offset-4" style={{ color: "var(--text-1)" }}>
                  List a position
                </Link>
              </>
            ) : (
              <>
                <p className="tabular-nums font-bold" style={{ fontSize: "clamp(3rem, 7vw, 4.4rem)", lineHeight: 0.95, letterSpacing: "-0.05em", color: "var(--text-1)" }}>
                  {(d * 100).toFixed(1)}<span style={{ fontSize: "0.5em", letterSpacing: "-0.02em" }}>%</span>
                </p>
                <p className="text-[14px] font-semibold mt-2" style={{ color: "var(--vezo-red)" }}>below value</p>
                <p className="text-[13px] mt-4 tabular-nums" style={{ color: "var(--text-2)" }}>
                  {l!.collection} #{l!.tokenId.toString()}
                </p>
                <p className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>
                  {fmtAmount(l!.price)} {getPaymentTokenSymbol(l!.paymentToken)} for {fmtAmount(l!.intrinsicValue)} {l!.collection === "veBTC" ? "BTC" : "MEZO"}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Legend */}
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
        <p className="text-center text-[12px] mt-2" style={{ color: "var(--text-3)" }}>Illustration</p>
      )}
      {pool.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4" role="tablist" aria-label="Live listings">
          {pool.map((p, k) => (
            <button
              key={`${p.collection}-${p.tokenId}`}
              role="tab"
              aria-selected={k === i % pool.length}
              aria-label={`${p.collection} #${p.tokenId.toString()}`}
              onClick={() => setI(k)}
              className="h-1 w-6 rounded-full transition-colors"
              style={{ background: k === i % pool.length ? "var(--vezo-red)" : "var(--hairline)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
