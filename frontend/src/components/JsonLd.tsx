// JSON-LD structured data (schema.org) for SEO/GEO/AEO.
//
// - Organization + WebSite establish Vezo as a recognizable *entity* so AI
//   answer engines (Perplexity, ChatGPT Search, Gemini) can cite it correctly.
// - WebSite carries a SearchAction (sitelinks search box eligibility).
// - FAQPage powers featured snippets / "People Also Ask" (AEO).
//
// Rendered server-side as <script type="application/ld+json"> — the format
// Google and every major AI crawler parse first.

import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is fully static and developer-authored — no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Brand entity + site graph. Render once, in the root layout. */
export function OrganizationJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "Vezo",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.png`,
      width: 512,
      height: 512,
    },
    description: DEFAULT_DESCRIPTION,
    foundingDate: "2025",
    slogan: "Trade vote-escrowed NFTs at a discount on Bitcoin's Layer 2.",
    knowsAbout: [
      "veNFT",
      "vote-escrowed NFTs",
      "veBTC",
      "veMEZO",
      "Mezo Network",
      "Bitcoin Layer 2",
      "DeFi",
      "onchain governance",
    ],
    sameAs: [
      "https://x.com/vezo_exchange",
      "https://github.com/prajalsharma/veNFT-marketplace",
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const application = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: `${SITE_NAME} — veNFT Marketplace`,
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "DeFi / NFT Marketplace",
    operatingSystem: "Web (any modern browser)",
    browserRequirements: "Requires JavaScript and an EVM wallet",
    description: DEFAULT_DESCRIPTION,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <>
      <JsonLdScript data={organization} />
      <JsonLdScript data={website} />
      <JsonLdScript data={application} />
    </>
  );
}

/** Breadcrumb trail — helps Google render breadcrumbs in results. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
  return <JsonLdScript data={data} />;
}

/** FAQ schema — drives featured snippets & voice answers (AEO). */
export function FaqJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <JsonLdScript data={data} />;
}

/** Canonical Vezo FAQ — single source, reused by page copy and schema. */
export const VEZO_FAQS: { q: string; a: string }[] = [
  {
    q: "What is Vezo?",
    a: "Vezo is an escrowless peer-to-peer marketplace for buying and selling veBTC and veMEZO vote-escrowed NFTs (veNFTs) on Mezo, Bitcoin's Layer 2 network. Your veNFT stays in your wallet until the exact moment of sale — there is no custody and no third-party lock.",
  },
  {
    q: "What is a veNFT?",
    a: "A veNFT is a vote-escrowed NFT. On Mezo, users lock BTC or MEZO to mint veBTC or veMEZO NFTs. Each veNFT carries an intrinsic value from the locked amount, a lock duration, and live voting power that decays over time.",
  },
  {
    q: "How does Vezo let me buy veNFTs at a discount?",
    a: "Sellers often list veNFTs below their intrinsic locked value to gain immediate liquidity. Vezo surfaces each listing's intrinsic value, voting power, and lock duration so buyers can acquire voting power and locked BTC or MEZO for less than minting it directly.",
  },
  {
    q: "Is Vezo escrowless and non-custodial?",
    a: "Yes. Vezo never takes custody of your veNFT or funds. The seller keeps the NFT and the buyer keeps their funds (only an ERC-20 approval is held) until a single atomic transaction transfers the NFT and settles payment simultaneously.",
  },
  {
    q: "Which network and tokens does Vezo support?",
    a: "Vezo runs on Mezo Network (Bitcoin's Layer 2). It trades veBTC and veMEZO veNFTs, and accepts payment in BTC, MEZO, and MUSD.",
  },
  {
    q: "What are the risks of buying a veNFT on Vezo?",
    a: "A veNFT's voting power decays as its lock approaches expiry, and an expired lock cannot be traded. Always check a listing's remaining lock duration and intrinsic value before buying. Vezo shows these on every listing.",
  },
];
