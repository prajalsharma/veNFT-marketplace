// Project subscriptions: shared ABI, tiers and helpers for VezoBackerStreams.
//
// A project deposits the full tier up front. The contract streams it to the
// support wallet second by second over the tier's months. Only the project's
// wallet can pause (the clock stops and the end date moves out), resume, or
// cancel (everything not yet streamed comes straight back). There is no admin.

export const BACKER_STREAMS_ABI = [
  { type: "function", name: "create", stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "duration", type: "uint64" }, { name: "name", type: "string" }],
    outputs: [{ name: "id", type: "uint256" }] },
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "resume", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "amount", type: "uint256" }] },
  { type: "function", name: "nextStreamId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "streamedOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "refundableOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "endsAt", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getStream", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "backer", type: "address" }, { name: "token", type: "address" },
      { name: "deposit", type: "uint128" }, { name: "withdrawn", type: "uint128" },
      { name: "duration", type: "uint64" }, { name: "accrued", type: "uint64" },
      { name: "runStart", type: "uint64" }, { name: "status", type: "uint8" },
    ] }] },
  { type: "function", name: "withdrawableOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isFinished", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "event", name: "StreamCanceled", inputs: [
    { name: "id", type: "uint256", indexed: true }, { name: "streamedTotal", type: "uint256", indexed: false },
    { name: "refunded", type: "uint256", indexed: false },
  ] },
  { type: "event", name: "StreamCreated", inputs: [
    { name: "id", type: "uint256", indexed: true }, { name: "backer", type: "address", indexed: true },
    { name: "token", type: "address", indexed: true }, { name: "deposit", type: "uint256", indexed: false },
    { name: "duration", type: "uint64", indexed: false }, { name: "name", type: "string", indexed: false },
  ] },
] as const;

export const STREAM_STATUS = ["None", "Active", "Paused", "Canceled"] as const;
export type StreamStatus = (typeof STREAM_STATUS)[number];

export const MONTH_SECONDS = 30 * 24 * 60 * 60;
export const MAX_PROJECT_NAME_BYTES = 32;

export interface Tier {
  usd: number;
  months: number;
  perks: string[];
}

// The proposal's tiers. Bigger tiers buy a longer run, not just more posts.
export const TIERS: Tier[] = [
  { usd: 5, months: 1, perks: ["5 posts about your project", "Replies on 10 of your tweets"] },
  { usd: 10, months: 2, perks: ["5 posts a month", "Replies on 10 of your tweets a month"] },
  { usd: 25, months: 3, perks: ["6 posts a month", "Replies on 15 of your tweets a month", "One explainer thread on your project"] },
  { usd: 50, months: 3, perks: ["8 posts a month", "Replies on 20 of your tweets a month", "One explainer thread, pinned for a week"] },
  { usd: 100, months: 4, perks: [
    "10 posts a month and replies on 25 of your tweets",
    "A repost of every big announcement",
    "Two explainer threads timed to your launches",
    "A joint X Space or AMA",
    "If you serve veNFT holders: a Vezo pop-up that sends our users to you",
  ] },
];

export function nameBytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

// A plan shows on the public board only after it has paid at least this much
// (about $1). Anyone can open a plan under any name, so the board needs a
// real payment before it shows a name, not a 1 wei one.
export const MIN_LISTED: Record<"BTC" | "MEZO" | "MUSD", bigint> = {
  BTC: 10n ** 13n,           // 0.00001 BTC
  MEZO: 100n * 10n ** 18n,   // 100 MEZO
  MUSD: 10n ** 18n,          // 1 MUSD
};

// The board only reads plans whose deposit reaches a real tier (about $5), so
// a flood of 1 wei plans costs the server nothing to skip.
export const MIN_INDEXED: Record<"BTC" | "MEZO" | "MUSD", bigint> = {
  BTC: 5n * 10n ** 13n,       // 0.00005 BTC
  MEZO: 1000n * 10n ** 18n,   // 1,000 MEZO
  MUSD: 4n * 10n ** 18n,      // 4 MUSD
};
