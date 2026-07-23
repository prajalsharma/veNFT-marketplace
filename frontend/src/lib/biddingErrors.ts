/**
 * biddingErrors — turn a VeNFTBidding revert into something a human can act on.
 *
 * viem decodes custom errors by name when the ABI carries `type: "error"`
 * entries (see VeNFTBiddingABI). Older RPC paths and gas-estimation failures
 * can still surface the bare 4-byte selector instead, so we match on both.
 *
 * Selectors are keccak256("Name()")[0..4] — verified against Mezo mainnet.
 */

const BY_SELECTOR: Record<string, string> = {
  "0x9e87fac8": "Paused",
  "0x193a73b0": "PauseCheckFailed",
  "0x226108dc": "BidNotActive",
  "0xcc6d1b44": "BidExpired",
  "0x03c35082": "NotBidder",
  "0x30cd7471": "NotOwner",
  "0xc19f17a9": "NotApproved",
  "0x664f6afd": "SelfBid",
  "0x1f2a2005": "ZeroAmount",
  "0x08bb9b24": "ZeroExpiry",
  "0xa29cc069": "UnsupportedPaymentToken",
  "0x13be252b": "InsufficientAllowance",
  "0xf4d678b8": "InsufficientBalance",
};

const BY_NAME: Record<string, string> = {
  Paused:                  "Trading is paused right now. Try again shortly.",
  PauseCheckFailed:        "Could not reach the protocol admin contract. Try again in a moment.",
  BidNotActive:            "This bid is no longer active — it was already accepted or cancelled.",
  BidExpired:              "This bid has expired. Ask the bidder to place a new one.",
  NotBidder:               "Only the wallet that placed this bid can cancel it.",
  NotOwner:                "You no longer own this veNFT, so this bid can't be accepted.",
  NotApproved:             "Approve the bidding contract for this collection first, then accept.",
  SelfBid:                 "You can't accept your own bid.",
  ZeroAmount:              "Bid amount must be greater than zero.",
  ZeroExpiry:              "Pick an expiry date in the future.",
  UnsupportedPaymentToken: "That payment token isn't supported for bids. Use MUSD or MEZO.",
  InsufficientAllowance:   "The bidder hasn't approved enough of their token to cover this bid.",
  InsufficientBalance:     "The bidder no longer holds enough balance to cover this bid.",
};

/** Extract a short, human-readable reason from any thrown bidding error. */
export function parseBiddingError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");

  // User-cancelled wallet prompts are not failures worth shouting about.
  if (/user rejected|user denied|rejected the request/i.test(raw)) {
    return "You rejected the transaction.";
  }

  // Named match — viem prints e.g. `Error: NotApproved()` in the message body.
  for (const name of Object.keys(BY_NAME)) {
    if (new RegExp(`\\b${name}\\(\\)`).test(raw)) return BY_NAME[name];
  }

  // Raw selector fallback.
  const sel = raw.match(/0x[0-9a-fA-F]{8}/)?.[0]?.toLowerCase();
  if (sel && BY_SELECTOR[sel]) return BY_NAME[BY_SELECTOR[sel]];

  if (/insufficient funds/i.test(raw)) {
    return "Not enough BTC in your wallet to cover gas.";
  }

  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 150 ? firstLine.slice(0, 150) + "…" : firstLine || "Transaction failed.";
}
