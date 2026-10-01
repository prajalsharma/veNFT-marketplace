"use client";

// Named wallet steps for the buy and sell popups. Each row says what the
// wallet is about to ask for, so a prompt is never a surprise.

import { Check, Loader2 } from "lucide-react";

export type StepState = "idle" | "active" | "done" | "failed";

export function StepRow({ n, label, state, detail, href, first }: { n: number; label: string; state: StepState; detail?: string; href?: string; first: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3" style={{ borderTop: first ? undefined : "1px solid var(--hairline)", opacity: state === "idle" ? 0.55 : 1 }}>
      <span
        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold ${state === "active" ? "step-ring" : ""}`}
        style={{
          background: state === "done" ? "var(--success)" : state === "failed" ? "#EF4444" : "transparent",
          border: state === "done" || state === "failed" ? "none" : `1.5px solid ${state === "active" ? "var(--text-1)" : "var(--border-strong)"}`,
          color: state === "done" || state === "failed" ? "#fff" : "var(--text-1)",
        }}
      >
        {state === "done" ? <Check style={{ width: 13, height: 13 }} strokeWidth={3} /> : state === "failed" ? "!" : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{label}</p>
        {detail && <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{detail}</p>}
      </div>
      {state === "active" &&
        (href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold underline underline-offset-2" style={{ color: "var(--text-2)" }}>
            View
          </a>
        ) : (
          <Loader2 style={{ width: 15, height: 15, color: "var(--text-3)" }} className="animate-spin" />
        ))}
    </li>
  );
}

export function SuccessCheck() {
  return (
    <svg viewBox="0 0 52 52" className="w-14 h-14 mx-auto mb-4" aria-hidden>
      <circle cx="26" cy="26" r="24" fill="none" stroke="var(--success)" strokeWidth="2.5" opacity="0.25" />
      <path d="M15 27 l7 7 l15 -16" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="check-draw" />
    </svg>
  );
}
