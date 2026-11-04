"use client";

// Ecosystem partner: Aurove, given a full section on the home page.
//
// Aurove's logo is a gold mark with a white wordmark, drawn for dark
// backgrounds, so it sits on a panel that stays dark in both themes rather
// than being recoloured. The three uses are what a Vezo user can do with it,
// in their words, accurate to Aurove's docs (see lib/partners.ts).

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AUROVE } from "@/lib/partners";

export function AuroveMark({ height = 56 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AUROVE.logo}
      alt="Aurove"
      width={Math.round(height * AUROVE.logoRatio)}
      height={height}
      style={{ height, width: "auto", maxWidth: "100%" }}
    />
  );
}

export function AurovePanel({ height = 56, className = "" }: { height?: number; className?: string }) {
  return (
    <a
      href={AUROVE.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`partner-panel group relative flex flex-col items-center justify-center gap-5 rounded-2xl px-8 py-12 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] ${className}`}
    >
      <AuroveMark height={height} />
      <p className="text-[15px]" style={{ color: "rgba(245,240,230,0.72)" }}>&ldquo;{AUROVE.tagline}&rdquo;</p>
      <ArrowUpRight className="absolute top-5 right-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ width: 20, height: 20, color: "rgba(245,240,230,0.6)" }} />
    </a>
  );
}

export function EcosystemPartner() {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
      <div>
        <h2
          className="font-bold mb-5"
          style={{ fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: "var(--text-1)", textWrap: "balance" }}
        >
          Our ecosystem partner, <span style={{ color: "var(--vezo-red-text)" }}>Aurove</span>
        </h2>
        <p className="text-[16px] leading-[1.6] mb-7" style={{ color: "var(--text-2)", maxWidth: "46ch", textWrap: "pretty" }}>
          {AUROVE.summary}
        </p>
        <AurovePanel />
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 mt-6">
          <a href={AUROVE.href} target="_blank" rel="noopener noreferrer" className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
            Open Aurove <ArrowUpRight style={{ width: 16, height: 16 }} />
          </a>
          <Link href="/partners#partners" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
            How it works with Vezo <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
      <dl>
        {AUROVE.uses.map((u) => (
          <div key={u.title} className="py-6" style={{ borderTop: "1px solid var(--hairline)" }}>
            <dt className="text-[18px] font-semibold mb-2" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>{u.title}</dt>
            <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)", maxWidth: "52ch" }}>{u.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
