"use client";

// /partners: projects on Mezo that work alongside Vezo, and the
// infrastructure the marketplace runs on.
//
// Three views, kept in the URL hash: All (a logo directory; a tile expands
// in place to its highlights), Partners (written for Vezo's users: what each
// one lets them do with a veNFT, how that compares with selling, the steps,
// what to know first) and Integrations (what the service does inside Vezo,
// with the index's live state from /api/market-stats). Claims live in
// lib/partners.ts.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { AUROVE, GOLDSKY } from "@/lib/partners";
import { CONTRACTS } from "@/lib/contracts";
import { useMarketHistory } from "@/hooks/useMarketData";
import { AuroveMark, AurovePanel } from "@/components/landing/EcosystemPartner";
import { SupportedBy } from "@/components/landing/SupportedBy";

const H3 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h3
    id={id}
    className="font-bold mb-6"
    style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)", lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--text-1)", textWrap: "balance" }}
  >
    {children}
  </h3>
);

// Two ways out of a lock: the comparison a Vezo seller actually faces.
const CHOICES: { label: string; vezo: string; aurove: string }[] = [
  { label: "What you get", vezo: "BTC, MEZO or MUSD from the buyer", aurove: "avBTCm or avMEZOm for the full locked amount" },
  { label: "Your lock", vezo: "Goes to the buyer, with its rewards", aurove: "Stays in Mezo Earn, still earning" },
  { label: "The price", vezo: "You set it; buyers usually pay below the locked value", aurove: "One token per unit locked when you deposit" },
  { label: "Getting it back", vezo: "Sold is sold", aurove: "Redeem on Aurove for a veNFT, on Mezo's epoch timing" },
];

type View = "all" | "partners" | "integrations";
const VIEWS: { id: View; label: string; count: number }[] = [
  { id: "all", label: "All", count: 2 },
  { id: "partners", label: "Partners", count: 1 },
  { id: "integrations", label: "Integrations", count: 1 },
];
// Old and deep links land on the right view.
const HASH_VIEW: Record<string, View> = { partners: "partners", aurove: "partners", integrations: "integrations", goldsky: "integrations" };

export default function PartnersClient() {
  const [view, setView] = useState<View>("all");

  useEffect(() => {
    const read = () => setView(HASH_VIEW[window.location.hash.slice(1)] ?? "all");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = useCallback((v: View) => {
    setView(v);
    history.replaceState(null, "", v === "all" ? window.location.pathname : `#${v}`);
    document.getElementById("views")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-[100dvh] pt-32 md:pt-40 pb-20 px-5 md:px-10 lg:px-16">
      <div className="max-w-[1320px] mx-auto">
        <header className="mb-10 max-w-[60ch]">
          <h1 className="text-[34px] md:text-[44px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.04em", lineHeight: 1.02 }}>
            Partners and integrations
          </h1>
          <p className="text-[17px] leading-[1.6]" style={{ color: "var(--text-2)", textWrap: "pretty" }}>
            Projects on Mezo that give your veBTC and veMEZO more options, and the infrastructure the marketplace runs on.
          </p>
        </header>

        <div id="views" role="tablist" aria-label="Show" className="flex gap-1 mb-10 md:mb-12" style={{ borderBottom: "1px solid var(--hairline)", scrollMarginTop: "calc(var(--header-h) + 16px)" }}>
          {VIEWS.map((v) => {
            const on = view === v.id;
            return (
              <button
                key={v.id}
                role="tab"
                id={`tab-${v.id}`}
                aria-selected={on}
                aria-controls={`panel-${v.id}`}
                onClick={() => go(v.id)}
                className="relative -mb-px px-4 h-11 text-[15px] font-semibold inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0040] rounded-t-lg"
                style={{ color: on ? "var(--text-1)" : "var(--text-3)", borderBottom: `2px solid ${on ? "var(--vezo-red)" : "transparent"}` }}
              >
                {v.label}
                <span className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>{v.count}</span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
          {view === "all" && <Directory onOpen={go} />}
          {view === "partners" && <AuroveDetail />}
          {view === "integrations" && <GoldskyDetail />}
        </div>

        <section className="py-12 md:py-20 mt-12 md:mt-16" style={{ borderTop: "1px solid var(--hairline)" }}>
          <SupportedBy />
        </section>
      </div>
    </div>
  );
}

// ─── All: logo directory ─────────────────────────────────────────────────────

type Entry = "aurove" | "goldsky";

function Directory({ onOpen }: { onOpen: (v: View) => void }) {
  const [open, setOpen] = useState<Entry | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tile = (id: Entry, kind: string, line: string, logo: React.ReactNode, dark: boolean) => {
    const on = open === id;
    return (
      <button
        type="button"
        aria-expanded={on}
        aria-controls="entry-detail"
        onClick={() => setOpen(on ? null : id)}
        className={`group text-left rounded-2xl overflow-hidden flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] transition-shadow ${on ? "shadow-lg" : ""}`}
        style={{ border: `1px solid ${on ? "var(--text-1)" : "var(--hairline)"}`, background: "var(--surface)" }}
      >
        <span className={`flex items-center justify-center h-[150px] md:h-[170px] w-full ${dark ? "partner-panel !rounded-none !border-0" : ""}`} style={dark ? undefined : { background: "var(--bg-2)" }}>
          {logo}
        </span>
        <span className="flex items-start justify-between gap-4 p-5">
          <span className="min-w-0">
            <span className="flex items-baseline gap-3">
              <span className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>{id === "aurove" ? "Aurove" : "Goldsky"}</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{kind}</span>
            </span>
            <span className="block text-[14px] leading-[1.55] mt-1" style={{ color: "var(--text-2)" }}>{line}</span>
          </span>
          <ChevronDown className="shrink-0 mt-1 transition-transform duration-300" style={{ width: 18, height: 18, color: "var(--text-3)", transform: on ? "rotate(180deg)" : undefined }} />
        </span>
      </button>
    );
  };

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tile("aurove", "Partner", "Keep a veNFT earning while holding a token you can move.", <AuroveMark height={44} />, true)}
        {tile(
          "goldsky",
          "Integration",
          "Indexes every listing, sale and bid on Vezo.",
          <span className="inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GOLDSKY.symbol} alt="" width={44} height={44} />
            <span className="text-[26px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>Goldsky</span>
          </span>,
          false
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.div
            key={open}
            id="entry-detail"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl p-6 md:p-8 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-14" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              {open === "aurove" ? (
                <>
                  <div>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-3)" }}>Partner</p>
                    <h3 className="text-[24px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>Aurove</h3>
                    <p className="text-[15px] leading-[1.65] mb-6" style={{ color: "var(--text-2)", maxWidth: "46ch" }}>{AUROVE.summary}</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => onOpen("partners")} className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
                        Full details <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
                      </button>
                      <a href={AUROVE.href} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
                        Open Aurove <ArrowUpRight style={{ width: 16, height: 16 }} />
                      </a>
                    </div>
                  </div>
                  <ul>
                    {AUROVE.uses.map((u) => (
                      <li key={u.title} className="py-4" style={{ borderTop: "1px solid var(--hairline)" }}>
                        <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{u.title}</p>
                        <p className="text-[14px] leading-[1.6] mt-1" style={{ color: "var(--text-2)" }}>{u.body}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-3)" }}>Integration</p>
                    <h3 className="text-[24px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>Goldsky</h3>
                    <p className="text-[15px] leading-[1.65] mb-6" style={{ color: "var(--text-2)", maxWidth: "46ch" }}>{GOLDSKY.summary}</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => onOpen("integrations")} className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
                        Full details <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
                      </button>
                      <a href={GOLDSKY.docs} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
                        Query the subgraph <ArrowUpRight style={{ width: 16, height: 16 }} />
                      </a>
                    </div>
                  </div>
                  <div className="grid gap-5">
                    <IndexStatus />
                    <p className="text-[14px] leading-[1.6]" style={{ color: "var(--text-2)" }}>
                      <span className="font-semibold" style={{ color: "var(--text-1)" }}>Powers: </span>
                      {GOLDSKY.powers.map((x) => x.title.toLowerCase()).join(", ")}.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Partners: Aurove ────────────────────────────────────────────────────────

function AuroveDetail() {
  return (
    <>
        {/* Aurove */}
        <section id="aurove" aria-labelledby="aurove-h" className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-16 items-center pb-12 md:pb-20" style={{ scrollMarginTop: "var(--header-h)" }}>
          <AurovePanel height={72} className="min-h-[260px] md:min-h-[300px]" />
          <div>
            <h3 id="aurove-h" className="font-bold mb-5" style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)" }}>
              Ecosystem partner: <span style={{ color: "var(--vezo-red-text)" }}>Aurove</span>
            </h3>
            <p className="text-[16px] leading-[1.65] mb-7" style={{ color: "var(--text-2)", maxWidth: "48ch", textWrap: "pretty" }}>
              {AUROVE.summary}
            </p>
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
              <a href={AUROVE.earn} target="_blank" rel="noopener noreferrer" className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
                Deposit on Aurove <ArrowUpRight style={{ width: 16, height: 16 }} />
              </a>
              <a href={AUROVE.docs} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
                Read Aurove&apos;s docs <ArrowUpRight style={{ width: 16, height: 16 }} />
              </a>
            </div>
          </div>
        </section>

        {/* What you can do */}
        <section className="py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H3>What you can do with Aurove</H3>
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
        <section className="py-12 md:py-20" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H3>Sell on Vezo, or keep it earning on Aurove</H3>
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
            <Link href="/my-listings" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Sell a position <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/marketplace" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Buy a lock below its value <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H3>How to use Aurove with a Vezo position</H3>
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
        <section className="py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16" style={{ borderTop: "1px solid var(--hairline)" }}>
          <H3>Good to know before you deposit</H3>
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

    </>
  );
}

// ─── Integrations ────────────────────────────────────────────────────────────

const M = CONTRACTS.mainnet;
const INDEXED_ADDRESS: Record<string, string> = { VeNFTMarketplace: M.marketplace, VeNFTBidding: M.bidding };

function ago(sec: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

/** The index's own state, read live: proof the integration is running. */
function IndexStatus() {
  const { status, stats } = useMarketHistory();
  const ok = status === "ready" || status === "empty";
  const rows: [string, string][] = stats
    ? [
        ["Indexed through block", stats.indexedBlock ? Number(stats.indexedBlock).toLocaleString("en-US") : "—"],
        ["Listings indexed", stats.totalListings.toLocaleString("en-US")],
        ["Sales indexed", stats.totalSales.toLocaleString("en-US")],
        ["Traders", stats.participants.toLocaleString("en-US")],
      ]
    : [];
  return (
    <div className="rounded-2xl p-6 md:p-7" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <span className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GOLDSKY.symbol} alt="" width={36} height={36} />
          <span className="text-[20px] font-bold" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>Goldsky</span>
        </span>
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text-2)" }} aria-live="polite">
          <span className="w-2 h-2 rounded-full" style={{ background: ok ? "var(--success)" : status === "loading" ? "var(--text-3)" : "#F59E0B" }} />
          {status === "loading" ? "Checking the index" : ok ? `In sync · ${stats?.indexedAt ? ago(stats.indexedAt) : "live"}` : status === "stale" ? `Behind · ${stats?.indexedAt ? ago(stats.indexedAt) : ""}` : "Index unreachable"}
        </span>
      </div>
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6">
          {rows.map(([k, v]) => (
            <div key={k} className="py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
              <dt className="text-[13px]" style={{ color: "var(--text-3)" }}>{k}</dt>
              <dd className="text-[18px] font-bold tabular-nums mt-0.5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[14px] py-3" style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-3)" }}>
          {status === "loading" ? "Reading the latest indexed block…" : "Live figures are unavailable right now. Listings still load from the chain."}
        </p>
      )}
    </div>
  );
}

function GoldskyDetail() {
  return (
    <div>

      <section id="goldsky" aria-labelledby="goldsky-h" className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-16 items-center pb-12 md:pb-20" style={{ scrollMarginTop: "var(--header-h)" }}>
        <IndexStatus />
        <div>
          <h3 id="goldsky-h" className="font-bold mb-5" style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)", lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-1)" }}>
            Indexing by Goldsky
          </h3>
          <p className="text-[16px] leading-[1.65] mb-7" style={{ color: "var(--text-2)", maxWidth: "48ch", textWrap: "pretty" }}>
            {GOLDSKY.summary}
          </p>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            <a href={GOLDSKY.docs} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Query the subgraph <ArrowUpRight style={{ width: 16, height: 16 }} />
            </a>
            <a href={GOLDSKY.source} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              Subgraph source <ArrowUpRight style={{ width: 16, height: 16 }} />
            </a>
            <a href={GOLDSKY.href} target="_blank" rel="noopener noreferrer" className="btn-quiet h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2">
              goldsky.com <ArrowUpRight style={{ width: 16, height: 16 }} />
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H3>Why Vezo uses a subgraph</H3>
        <div>
          <p className="text-[16px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "62ch" }}>{GOLDSKY.why}</p>
          <p className="text-[15px] leading-[1.65] mt-5 pt-5" style={{ color: "var(--text-2)", borderTop: "1px solid var(--hairline)", maxWidth: "62ch" }}>
            <span className="font-semibold" style={{ color: "var(--text-1)" }}>If it goes down: </span>{GOLDSKY.fallback}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H3>What it powers on Vezo</H3>
        <dl>
          {GOLDSKY.powers.map((u) => (
            <div key={u.title} className="grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-1 py-5" style={{ borderTop: "1px solid var(--hairline)" }}>
              <dt className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{u.title}</dt>
              <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{u.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-12 md:py-20" style={{ borderTop: "1px solid var(--hairline)" }}>
        <H3>What it indexes</H3>
        <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[560px] text-left text-[15px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Contract", "Indexed since block", "Events"].map((h) => (
                  <th key={h} className="py-3 pr-6 font-semibold" style={{ color: "var(--text-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GOLDSKY.indexes.map((r) => (
                <tr key={r.contract} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <th scope="row" className="py-4 pr-6 font-semibold align-top" style={{ color: "var(--text-1)" }}>
                    <a href={`${M.explorer}/address/${INDEXED_ADDRESS[r.contract]}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                      {r.contract} <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                    </a>
                  </th>
                  <td className="py-4 pr-6 tabular-nums align-top" style={{ color: "var(--text-2)" }}>{r.from.toLocaleString("en-US")}</td>
                  <td className="py-4 align-top" style={{ color: "var(--text-2)" }}>{r.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
