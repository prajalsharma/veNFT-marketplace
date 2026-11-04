"use client";

// /partners: everything comes from the registry in lib/partners.ts.
//
// Tabs: All, then one per kind that has entries (KINDS order), with counts.
// The view lives in the URL hash: #partners / #integrations open a tab, and
// #<slug> opens its kind's tab and scrolls to that entry. All is a logo
// directory whose tiles expand in place (one at a time, Escape closes) to
// the entry's highlights, live widget and a "Full details" jump.

import { Fragment, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { ENTRIES, KINDS, activeKinds, entriesOf, entryBySlug, type Entry, type Kind } from "@/lib/partners";
import { EntryMark } from "@/components/partners/EntryMark";
import { EntryDetail, LinkRow } from "@/components/partners/EntryDetail";
import { Live } from "@/components/partners/live";
import { SupportedBy } from "@/components/landing/SupportedBy";

type View = "all" | Kind;

function viewFromHash(hash: string): { view: View; slug?: string } {
  const h = hash.replace(/^#/, "");
  const kind = (Object.keys(KINDS) as Kind[]).find((k) => KINDS[k].hash === h);
  if (kind) return { view: kind };
  const entry = entryBySlug(h);
  if (entry) return { view: entry.kind, slug: entry.slug };
  return { view: "all" };
}

export default function PartnersClient() {
  const [view, setView] = useState<View>("all");
  const kinds = activeKinds();

  useEffect(() => {
    const read = () => {
      const { view: v, slug } = viewFromHash(window.location.hash);
      setView(v);
      if (slug) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: "start" })));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = useCallback((v: View, slug?: string) => {
    setView(v);
    history.replaceState(null, "", v === "all" ? window.location.pathname : `#${slug ?? KINDS[v].hash}`);
    requestAnimationFrame(() => document.getElementById(slug ?? "views")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, []);

  const tabs: { id: View; label: string; count: number }[] = [
    { id: "all", label: "All", count: ENTRIES.length },
    ...kinds.map((k) => ({ id: k, label: KINDS[k].label, count: entriesOf(k).length })),
  ];

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

        <div id="views" role="tablist" aria-label="Show" className="flex gap-1 mb-10 md:mb-12 overflow-x-auto" style={{ borderBottom: "1px solid var(--hairline)", scrollMarginTop: "calc(var(--header-h) + 16px)" }}>
          {tabs.map((t) => {
            const on = view === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                onClick={() => go(t.id)}
                className="relative -mb-px px-4 h-11 shrink-0 text-[15px] font-semibold inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0040] rounded-t-lg"
                style={{ color: on ? "var(--text-1)" : "var(--text-3)", borderBottom: `2px solid ${on ? "var(--vezo-red)" : "transparent"}` }}
              >
                {t.label}
                <span className="text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
          {view === "all" ? (
            <Directory onOpen={(e) => go(e.kind, e.slug)} />
          ) : (
            entriesOf(view).map((e, i) => (
              <div key={e.slug} className={i ? "pt-12 md:pt-20 mt-4" : ""} style={i ? { borderTop: "2px solid var(--hairline)" } : undefined}>
                <EntryDetail entry={e} />
              </div>
            ))
          )}
        </div>

        <section className="py-12 md:py-20 mt-12 md:mt-16" style={{ borderTop: "1px solid var(--hairline)" }}>
          <SupportedBy />
        </section>
      </div>
    </div>
  );
}

// ─── All: logo directory ─────────────────────────────────────────────────────

/** Columns the directory grid shows now (1 / sm:2 / lg:3), so an expansion
 *  can open directly under the row of the tile that opened it. */
function useColumns() {
  const [cols, setCols] = useState(1);
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const set = () => setCols(lg.matches ? 3 : sm.matches ? 2 : 1);
    set();
    sm.addEventListener("change", set);
    lg.addEventListener("change", set);
    return () => { sm.removeEventListener("change", set); lg.removeEventListener("change", set); };
  }, []);
  return cols;
}

function Directory({ onOpen }: { onOpen: (e: Entry) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const current = open ? entryBySlug(open) : undefined;
  const cols = useColumns();
  // The expansion goes after the last tile in the open tile's row.
  const openIndex = current ? ENTRIES.indexOf(current) : -1;
  const insertAfter = openIndex < 0 ? -1 : Math.min(ENTRIES.length - 1, Math.floor(openIndex / cols) * cols + cols - 1);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ENTRIES.map((e, i) => {
          const on = open === e.slug;
          const dark = !!e.logo.onDark;
          return (
            <Fragment key={e.slug}>
            <button
              type="button"
              aria-expanded={on}
              aria-controls="entry-detail"
              onClick={() => setOpen(on ? null : e.slug)}
              className={`text-left rounded-2xl overflow-hidden flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] transition-shadow ${on ? "shadow-lg" : ""}`}
              style={{ border: `1px solid ${on ? "var(--text-1)" : "var(--hairline)"}`, background: "var(--surface)" }}
            >
              <span className={`flex items-center justify-center h-[150px] md:h-[170px] w-full ${dark ? "partner-panel !rounded-none !border-0" : ""}`} style={dark ? undefined : { background: "var(--bg-2)" }}>
                <EntryMark entry={e} height={44} />
              </span>
              <span className="flex items-start justify-between gap-4 p-5">
                <span className="min-w-0">
                  <span className="flex items-baseline gap-3">
                    <span className="text-[17px] font-bold" style={{ color: "var(--text-1)" }}>{e.name}</span>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{KINDS[e.kind].one}</span>
                  </span>
                  <span className="block text-[14px] leading-[1.55] mt-1" style={{ color: "var(--text-2)" }}>{e.line}</span>
                </span>
                <ChevronDown className="shrink-0 mt-1 transition-transform duration-300" style={{ width: 18, height: 18, color: "var(--text-3)", transform: on ? "rotate(180deg)" : undefined }} />
              </span>
            </button>
            {i === insertAfter && current && <Expansion current={current} onOpen={onOpen} reduce={reduce} />}
            </Fragment>
          );
        })}
    </div>
  );
}

function Expansion({ current, onOpen, reduce }: { current: Entry; onOpen: (e: Entry) => void; reduce: boolean | null }) {
  return (
    <div className="col-span-full">
      <AnimatePresence initial={false} mode="wait">
        {(
          <motion.div
            key={current.slug}
            id="entry-detail"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl p-6 md:p-8 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-14" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-3)" }}>{KINDS[current.kind].one} · {current.role}</p>
                <h3 className="text-[24px] font-bold mb-3" style={{ color: "var(--text-1)", letterSpacing: "-0.03em" }}>{current.name}</h3>
                <p className="text-[15px] leading-[1.65] mb-6" style={{ color: "var(--text-2)", maxWidth: "46ch" }}>{current.summary}</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => onOpen(current)} className="btn-brand h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2">
                    Full details <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
                  </button>
                  <LinkRow links={current.links.slice(0, 1).map((l) => ({ ...l, primary: false }))} />
                </div>
              </div>
              <div className="grid gap-5 content-start">
                <Live entry={current} />
                {current.highlights.some((h) => h.body) ? (
                  <ul>
                    {current.highlights.map((h) => (
                      <li key={h.title} className="py-4" style={{ borderTop: "1px solid var(--hairline)" }}>
                        <p className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{h.title}</p>
                        {h.body && <p className="text-[14px] leading-[1.6] mt-1" style={{ color: "var(--text-2)" }}>{h.body}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {current.highlights.map((h) => (
                      <li key={h.title} className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                        <Check style={{ width: 15, height: 15, color: "var(--success)" }} /> {h.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
