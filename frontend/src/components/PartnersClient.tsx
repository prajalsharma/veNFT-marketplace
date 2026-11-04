"use client";

// /partners: projects on Mezo that work alongside Vezo.
//
// Written for Vezo's users: what each partner lets them do with a veNFT, how
// that compares with selling on Vezo, the steps, and what to know first.
// Partner claims live in lib/partners.ts and stay inside the partner's docs.

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AUROVE } from "@/lib/partners";
import { AurovePanel } from "@/components/landing/EcosystemPartner";
import { SupportedBy } from "@/components/landing/SupportedBy";

const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2
    id={id}
    className="font-bold mb-6"
    style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--text-1)", textWrap: "balance" }}
  >
    {children}
  </h2>
);

// Two ways out of a lock: the comparison a Vezo seller actually faces.
const CHOICES: { label: string; vezo: string; aurove: string }[] = [
  { label: "What you get", vezo: "BTC, MEZO or MUSD from the buyer", aurove: "avBTCm or avMEZOm for the full locked amount" },
  { label: "Your lock", vezo: "Goes to the buyer, with its rewards", aurove: "Stays in Mezo Earn, still earning" },
  { label: "The price", vezo: "You set it; buyers usually pay below the locked value", aurove: "One token per unit locked when you deposit" },
  { label: "Getting it back", vezo: "Sold is sold", aurove: "Redeem on Aurove for a veNFT, on Mezo's epoch timing" },
];

export default function PartnersClient() {
  return (
    <div className="min-h-[100dvh] pt-32 md:pt-40 pb-20 px-5 md:px-10 lg:px-16">
      <div className="max-w-[1320px] mx-auto">
        <header className="mb-14 md:mb-20 max-w-[60ch]">
          <h1 className="text-[36px] md:text-[52px] font-bold mb-4" style={{ color: "var(--text-1)", letterSpacing: "-0.04em", lineHeight: 1.02 }}>
            Partners
          </h1>
          <p className="text-[18px] leading-[1.6]" style={{ color: "var(--text-2)", textWrap: "pretty" }}>
            Projects on Mezo that give your veBTC and veMEZO more options, and how to use them alongside Vezo.
          </p>
        </header>

        {/* Aurove */}
        <section id="aurove" aria-labelledby="aurove-h" className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-16 items-center pb-16 md:pb-24" style={{ scrollMarginTop: "var(--header-h)" }}>
          <AurovePanel height={72} className="min-h-[300px] md:min-h-[360px]" />
          <div>
            <h2 id="aurove-h" className="font-bold mb-5" style={{ fontSize: "clamp(2rem, 3.6vw, 3rem)", lineHeight: 1.04, letterSpacing: "-0.04em", color: "var(--text-1)" }}>
              Ecosystem partner: <span style={{ color: "var(--vezo-red-text)" }}>Aurove</span>
            </h2>
            <p className="text-[17px] leading-[1.65] mb-8" style={{ color: "var(--text-2)", maxWidth: "48ch", textWrap: "pretty" }}>
              {AUROVE.summary}
            </p>
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
              <a href={AUROVE.earn} target="_blank" rel="noopener noreferrer" className="btn-brand h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
                Deposit on Aurove <ArrowUpRight style={{ width: 16, height: 16 }} />
              </a>
              <a href={AUROVE.docs} target="_blank" rel="noopener noreferrer" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
                Read Aurove&apos;s docs <ArrowUpRight style={{ width: 16, height: 16 }} />
              </a>
            </div>
          </div>
        </section>

        {/* What you can do */}
        <section className="py-14 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H2>What you can do with Aurove</H2>
          <dl>
            {AUROVE.uses.map((u) => (
              <div key={u.title} className="grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-1 py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
                <dt className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{u.title}</dt>
                <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{u.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Sell or go liquid */}
        <section className="py-14 md:py-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H2>Sell on Vezo, or keep it earning on Aurove</H2>
          <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
            <table className="w-full min-w-[560px] text-left text-[15px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="py-3 pr-6 font-semibold w-[22%]" style={{ color: "var(--text-3)" }}><span className="sr-only">Compare</span></th>
                  <th className="py-3 pr-6 font-bold text-[16px]" style={{ color: "var(--text-1)" }}>Sell on Vezo</th>
                  <th className="py-3 font-bold text-[16px]" style={{ color: "var(--text-1)" }}>Deposit on Aurove</th>
                </tr>
              </thead>
              <tbody>
                {CHOICES.map((c) => (
                  <tr key={c.label} style={{ borderTop: "1px solid var(--hairline)" }}>
                    <th scope="row" className="py-4 pr-6 font-semibold align-top" style={{ color: "var(--text-1)" }}>{c.label}</th>
                    <td className="py-4 pr-6 leading-[1.6] align-top" style={{ color: "var(--text-2)" }}>{c.vezo}</td>
                    <td className="py-4 leading-[1.6] align-top" style={{ color: "var(--text-2)" }}>{c.aurove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 mt-8">
            <Link href="/my-listings" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Sell a position <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/marketplace" className="btn-quiet h-12 px-6 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Buy a lock below its value <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="py-14 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H2>How to use Aurove with a Vezo position</H2>
          <ol>
            {AUROVE.steps.map((s, i) => (
              <li key={s} className="flex gap-5 py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
                <span className="w-7 shrink-0 text-[17px] font-bold tabular-nums" style={{ color: "var(--vezo-red-text)" }}>{i + 1}</span>
                <span className="text-[16px] leading-[1.6]" style={{ color: "var(--text-1)" }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Good to know */}
        <section className="py-14 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H2>Good to know before you deposit</H2>
          <div>
            <ul>
              {AUROVE.notes.map((n) => (
                <li key={n} className="py-4 text-[15px] leading-[1.65]" style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-2)" }}>{n}</li>
              ))}
            </ul>
            <p className="text-[14px] leading-[1.6] mt-6" style={{ color: "var(--text-3)", maxWidth: "62ch" }}>
              Aurove has backed Vezo through recurring support. Vezo doesn&apos;t run Aurove or its contracts, and nothing here is financial advice.
            </p>
          </div>
        </section>

        <section className="py-14 md:py-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <SupportedBy />
        </section>
      </div>
    </div>
  );
}
