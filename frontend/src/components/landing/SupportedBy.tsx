"use client";

// Supported by: two backers, each a full link to its own site.
//
// Two logos are too few for a marquee, so each gets a bordered cell with one
// line saying what the relationship actually is. Marks are the organisations'
// official files used as masks in the current text colour: shapes unaltered,
// legible in both themes, and sized for equal optical weight rather than equal
// width (a wide wordmark and a stacked lockup otherwise look mismatched).

import { ArrowUpRight } from "lucide-react";

const BACKERS = [
  {
    name: "Supernormal Foundation",
    href: "https://www.supernormal.foundation",
    src: "/partners/supernormal-foundation.png",
    ratio: 671 / 143,
    height: 40,
    line: "Supports the projects building Mezo's ecosystem.",
  },
  {
    name: "Mezo",
    href: "https://mezo.org",
    src: "/partners/mezo.svg",
    ratio: 4098 / 566,
    height: 30,
    line: "The chain Vezo is built on. Every trade settles there.",
  },
];

export function SupportedBy() {
  return (
    <div>
      <p className="text-[14px] font-semibold mb-5" style={{ color: "var(--text-2)" }}>Supported by</p>
      <ul className="grid md:grid-cols-2 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }}>
        {BACKERS.map((b, i) => (
          <li key={b.name} className={i ? "md:border-l" : ""} style={{ borderColor: "var(--hairline)", borderTop: i ? "1px solid var(--hairline)" : undefined }}>
            <a
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              className="backer-cell group flex flex-col justify-between gap-10 h-full p-7 md:p-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0040]"
            >
              <div className="flex items-start justify-between gap-6">
                <span
                  role="img"
                  aria-label={b.name}
                  className="backer-mark block"
                  style={{
                    height: b.height,
                    width: Math.round(b.height * b.ratio),
                    maxWidth: "75%",
                    WebkitMaskImage: `url(${b.src})`,
                    maskImage: `url(${b.src})`,
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "left center",
                    maskPosition: "left center",
                    background: "currentColor",
                  }}
                />
                <ArrowUpRight className="backer-arrow shrink-0" style={{ width: 20, height: 20 }} />
              </div>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>{b.line}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
