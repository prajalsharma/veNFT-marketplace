"use client";

// FAQ accordion over the same questions the page publishes as structured data
// (VEZO_FAQS), so what search engines index and what people read never drift.
// Native <details>, so it works without JavaScript and with the keyboard.

import { Plus } from "lucide-react";
import { VEZO_FAQS } from "@/components/JsonLd";

export function Faq() {
  return (
    <div>
      {VEZO_FAQS.slice(0, 6).map((f, i) => (
        <details key={f.q} className="faq group" style={{ borderTop: i ? "1px solid var(--hairline)" : undefined }}>
          <summary className="flex items-center justify-between gap-6 py-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040] rounded">
            <span className="text-[17px] font-semibold" style={{ color: "var(--text-1)" }}>{f.q}</span>
            <Plus className="faq-icon shrink-0" style={{ width: 18, height: 18, color: "var(--text-2)" }} />
          </summary>
          <p className="faq-body pb-6 text-[15px] leading-[1.7]" style={{ color: "var(--text-2)", maxWidth: "68ch" }}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
