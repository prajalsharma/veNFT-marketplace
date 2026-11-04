"use client";

// After a purchase: the registry partner that can take this veNFT (see
// placements.afterBuy and accepts in lib/partners.ts), as one short card.
// Renders nothing when no partner applies, e.g. a vesting grant for Aurove.

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { afterBuyPartner, type VeCollection } from "@/lib/partners";
import { EntryMark } from "@/components/partners/EntryMark";

export function PartnerNudge({ nft }: { nft: { collection: VeCollection; isGrant?: boolean } }) {
  const entry = afterBuyPartner(nft);
  const card = entry?.placements?.afterBuy;
  if (!entry || !card) return null;
  const dark = !!entry.logo.onDark;
  return (
    <div className="rounded-2xl overflow-hidden text-left" style={{ border: "1px solid var(--hairline)" }}>
      <div className={`flex items-center justify-between gap-3 px-4 py-3 ${dark ? "partner-panel !rounded-none !border-0" : ""}`} style={dark ? undefined : { background: "var(--bg-2)" }}>
        <EntryMark entry={entry} height={22} />
        <span className="text-[12px] font-semibold" style={{ color: dark ? "rgba(245,240,230,0.7)" : "var(--text-3)" }}>Vezo partner</span>
      </div>
      <div className="p-4" style={{ background: "var(--surface)" }}>
        <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{card.title}</p>
        <p className="text-[14px] leading-[1.55] mt-1" style={{ color: "var(--text-2)" }}>{card.body(nft.collection)}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
          <a href={card.cta.href} target="_blank" rel="noopener noreferrer" className="h-10 px-4 rounded-xl text-[14px] font-semibold inline-flex items-center gap-1.5" style={{ background: "var(--text-1)", color: "var(--bg-1)" }}>
            {card.cta.label} <ArrowUpRight style={{ width: 14, height: 14 }} />
          </a>
          <Link href={`/partners#${entry.slug}`} className="text-[14px] font-semibold underline underline-offset-4" style={{ color: "var(--text-2)" }}>
            How it works
          </Link>
        </div>
      </div>
    </div>
  );
}
