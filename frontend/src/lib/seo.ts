// ─────────────────────────────────────────────────────────────────────────────
// Central SEO / GEO / AEO configuration for Vezo.
//
// SEO  — traditional search (Google/Bing): titles, descriptions, canonicals,
//        sitemap, structured data.
// GEO  — Generative Engine Optimization (Perplexity, ChatGPT Search, Gemini,
//        Google AI Overviews): explicit entity graph + AI-crawler access +
//        llms.txt so answer engines can cite Vezo accurately.
// AEO  — Answer Engine Optimization (featured snippets, voice): FAQ schema and
//        question-phrased, concise answers.
//
// One source of truth so every route stays consistent. Absolute URLs are built
// from SITE_URL; keep it protocol + host with no trailing slash.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

/** Canonical production origin. No trailing slash. */
export const SITE_URL = "https://www.vezo.exchange";

export const SITE_NAME = "Vezo";

/** Used in <title> templates: "<page> | Vezo — veNFT Marketplace on Mezo". */
export const TITLE_SUFFIX = "Vezo — veNFT Marketplace on Mezo";

export const TWITTER_HANDLE = "@vezo_exchange";

/** Primary brand description (≈155 chars — optimal meta-description length). */
export const DEFAULT_DESCRIPTION =
  "Vezo is the escrowless peer-to-peer marketplace for trading veBTC and veMEZO vote-escrowed NFTs on Mezo, Bitcoin's Layer 2. Buy veNFTs at a discount and unlock voting power — your NFT never leaves your wallet until the moment of sale.";

/** Keyword universe — crypto / Bitcoin / Web3 intent, broad + long-tail. */
export const KEYWORDS = [
  "Vezo",
  "veNFT marketplace",
  "veBTC",
  "veMEZO",
  "vote-escrowed NFT",
  "Mezo Network",
  "Mezo veNFT",
  "Bitcoin L2",
  "Bitcoin Layer 2",
  "escrowless NFT marketplace",
  "veNFT trading",
  "buy veNFT at a discount",
  "voting power NFT",
  "DeFi NFT",
  "vote escrow",
  "ve(3,3)",
  "BTC staking NFT",
  "Web3 marketplace",
  "onchain governance NFT",
];

/** Points social crawlers at the dynamically-generated /opengraph-image. */
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Vezo — the veNFT marketplace for veBTC & veMEZO on Mezo",
};

type PageMetaInput = {
  /** Page-specific title. Omit on the homepage to use the brand title. */
  title?: string;
  description?: string;
  /** Path only, e.g. "/marketplace". Used for the canonical URL. */
  path?: string;
  /** Set true for wallet-gated / personal pages that shouldn't be indexed. */
  noindex?: boolean;
  keywords?: string[];
};

/**
 * Build a complete, consistent Metadata object for a route. Handles canonical,
 * Open Graph, Twitter cards, and robots directives from one small input.
 */
export function pageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noindex = false,
  keywords,
}: PageMetaInput = {}): Metadata {
  const canonical = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const fullTitle = title ? `${title} | ${TITLE_SUFFIX}` : `${SITE_NAME} | ${TITLE_SUFFIX}`;
  const ogTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — veNFT Marketplace on Mezo`;

  return {
    // `absolute` bypasses the root layout's title template (no double suffix).
    title: { absolute: fullTitle },
    description,
    keywords: keywords ?? KEYWORDS,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: [OG_IMAGE.url],
    },
  };
}
