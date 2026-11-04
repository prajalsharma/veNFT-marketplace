"use client";

// The home page's featured partner: whichever registry entry has
// placements.home (lib/partners.ts). Renders nothing when none does, so the
// home page can drop the section by data alone.

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { homeFeature } from "@/lib/partners";
import { EntryPanel } from "@/components/partners/EntryMark";

export function hasEcosystemPartner() {
  return !!homeFeature();
}

export function EcosystemPartner() {
  const entry = homeFeature();
  if (!entry?.placements?.home) return null;
  const { heading, accent } = entry.placements.home;
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
      <div>
        <h2
          className="font-bold mb-5"
          style={{ fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: "var(--text-1)", textWrap: "balance" }}
        >
          {heading} <span style={{ color: "var(--vezo-red-text)" }}>{accent}</span>
        </h2>
        <p className="text-[16px] leading-[1.6] mb-7" style={{ color: "var(--text-2)", maxWidth: "46ch", textWrap: "pretty" }}>
          {entry.summary}
        </p>
        <EntryPanel entry={entry} />
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 mt-6">
          <a href={entry.href} target="_blank" rel="noopener noreferrer" className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
            Open {entry.name} <ArrowUpRight style={{ width: 16, height: 16 }} />
          </a>
          <Link href={`/partners#${entry.slug}`} className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
            How it works with Vezo <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
      <dl>
        {entry.highlights.map((u) => (
          <div key={u.title} className="py-6" style={{ borderTop: "1px solid var(--hairline)" }}>
            <dt className="text-[18px] font-semibold mb-2" style={{ color: "var(--text-1)", letterSpacing: "-0.01em" }}>{u.title}</dt>
            {u.body && <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)", maxWidth: "52ch" }}>{u.body}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
