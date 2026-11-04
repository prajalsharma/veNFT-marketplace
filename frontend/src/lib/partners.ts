// Ecosystem partners, shared by the home page section and /partners.
//
// Every claim about a partner is checked against its own docs (linked below)
// and stays inside what they say: no yields, no "safe", no "instant". Aurove
// facts verified 4 Nov 2026 against aurove.xyz/docs and on-chain reads.

export const AUROVE = {
  name: "Aurove",
  href: "https://www.aurove.xyz",
  docs: "https://www.aurove.xyz/docs",
  earn: "https://www.aurove.xyz/earn",
  x: "https://x.com/aurove_xyz",
  logo: "/partners/aurove.webp",
  logoRatio: 640 / 187,
  // Their own words, quoted as such on the page.
  tagline: "The liquid ve-yield layer for Mezo Earn.",
  summary:
    "Aurove takes a veBTC or veMEZO position and keeps it earning in Mezo Earn, while you hold avBTCm or avMEZOm, a token you can move, swap or add to a pool.",
  // How a Vezo user puts Aurove to work. Short, plain, accurate to their docs.
  uses: [
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
  ],
  steps: [
    "Hold a veBTC or veMEZO, or buy one on the Vezo marketplace.",
    "Open Earn on Aurove and choose to deposit an existing position.",
    "Receive avBTCm or avMEZOm. Hold it, swap it, or add it to a pool on Aurove.",
  ],
  // Things a user should know before depositing. Each comes from Aurove's docs.
  notes: [
    "Aurove is a separate protocol with its own contracts, which its team can upgrade. Read their docs before depositing.",
    "Redeeming gives you a veNFT back, not BTC or MEZO. Leaving before an epoch closes can forfeit that epoch's rewards.",
    "Aurove's pools are new, so large swaps can move the price a lot.",
    "Grant positions that are still vesting can't be deposited.",
    "Aurove takes a fee from rewards. Their docs explain how.",
  ],
} as const;

// Integrations: infrastructure Vezo runs on, described by what it does in the
// product. Each point maps to code: subgraph/ (the indexer), and the routes
// /api/listings, /api/market-stats, /api/activity and /api/market-value.
export const GOLDSKY = {
  name: "Goldsky",
  href: "https://goldsky.com",
  symbol: "/partners/goldsky-symbol.svg",
  docs: "https://docs.vezo.exchange/developers/subgraph/",
  source: "https://github.com/prajalsharma/veNFT-marketplace/tree/main/subgraph",
  summary:
    "Goldsky hosts Vezo's subgraph: an index of every listing, price change, sale, cancellation and bid on the marketplace, kept in step with Mezo and queryable in one request.",
  why: "Answering \"what has happened on Vezo\" from the chain means walking every block since launch, and Mezo's public RPC only returns events 10,000 blocks at a time. The subgraph does that walk once, keeps up as new blocks land, and serves the result as GraphQL.",
  powers: [
    { title: "Marketplace listings", body: "Active listings come from the index instead of scanning every listing slot on-chain. Each one is still checked against its owner on-chain before it shows." },
    { title: "Market stats", body: "Sales, volume, average price, buyers and sellers since launch, worked out from indexed events every minute and matched against the Dune dashboard." },
    { title: "Activity feed", body: "Every listing, sale, cancellation and bid, newest first, with the discount as it stood at that moment." },
    { title: "Market value", body: "Sales and listings over time, priced in dollars at the hour each one happened." },
  ],
  indexes: [
    { contract: "VeNFTMarketplace", from: 7808472, events: "Listings, price changes, sales, cancellations" },
    { contract: "VeNFTBidding", from: 10062384, events: "Bids, accepted bids, cancellations" },
  ],
  fallback:
    "If the index is unreachable, listings fall back to reading the chain directly, so buying and selling never depend on it.",
} as const;
