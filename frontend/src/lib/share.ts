// Share posts for the moments worth telling people about: listing, buying,
// and selling (accepting an offer). Every number comes from the transaction
// the person just made; nothing is rounded up or invented. When a discount
// is only an estimate (priced in a different token than the lock), it says
// "about". When there is no discount, it says nothing about one.

import { SITE_URL } from "@/lib/seo";

export const X_HANDLES = { vezo: "VezoExchange", mezo: "MezoNetwork" } as const;

export type ShareMoment =
  | {
      kind: "listed";
      collection: "veBTC" | "veMEZO";
      tokenId: string;
      price: string;
      token: string;
      /** Fraction below what the lock holds, e.g. 0.15; null if unknown. */
      discount: number | null;
      estimated?: boolean;
      listingId?: string;
    }
  | {
      kind: "bought";
      collection: "veBTC" | "veMEZO";
      tokenId: string;
      price: string;
      token: string;
      discount: number | null;
      estimated?: boolean;
    }
  | {
      kind: "sold";
      collection: "veBTC" | "veMEZO";
      tokenId: string;
      price: string;
      token: string;
    };

const lockedOf = (c: "veBTC" | "veMEZO") => (c === "veBTC" ? "BTC" : "MEZO");
const pct = (d: number, estimated?: boolean) => `${estimated ? "about " : ""}${(d * 100).toFixed(1)}%`;
/** Only a real discount is worth saying: at least 0.1% below value. */
const below = (d: number | null): d is number => d !== null && d >= 0.001;

export function shareText(m: ShareMoment): string {
  const v = `@${X_HANDLES.vezo}`;
  const z = `@${X_HANDLES.mezo}`;
  const nft = `${m.collection} #${m.tokenId}`;
  switch (m.kind) {
    case "listed":
      return below(m.discount)
        ? `Just listed ${nft} on ${v} for ${m.price} ${m.token}, ${pct(m.discount, m.estimated)} below what it holds. Locked ${lockedOf(m.collection)} on ${z}, for sale now:`
        : `Just listed ${nft} on ${v} for ${m.price} ${m.token}. Locked ${lockedOf(m.collection)} on ${z}, for sale now:`;
    case "bought":
      return below(m.discount)
        ? `Just bought ${nft} on ${v} for ${pct(m.discount, m.estimated)} less than it holds. Locked ${lockedOf(m.collection)} on ${z}, below value. Check it out:`
        : `Just bought ${nft} on ${v}. Locked ${lockedOf(m.collection)} on ${z}, settled in one transaction. Check it out:`;
    case "sold":
      return `Just sold ${nft} on ${v} for ${m.price} ${m.token}. Liquidity for a locked position on ${z}, in one transaction.`;
  }
}

/** Where the post points: the listing itself when we know it, else the market. */
export function shareUrl(m: ShareMoment): string {
  if (m.kind === "listed" && m.listingId) return `${SITE_URL}/marketplace?focus=${encodeURIComponent(m.listingId)}`;
  return SITE_URL;
}

export function xIntent(m: ShareMoment): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(shareText(m))}&url=${encodeURIComponent(shareUrl(m))}`;
}

/** Ask the site-wide share card (components/share/ShareHost) to show this
 *  moment. For flows whose own UI disappears on success, like accepting an
 *  offer, which removes the listing it was shown on. */
export function announceShare(m: ShareMoment) {
  window.dispatchEvent(new CustomEvent<ShareMoment>("vezo:share", { detail: m }));
}
