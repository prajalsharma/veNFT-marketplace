/**
 * listingDiscount.ts
 *
 * The discount a buyer actually gets, used by the server listing route and
 * every client view so the number is the same everywhere.
 *
 * Two corrections on top of the plain (value − price) / value formula:
 *
 *  1. Grants: value counts only what can't be taken back (locked − revocable).
 *     `fullDiscountBps` keeps the comparison against the whole locked amount.
 *  2. Different currency (e.g. veMEZO priced in BTC): no exact answer exists,
 *     so with live USD prices we return an estimate and flag it `estimated`.
 *     Without prices it stays null, same as before.
 */

import { computeDiscountBps } from "@/lib/computeDiscount";

export type TokenSym = "BTC" | "MEZO" | "MUSD";
export type UsdPrices = Partial<Record<TokenSym, number | null>>;

const SYM_BY_ADDR: Record<string, TokenSym> = {
  "0x7b7c000000000000000000000000000000000000": "BTC",
  "0x7b7c000000000000000000000000000000000001": "MEZO",
  "0xdd468a1ddc392dcdbef6db6e34e89aa338f9f186": "MUSD", // mainnet
  "0x118917a40faf1cd7a13db0ef56c86de7973ac503": "MUSD", // testnet
};

/** Symbol for a payment/locked token address, or null for an unknown token. */
export function tokenSym(addr: string): TokenSym | null {
  return SYM_BY_ADDR[addr.toLowerCase()] ?? null;
}

export interface DiscountResult {
  /** Headline discount: against the safe value, exact or estimated. */
  discountBps: bigint | null;
  /** Against the full locked amount (differs from discountBps only for grants). */
  fullDiscountBps: bigint | null;
  /** True when both numbers come from live USD prices, not a same-token comparison. */
  estimated: boolean;
}

function estimateBps(value: bigint, lockedSym: TokenSym | null, price: bigint, paySym: TokenSym | null, prices: UsdPrices): bigint | null {
  if (!lockedSym || !paySym) return null;
  const a = prices[lockedSym];
  const b = prices[paySym];
  if (!a || !b || value <= 0n) return null;
  // 18-decimal amounts on both sides, so the scale cancels out.
  const valueUsd = Number(value) * a;
  const priceUsd = Number(price) * b;
  if (!Number.isFinite(valueUsd) || valueUsd <= 0) return null;
  return BigInt(Math.round(((valueUsd - priceUsd) / valueUsd) * 10_000));
}

export function listingDiscount(args: {
  intrinsicValue: bigint;
  revocable: bigint;
  lockedToken: string;
  price: bigint;
  paymentToken: string;
  prices?: UsdPrices;
}): DiscountResult {
  const { intrinsicValue, revocable, lockedToken, price, paymentToken, prices } = args;
  const safe = intrinsicValue > revocable ? intrinsicValue - revocable : 0n;

  const full = computeDiscountBps(intrinsicValue, lockedToken, price, paymentToken);
  if (full !== null) {
    return { discountBps: safe > 0n ? computeDiscountBps(safe, lockedToken, price, paymentToken) : null, fullDiscountBps: full, estimated: false };
  }
  if (!prices) return { discountBps: null, fullDiscountBps: null, estimated: false };
  const lockedSym = tokenSym(lockedToken);
  const paySym = tokenSym(paymentToken);
  const fullEst = estimateBps(intrinsicValue, lockedSym, price, paySym, prices);
  if (fullEst === null) return { discountBps: null, fullDiscountBps: null, estimated: false };
  return { discountBps: estimateBps(safe, lockedSym, price, paySym, prices), fullDiscountBps: fullEst, estimated: true };
}
