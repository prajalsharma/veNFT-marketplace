// Recurring support: shared ABI and helpers for VezoBackerStreams.
//
// A supporter deposits once. The contract streams it to the support wallet
// second by second over the months they chose. Only the supporter's wallet can
// pause (the clock stops and the end date moves out), resume, or cancel
// (everything not yet streamed comes straight back). There is no admin.

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

// Recurring support is an amount (a month, or in total) and a number of
// months; the deposit is the total, streamed evenly over that time.
export const MONTHLY_USD = [5, 10, 25, 50];
// Keeps every stream above the board's read floor (MIN_INDEXED).
export const MIN_TOTAL_USD = 5;
export const MONTH_CHOICES = [1, 3, 6, 12];

export function nameBytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

// A plan shows on the public board only after it has paid at least this much
// (about $1). Anyone can open a stream under any name, so the board needs a
// real payment before it shows a name, not a 1 wei one.
export const MIN_LISTED: Record<"BTC" | "MEZO" | "MUSD", bigint> = {
  BTC: 10n ** 13n,           // 0.00001 BTC
  MEZO: 100n * 10n ** 18n,   // 100 MEZO
  MUSD: 10n ** 18n,          // 1 MUSD
};

// The board only reads streams whose deposit reaches the smallest choice
// (about $5), so a flood of 1 wei streams costs the server nothing to skip.
export const MIN_INDEXED: Record<"BTC" | "MEZO" | "MUSD", bigint> = {
  BTC: 5n * 10n ** 13n,       // 0.00005 BTC
  MEZO: 1000n * 10n ** 18n,   // 1,000 MEZO
  MUSD: 4n * 10n ** 18n,      // 4 MUSD
};
