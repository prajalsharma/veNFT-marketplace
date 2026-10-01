"use client";

// Site footer.
//
// Three short, product-led columns (use it, learn it, verify it), a brand
// block that says what Vezo is in one sentence, and a bottom bar carrying
// the trust signals a trader actually checks: which network, which contract
// (linked to the explorer, so it can be verified rather than believed), and
// where the code and the project live. Every destination here exists; there
// are no legal pages or community channels to link yet, so none are listed.

import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { VezoLogoMark } from "@/components/Header";
import { openOnboardingTour } from "@/components/OnboardingTour";
import { useNetwork } from "@/hooks/useNetwork";

const DOCS = "https://docs.vezo.exchange";
const GITHUB = "https://github.com/prajalsharma/veNFT-marketplace";
const X_URL = "https://x.com/VezoExchange";

type Item = { label: string; href?: string; onClick?: () => void; external?: boolean; icon?: "x" | "github" | "heart" };

const COLUMNS: { title: string; items: Item[] }[] = [
  {
    title: "Market",
    items: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Sell a veNFT", href: "/my-listings" },
      { label: "Activity", href: "/activity" },
      { label: "Analytics", href: "https://dune.com/vezo/vezo", external: true },
    ],
  },
  {
    title: "Learn",
    items: [
      { label: "How it works", onClick: openOnboardingTour },
      { label: "Buying", href: `${DOCS}/guides/buying/`, external: true },
      { label: "Selling", href: `${DOCS}/guides/selling/`, external: true },
      { label: "Fees", href: `${DOCS}/concepts/fees/`, external: true },
      { label: "FAQ", href: `${DOCS}/resources/faq/`, external: true },
    ],
  },
  {
    title: "Build",
    items: [
      { label: "Documentation", href: DOCS, external: true },
      { label: "Smart contracts", href: `${DOCS}/architecture/contracts/`, external: true },
      { label: "Security", href: `${DOCS}/architecture/security/`, external: true },
      { label: "Subgraph", href: `${DOCS}/developers/subgraph/`, external: true },
    ],
  },
  {
    // Where the project lives, grouped the way people look for it, not
    // left as bare icons in the legal row.
    title: "Connect",
    items: [
      { label: "X", href: X_URL, external: true, icon: "x" },
      { label: "GitHub", href: GITHUB, external: true, icon: "github" },
      { label: "Support Vezo", href: "https://support.vezo.exchange", icon: "heart" },
    ],
  },
];

function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z" />
    </svg>
  );
}

function XMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  );
}

function FooterLink({ item }: { item: Item }) {
  const cls =
    "footer-link inline-flex items-center gap-2 text-[15px] py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]";
  const body = (
    <>
      {item.icon && (
        <span className="w-[18px] inline-flex justify-center" aria-hidden>
          {item.icon === "x" ? <XMark size={14} /> : item.icon === "github" ? <GitHubMark size={16} /> : <Heart style={{ width: 15, height: 15 }} />}
        </span>
      )}
      {item.label}
      {item.external && <ArrowUpRight aria-hidden className="footer-ext" style={{ width: 13, height: 13 }} />}
    </>
  );
  if (item.onClick) return <button onClick={item.onClick} className={cls}>{body}</button>;
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
  ) : (
    <Link href={item.href!} className={cls}>{body}</Link>
  );
}

export function SiteFooter() {
  const { network, contracts } = useNetwork();
  const market = contracts.marketplace;
  const hasMarket = !!market && !/^0x0{40}$/i.test(market);

  return (
    <footer className="relative mt-20" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16">
        {/* Brand + columns */}
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] pt-14 md:pt-20 pb-12 md:pb-16">
          <div className="max-w-[40ch]">
            <Link href="/" aria-label="Vezo home" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]">
              <VezoLogoMark size={34} />
              <span className="text-[30px]" style={{ fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, color: "var(--text-1)" }}>vezo</span>
            </Link>
            <p className="text-[16px] leading-[1.7] mt-6" style={{ color: "var(--text-2)" }}>
              The secondary market for veBTC and veMEZO. Listings stay in the seller&apos;s wallet until one transaction settles both sides.
            </p>
            <p className="text-[15px] leading-[1.6] mt-6" style={{ color: "var(--text-2)" }}>
              Independent and free to use.{" "}
              <a href="https://support.vezo.exchange" className="footer-link font-semibold inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]" style={{ color: "var(--text-1)" }}>
                Support the build <span aria-hidden className="cta-arrow">→</span>
              </a>
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-10">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="text-[14px] font-semibold mb-4" style={{ color: "var(--text-1)" }}>{col.title}</h2>
                <ul className="space-y-1.5">
                  {col.items.map((item) => (
                    <li key={item.label}><FooterLink item={item} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar: provenance and presence */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-6 text-[13px]" style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-3)" }}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>© {new Date().getFullYear()} Vezo</span>
            <a href="https://mezo.org" target="_blank" rel="noopener noreferrer" className="footer-link footer-link--muted inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]">
              Built on Mezo <ArrowUpRight aria-hidden className="footer-ext" style={{ width: 12, height: 12 }} />
            </a>
            {hasMarket && (
              <a
                href={`${contracts.explorer}/address/${market}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Marketplace contract on Mezo ${network === "testnet" ? "Testnet" : "Mainnet"}: ${market}`}
                className="footer-link footer-link--muted inline-flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0040]"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: network === "testnet" ? "#B45309" : "var(--success)" }} aria-hidden />
                <span>{network === "testnet" ? "Testnet" : "Mainnet"} contract</span>
                <span className="font-mono text-[12px]">{market.slice(0, 6)}…{market.slice(-4)}</span>
              </a>
            )}
          </div>

        </div>
      </div>
    </footer>
  );
}
