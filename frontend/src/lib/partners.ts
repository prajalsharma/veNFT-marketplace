// Partners and integrations: one registry, rendered everywhere from data.
//
// The /partners page (tabs, counts, directory tiles, expansions, detail
// views), the home page feature and the Portfolio hint all read ENTRIES. To
// add one: put its logo in public/partners/, append an Entry below, and it
// appears in the right tab with its own #slug link. To add a new kind of
// relationship, add it to KINDS; its tab follows.
//
// Smallest entry (append to ENTRIES; blocks may be empty to start):
//
//   {
//     slug: "acme", kind: "partner", name: "Acme", role: "Lending",
//     logo: { type: "symbol", src: "/partners/acme.svg" },
//     href: "https://acme.xyz",
//     line: "One sentence for the directory tile.",
//     summary: "Two sentences on what it does for a Vezo user.",
//     highlights: [{ title: "What it lets you do", body: "How, in plain words." }],
//     links: [{ label: "Open Acme", href: "https://acme.xyz", primary: true }],
//     blocks: [],
//   },
//
// Optional: quote (their tagline), live (a widget in components/partners/
// live.tsx), placements.home / placements.portfolio, disclosure. Dev builds
// throw on a bad slug, a duplicate, a slug that matches a tab, or a logo
// outside public/partners/.
//
// Claims rule: every statement about a partner stays inside its own docs or
// what Vezo's code actually does. No yields, no "safe", no "instant".
// Aurove facts verified 4 Nov 2026 against aurove.xyz/docs and on-chain
// reads; Goldsky facts map to subgraph/ and the /api routes named below.

import { CONTRACTS } from "@/lib/contracts";

// ─── Types ───────────────────────────────────────────────────────────────────

export const KINDS = {
  partner: { label: "Partners", one: "Partner", hash: "partners" },
  integration: { label: "Integrations", one: "Integration", hash: "integrations" },
} as const;
export type Kind = keyof typeof KINDS;

export interface EntryLink {
  label: string;
  href: string;
  /** The filled brand button; at most one per group. */
  primary?: boolean;
}

/** How the logo is drawn. Marks drawn for dark backgrounds sit on a panel
 *  that stays dark in both themes instead of being recoloured. */
export type Logo =
  | { type: "wordmark"; src: string; ratio: number; onDark?: boolean }
  | { type: "symbol"; src: string; onDark?: boolean };

/** Detail-view building blocks, in the order they should read. */
export type Block =
  | { type: "items"; title: string; items: { title: string; body: string }[] }
  | { type: "steps"; title: string; steps: string[] }
  | { type: "notes"; title: string; notes: string[] }
  | { type: "text"; title: string; body: string; aside?: { label: string; body: string } }
  | {
      type: "table";
      title: string;
      columns: string[];
      /** The first cell is the row header; `href` links it. */
      rows: { cells: string[]; href?: string }[];
      links?: EntryLink[];
    };

/** Live widgets an entry can show; implemented in components/partners/live. */
export type LiveWidget = "goldsky-index";

export interface Entry {
  /** URL-safe id: /partners#slug opens the entry. */
  slug: string;
  kind: Kind;
  name: string;
  /** Short role shown with the name, e.g. "Ecosystem partner". */
  role: string;
  logo: Logo;
  href: string;
  /** Directory tile line: one sentence. */
  line: string;
  /** Their own tagline, quoted as such. */
  quote?: string;
  summary: string;
  /** Shown when the tile is expanded: what matters at a glance. */
  highlights: { title: string; body?: string }[];
  links: EntryLink[];
  live?: LiveWidget;
  blocks: Block[];
  /** Optional placements outside /partners. */
  placements?: {
    /** Featured on the home page (the first featured entry is used). */
    home?: { heading: string; accent: string };
    /** One line on Portfolio for people holding veNFTs. */
    portfolio?: string;
  };
  /** Shown under the detail view, e.g. a funding disclosure. */
  disclosure?: string;
}

// ─── Entries ─────────────────────────────────────────────────────────────────

const M = CONTRACTS.mainnet;

const AUROVE_USES = [
  {
    title: "Keep earning instead of selling",
    body: "Need liquidity but don't want to give up your lock? Deposit your veBTC or veMEZO on Aurove. It stays in Mezo Earn, and you get avBTCm or avMEZOm for the full locked amount.",
  },
  {
    title: "Put a Vezo buy to work",
    body: "Bought a lock below its value on Vezo? Deposit it on Aurove and receive tokens for everything it holds, not for what you paid.",
  },
  {
    title: "Turn it back into a veNFT later",
    body: "Redeem on Aurove to get a veNFT back. Mezo's epoch timing still applies, so check when rewards land before you redeem.",
  },
];

const GOLDSKY_POWERS = [
  { title: "Marketplace listings", body: "Active listings come from the index instead of scanning every listing slot on-chain. Each one is still checked against its owner on-chain before it shows." },
  { title: "Market stats", body: "Sales, volume, average price, buyers and sellers since launch, worked out from indexed events every minute and matched against the Dune dashboard." },
  { title: "Activity feed", body: "Every listing, sale, cancellation and bid, newest first, with the discount as it stood at that moment." },
  { title: "Market value", body: "Sales and listings over time, priced in dollars at the hour each one happened." },
];

export const ENTRIES: Entry[] = [
  {
    slug: "aurove",
    kind: "partner",
    name: "Aurove",
    role: "Ecosystem partner",
    logo: { type: "wordmark", src: "/partners/aurove.webp", ratio: 640 / 187, onDark: true },
    href: "https://www.aurove.xyz",
    line: "Keep a veNFT earning while holding a token you can move.",
    quote: "The liquid ve-yield layer for Mezo Earn.",
    summary:
      "Aurove takes a veBTC or veMEZO position and keeps it earning in Mezo Earn, while you hold avBTCm or avMEZOm, a token you can move, swap or add to a pool.",
    highlights: AUROVE_USES,
    links: [
      { label: "Deposit on Aurove", href: "https://www.aurove.xyz/earn", primary: true },
      { label: "Read Aurove's docs", href: "https://www.aurove.xyz/docs" },
    ],
    blocks: [
      { type: "items", title: "What you can do with Aurove", items: AUROVE_USES },
      {
        type: "table",
        title: "Sell on Vezo, or keep it earning on Aurove",
        columns: ["", "Sell on Vezo", "Deposit on Aurove"],
        rows: [
          { cells: ["What you get", "BTC, MEZO or MUSD from the buyer", "avBTCm or avMEZOm for the full locked amount"] },
          { cells: ["Your lock", "Goes to the buyer, with its rewards", "Stays in Mezo Earn, still earning"] },
          { cells: ["The price", "You set it; buyers usually pay below the locked value", "One token per unit locked when you deposit"] },
          { cells: ["Getting it back", "Sold is sold", "Redeem on Aurove for a veNFT, on Mezo's epoch timing"] },
        ],
        links: [
          { label: "Sell a position", href: "/my-listings" },
          { label: "Buy a lock below its value", href: "/marketplace" },
        ],
      },
      {
        type: "steps",
        title: "How to use Aurove with a Vezo position",
        steps: [
          "Hold a veBTC or veMEZO, or buy one on the Vezo marketplace.",
          "Open Earn on Aurove and choose to deposit an existing position.",
          "Receive avBTCm or avMEZOm. Hold it, swap it, or add it to a pool on Aurove.",
        ],
      },
      {
        type: "notes",
        title: "Good to know before you deposit",
        notes: [
          "Aurove is a separate protocol with its own contracts, which its team can upgrade. Read their docs before depositing.",
          "Redeeming gives you a veNFT back, not BTC or MEZO. Leaving before an epoch closes can forfeit that epoch's rewards.",
          "Aurove's pools are new, so large swaps can move the price a lot.",
          "Grant positions that are still vesting can't be deposited.",
          "Aurove takes a fee from rewards. Their docs explain how.",
        ],
      },
    ],
    disclosure: "Aurove has backed Vezo through recurring support. Vezo doesn't run Aurove or its contracts, and nothing here is financial advice.",
    placements: {
      home: { heading: "Our ecosystem partner,", accent: "Aurove" },
      portfolio: "Rather keep a lock earning than sell it? Our partner Aurove gives you a token for it while it stays in Mezo Earn.",
    },
  },
  {
    // Each point maps to code: subgraph/ (the indexer) and the routes
    // /api/listings, /api/market-stats, /api/activity and /api/market-value.
    slug: "goldsky",
    kind: "integration",
    name: "Goldsky",
    role: "Indexing",
    logo: { type: "symbol", src: "/partners/goldsky-symbol.svg" },
    href: "https://goldsky.com",
    line: "Indexes every listing, sale and bid on Vezo.",
    summary:
      "Goldsky hosts Vezo's subgraph: an index of every listing, price change, sale, cancellation and bid on the marketplace, kept in step with Mezo and queryable in one request.",
    highlights: GOLDSKY_POWERS.map(({ title }) => ({ title })),
    links: [
      { label: "Query the subgraph", href: "https://docs.vezo.exchange/developers/subgraph/" },
      { label: "Subgraph source", href: "https://github.com/prajalsharma/veNFT-marketplace/tree/main/subgraph" },
      { label: "goldsky.com", href: "https://goldsky.com" },
    ],
    live: "goldsky-index",
    blocks: [
      {
        type: "text",
        title: "Why Vezo uses a subgraph",
        body: "Answering \"what has happened on Vezo\" from the chain means walking every block since launch, and Mezo's public RPC only returns events 10,000 blocks at a time. The subgraph does that walk once, keeps up as new blocks land, and serves the result as GraphQL.",
        aside: { label: "If it goes down", body: "If the index is unreachable, listings fall back to reading the chain directly, so buying and selling never depend on it." },
      },
      { type: "items", title: "What it powers on Vezo", items: GOLDSKY_POWERS },
      {
        type: "table",
        title: "What it indexes",
        columns: ["Contract", "Indexed since block", "Events"],
        rows: [
          { cells: ["VeNFTMarketplace", "7,808,472", "Listings, price changes, sales, cancellations"], href: `${M.explorer}/address/${M.marketplace}` },
          { cells: ["VeNFTBidding", "10,062,384", "Bids, accepted bids, cancellations"], href: `${M.explorer}/address/${M.bidding}` },
        ],
      },
    ],
  },
];

// ─── Lookups ─────────────────────────────────────────────────────────────────

export const entriesOf = (kind: Kind) => ENTRIES.filter((e) => e.kind === kind);
export const entryBySlug = (slug: string) => ENTRIES.find((e) => e.slug === slug);
export const homeFeature = () => ENTRIES.find((e) => e.placements?.home);
export const portfolioHint = () => ENTRIES.find((e) => e.placements?.portfolio);
/** Kinds that have at least one entry, in KINDS order. */
export const activeKinds = () => (Object.keys(KINDS) as Kind[]).filter((k) => entriesOf(k).length > 0);

// ─── Checks ──────────────────────────────────────────────────────────────────
// Mistakes that types can't catch fail loudly in development, not on the page.

if (process.env.NODE_ENV !== "production") {
  const tabHashes = new Set<string>(Object.values(KINDS).map((k) => k.hash));
  const seen = new Set<string>();
  for (const e of ENTRIES) {
    const where = `lib/partners.ts entry "${e.slug}"`;
    if (!/^[a-z0-9-]+$/.test(e.slug)) throw new Error(`${where}: slug must be lowercase letters, digits and dashes`);
    if (seen.has(e.slug)) throw new Error(`${where}: duplicate slug`);
    if (tabHashes.has(e.slug)) throw new Error(`${where}: slug collides with a tab (${[...tabHashes].join(", ")})`);
    if (!e.logo.src.startsWith("/partners/")) throw new Error(`${where}: logo must live in public/partners/`);
    if (e.links.filter((l) => l.primary).length > 1) throw new Error(`${where}: at most one primary link`);
    if (e.highlights.length === 0) throw new Error(`${where}: needs at least one highlight`);
    seen.add(e.slug);
  }
}
