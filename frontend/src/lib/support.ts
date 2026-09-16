// Vezo supporter fund — shared constants and the on-chain "graffiti" name codec.
//
// Donations are plain ERC-20 `transfer`s straight to SUPPORT_ADDRESS (the BTC
// and MEZO precompiles expose the native balances through the same interface,
// so all three tokens emit standard Transfer events). No contract sits in the
// middle: funds land on the wallet in the same transaction the donor signs.
//
// Supporter names ride INSIDE that same transaction: we append UTF-8 bytes
// ("vezo:<name>", or "vezo:anon" for anonymous donors) after the ABI-encoded
// transfer arguments. Solidity's ABI decoder — and, verified via eth_call,
// Mezo's BTC/MEZO precompiles — ignore trailing calldata, so the transfer
// executes normally while the name is recorded on-chain forever. The board is
// rebuilt from public chain data alone; there is no database to lose or edit.

export const SUPPORT_ADDRESS = "0xBC67E6CB507833f32227cAbAFED451D832525bC2" as const;

export const GRAFFITI_PREFIX = "vezo:";
export const ANON_PAYLOAD = "anon";
export const MAX_NAME_LEN = 20;

export type SupportToken = "BTC" | "MEZO" | "MUSD";

/** Canonical home of the support page. */
export const SUPPORT_URL = "https://support.vezo.exchange";

/**
 * True when the user is already looking at the support page. On the subdomain
 * the rewrite is internal, so the pathname stays "/" — the hostname is the
 * only reliable signal there; path covers vezo.exchange/support.
 */
export function isSupportSurface(pathname?: string | null): boolean {
  if (pathname?.startsWith("/support")) return true;
  if (typeof window !== "undefined" && window.location.hostname.startsWith("support.")) return true;
  return false;
}

/** Strip control/zero-width chars and cap length; returns "" if nothing survives. */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LEN);
}

/** Hex (no 0x) of the graffiti bytes to append to transfer calldata. */
export function encodeGraffiti(name: string | null, anon: boolean): string {
  const payload = anon ? ANON_PAYLOAD : sanitizeName(name ?? "");
  if (!payload) return "";
  const bytes = new TextEncoder().encode(GRAFFITI_PREFIX + payload);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface Graffiti {
  name: string | null;
  anon: boolean;
}

/**
 * Decode graffiti from a transaction's input data.
 *  - ERC-20 transfer: bytes after selector + two 32-byte args (offset 138 in the
 *    0x string) are the graffiti.
 *  - Plain native send: the entire input is the graffiti.
 * Returns null when the tx carries no (valid) vezo graffiti.
 */
export function decodeGraffiti(input: string | null | undefined): Graffiti | null {
  if (!input || input === "0x") return null;
  let hex: string;
  if (input.startsWith("0xa9059cbb")) {
    if (input.length <= 138) return null;
    hex = input.slice(138);
  } else if (!input.startsWith("0x")) {
    return null;
  } else {
    hex = input.slice(2);
  }
  if (hex.length === 0 || hex.length % 2 !== 0 || hex.length > 400) return null;
  try {
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.startsWith(GRAFFITI_PREFIX)) return null;
    const payload = text.slice(GRAFFITI_PREFIX.length);
    if (payload === ANON_PAYLOAD) return { name: null, anon: true };
    const name = sanitizeName(payload);
    return name ? { name, anon: false } : null;
  } catch {
    return null;
  }
}
