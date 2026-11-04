"use client";

// The share card shown after a listing, a purchase or a sale. It previews
// the exact post (built from the transaction in lib/share.ts), opens X with
// it filled in, or copies it. Nothing is posted without the person's click.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shareText, shareUrl, xIntent, type ShareMoment } from "@/lib/share";

const HEADLINE: Record<ShareMoment["kind"], [string, string]> = {
  listed: ["You're listed. Tell your community.", "A post puts your listing in front of people who already follow you."],
  bought: ["Nice buy. Share it?", "Let your community know where you found it."],
  sold: ["Sold. Share the news?", "Let your community know it went through on Vezo."],
};

function XMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  );
}

export function SharePrompt({ moment, compact = false }: { moment: ShareMoment; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [title, sub] = HEADLINE[moment.kind];
  const text = shareText(moment);
  const url = shareUrl(moment);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked: the X button still works */ }
  };

  return (
    <div className={`rounded-2xl text-left ${compact ? "p-4" : "p-5"}`} style={{ background: "var(--bg-2)", border: "1px solid var(--hairline)" }}>
      <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{title}</p>
      {!compact && <p className="text-[14px] mt-0.5" style={{ color: "var(--text-2)" }}>{sub}</p>}
      <blockquote
        className="mt-3 rounded-xl px-3.5 py-3 text-[14px] leading-[1.55]"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text-1)" }}
        aria-label="Post preview"
      >
        {text} <span style={{ color: "var(--vezo-red-text)" }}>{url.replace(/^https:\/\/(www\.)?/, "")}</span>
      </blockquote>
      <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
        <a
          href={xIntent(moment)}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2"
          style={{ background: "#0F1419", color: "#fff" }}
        >
          <XMark /> Share on X
        </a>
        <button
          type="button"
          onClick={copy}
          className="h-11 px-4 rounded-xl text-[14px] font-semibold inline-flex items-center gap-1.5"
          style={{ background: "var(--surface)", color: "var(--text-1)", border: "1px solid var(--hairline)" }}
          aria-live="polite"
        >
          {copied ? <Check style={{ width: 15, height: 15, color: "var(--success)" }} /> : <Copy style={{ width: 15, height: 15 }} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
