"use client";

// Any registry entry's logo, and the panel it sits on.
//
// Wordmarks render as the file itself. Symbols render with the name set in
// Vezo's type beside them, for partners that publish no wordmark file. Marks
// drawn for dark backgrounds (logo.onDark) sit on .partner-panel, which stays
// dark in both themes, instead of being recoloured.

import { ArrowUpRight } from "lucide-react";
import type { Entry } from "@/lib/partners";

export function EntryMark({ entry, height = 44 }: { entry: Entry; height?: number }) {
  const { logo } = entry;
  if (logo.type === "wordmark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.src}
        alt={entry.name}
        width={Math.round(height * logo.ratio)}
        height={height}
        style={{ height, width: "auto", maxWidth: "100%" }}
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo.src} alt="" width={height} height={height} style={{ width: height, height }} />
      <span
        className="font-bold"
        style={{ fontSize: Math.round(height * 0.6), letterSpacing: "-0.03em", color: logo.onDark ? "#F5F0E6" : "var(--text-1)" }}
      >
        {entry.name}
      </span>
    </span>
  );
}

/** The entry's logo on its panel, linking to its site. */
export function EntryPanel({ entry, height = 56, className = "" }: { entry: Entry; height?: number; className?: string }) {
  const dark = !!entry.logo.onDark;
  return (
    <a
      href={entry.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${entry.name} (opens in a new tab)`}
      className={`${dark ? "partner-panel" : ""} group relative flex flex-col items-center justify-center gap-5 rounded-2xl px-8 py-12 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] ${className}`}
      style={dark ? undefined : { background: "var(--bg-2)", border: "1px solid var(--hairline)" }}
    >
      <EntryMark entry={entry} height={height} />
      {entry.quote && (
        <p className="text-[15px]" style={{ color: dark ? "rgba(245,240,230,0.72)" : "var(--text-2)" }}>&ldquo;{entry.quote}&rdquo;</p>
      )}
      <ArrowUpRight
        className="absolute top-5 right-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        style={{ width: 20, height: 20, color: dark ? "rgba(245,240,230,0.6)" : "var(--text-3)" }}
      />
    </a>
  );
}
