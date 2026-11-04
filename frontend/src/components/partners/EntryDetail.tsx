"use client";

// One entry's full write-up, built from its blocks in lib/partners.ts.
//
// Header: the live widget if the entry has one (proof it's running), else
// its logo panel; beside it the role, name, summary and links. Then each
// block in order, then the disclosure. A new block type is added to the
// Block union and rendered in BlockView.

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { KINDS, type Block, type Entry, type EntryLink } from "@/lib/partners";
import { EntryPanel } from "@/components/partners/EntryMark";
import { Live } from "@/components/partners/live";

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3
    className="font-bold mb-6"
    style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)", lineHeight: 1.1, letterSpacing: "-0.03em", color: "var(--text-1)", textWrap: "balance" }}
  >
    {children}
  </h3>
);

const external = (href: string) => /^https?:\/\//.test(href);

/** A row of buttons; internal paths use Link, others open in a new tab. */
export function LinkRow({ links, className = "" }: { links: EntryLink[]; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:flex sm:flex-wrap gap-3 ${className}`}>
      {links.map((l) => {
        const cls = `${l.primary ? "btn-brand" : "btn-quiet"} h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2`;
        return external(l.href) ? (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>
            {l.label} <ArrowUpRight style={{ width: 16, height: 16 }} />
          </a>
        ) : (
          <Link key={l.href} href={l.href} className={cls}>
            {l.label} <ArrowRight className="cta-arrow" style={{ width: 16, height: 16 }} />
          </Link>
        );
      })}
    </div>
  );
}

const split = "py-12 md:py-20 grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-16";
const rule = { borderTop: "1px solid var(--hairline)" };

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "items":
      return (
        <section className={split} style={rule}>
          <H3>{block.title}</H3>
          <dl>
            {block.items.map((u) => (
              <div key={u.title} className="grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-1 py-5" style={rule}>
                <dt className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{u.title}</dt>
                <dd className="text-[15px] leading-[1.65]" style={{ color: "var(--text-2)" }}>{u.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "steps":
      return (
        <section className={split} style={rule}>
          <H3>{block.title}</H3>
          <ol>
            {block.steps.map((s, i) => (
              <li key={s} className="flex gap-5 py-5" style={rule}>
                <span className="w-7 shrink-0 text-[17px] font-bold tabular-nums" style={{ color: "var(--vezo-red-text)" }}>{i + 1}</span>
                <span className="text-[16px] leading-[1.6]" style={{ color: "var(--text-1)" }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      );
    case "notes":
      return (
        <section className={split} style={rule}>
          <H3>{block.title}</H3>
          <ul>
            {block.notes.map((n) => (
              <li key={n} className="py-4 text-[15px] leading-[1.65]" style={{ ...rule, color: "var(--text-2)" }}>{n}</li>
            ))}
          </ul>
        </section>
      );
    case "text":
      return (
        <section className={split} style={rule}>
          <H3>{block.title}</H3>
          <div>
            <p className="text-[16px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "62ch" }}>{block.body}</p>
            {block.aside && (
              <p className="text-[15px] leading-[1.65] mt-5 pt-5" style={{ ...rule, color: "var(--text-2)", maxWidth: "62ch" }}>
                <span className="font-semibold" style={{ color: "var(--text-1)" }}>{block.aside.label}: </span>
                {block.aside.body}
              </p>
            )}
          </div>
        </section>
      );
    case "table":
      return (
        <section className="py-12 md:py-20" style={rule}>
          <H3>{block.title}</H3>
          <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
            <table className="w-full min-w-[560px] text-left text-[15px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {block.columns.map((c, i) => (
                    <th key={i} className="py-3 pr-6 font-semibold" style={{ color: i ? "var(--text-1)" : "var(--text-3)" }}>
                      {c || <span className="sr-only">Compare</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((r) => (
                  <tr key={r.cells[0]} style={rule}>
                    {r.cells.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="py-4 pr-6 font-semibold align-top" style={{ color: "var(--text-1)" }}>
                          {r.href ? (
                            <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                              {cell} <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                            </a>
                          ) : cell}
                        </th>
                      ) : (
                        <td key={i} className="py-4 pr-6 leading-[1.6] align-top tabular-nums" style={{ color: "var(--text-2)" }}>{cell}</td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.links && <LinkRow links={block.links} className="mt-8" />}
        </section>
      );
  }
}

export function EntryDetail({ entry }: { entry: Entry }) {
  return (
    <article id={entry.slug} aria-labelledby={`${entry.slug}-h`} style={{ scrollMarginTop: "calc(var(--header-h) + 16px)" }}>
      <section className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-16 items-center pb-12 md:pb-20">
        {entry.live ? <Live entry={entry} /> : <EntryPanel entry={entry} height={72} className="min-h-[260px] md:min-h-[300px]" />}
        <div>
          <p className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-3)" }}>
            {KINDS[entry.kind].one} · {entry.role}
          </p>
          <h2 id={`${entry.slug}-h`} className="font-bold mb-5" style={{ fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: "var(--text-1)" }}>
            {entry.name}
          </h2>
          <p className="text-[16px] leading-[1.65] mb-7" style={{ color: "var(--text-2)", maxWidth: "48ch", textWrap: "pretty" }}>{entry.summary}</p>
          <LinkRow links={entry.links} />
        </div>
      </section>
      {entry.blocks.map((b) => <BlockView key={b.title} block={b} />)}
      {entry.disclosure && (
        <p className="text-[14px] leading-[1.6] pt-6 pb-4" style={{ ...rule, color: "var(--text-3)", maxWidth: "70ch" }}>{entry.disclosure}</p>
      )}
    </article>
  );
}
