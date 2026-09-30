"use client";

/**
 * useListingOutcomes — the missing terminal state for listings that end without
 * an event.
 *
 * Vezo listings are escrowless, so a listing has two ways to finish. One emits
 * an event (Purchased, Cancelled) and lands in the activity feed. The other
 * does not: the seller withdraws the position after its lock ends (burning the
 * veNFT), transfers it to another wallet, or revokes the marketplace's
 * approval. The contract has no idea any of that happened, so `active` stays
 * true, the listing quietly stops being buyable, and the activity feed shows a
 * LIST row that never resolves. A seller watching four listings sees two sell
 * and two vanish with no explanation anywhere.
 *
 * This hook reconstructs the missing half from current chain state: for any
 * listing with no terminal event, it reads the same ownership and approval that
 * buyNFT checks and reports why the listing can no longer complete. The result
 * is a ledger where every listing has a visible outcome.
 *
 * It is derived state, not history: it says what IS true now, which is why the
 * UI labels it as a status rather than inventing an event with a timestamp.
 */

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { erc721Abi, zeroAddress } from "viem";
import { VeNFTMarketplaceABI } from "@/lib/abis";
import { useNetwork } from "./useNetwork";

export type ListingOutcome = "open" | "withdrawn" | "moved" | "unapproved" | "closed" | "unknown";

export const OUTCOME_LABEL: Record<Exclude<ListingOutcome, "open" | "unknown">, string> = {
  withdrawn: "Position withdrawn",
  moved: "NFT moved out",
  unapproved: "Approval revoked",
  closed: "No longer listed",
};

export const OUTCOME_HELP: Record<Exclude<ListingOutcome, "open" | "unknown">, string> = {
  withdrawn:
    "The lock ended and the owner withdrew their tokens, which burns the veNFT. The listing can never complete.",
  moved:
    "The veNFT was transferred out of the seller's wallet, so the listing can never complete.",
  unapproved:
    "The seller revoked the marketplace's approval, so the listing can never complete.",
  closed: "This listing is no longer active on-chain.",
};

/** Resolve outcomes for listings that have no Purchased/Cancelled event. */
export function useListingOutcomes(listingIds: bigint[]): Map<string, ListingOutcome> {
  const { contracts, chainId } = useNetwork();
  const marketplace = contracts.marketplace as `0x${string}`;
  const enabled =
    listingIds.length > 0 && !!marketplace && marketplace !== zeroAddress;

  // Round 1: the listing records themselves.
  const { data: listingData } = useReadContracts({
    contracts: enabled
      ? listingIds.map((id) => ({
          address: marketplace,
          abi: VeNFTMarketplaceABI,
          functionName: "listings" as const,
          args: [id] as const,
          chainId,
        }))
      : [],
    query: { enabled, staleTime: 60_000 },
  });

  // Round 2: ownership and approval for the ones still flagged active.
  const stillActive = useMemo(() => {
    if (!listingData) return [];
    const out: { id: bigint; seller: string; collection: `0x${string}`; tokenId: bigint }[] = [];
    listingData.forEach((res, i) => {
      if (res?.status !== "success") return;
      const r = res.result as unknown as readonly [string, string, bigint, bigint, string, bigint, boolean];
      if (!r?.[6]) return; // inactive: already has a terminal event, or was closed
      out.push({ id: listingIds[i]!, seller: r[0], collection: r[1] as `0x${string}`, tokenId: r[2] });
    });
    return out;
  }, [listingData, listingIds]);

  const { data: chainState } = useReadContracts({
    contracts: stillActive.flatMap((l) => [
      { address: l.collection, abi: erc721Abi, functionName: "ownerOf" as const, args: [l.tokenId] as const, chainId },
      { address: l.collection, abi: erc721Abi, functionName: "getApproved" as const, args: [l.tokenId] as const, chainId },
      {
        address: l.collection,
        abi: erc721Abi,
        functionName: "isApprovedForAll" as const,
        args: [l.seller as `0x${string}`, marketplace] as const,
        chainId,
      },
    ]),
    query: { enabled: stillActive.length > 0, staleTime: 60_000 },
  });

  return useMemo(() => {
    const map = new Map<string, ListingOutcome>();
    if (!listingData) return map;

    // Anything no longer active on-chain, with no event we saw, is simply closed.
    listingData.forEach((res, i) => {
      const id = listingIds[i]!;
      if (res?.status !== "success") { map.set(id.toString(), "unknown"); return; }
      const r = res.result as unknown as readonly [string, string, bigint, bigint, string, bigint, boolean];
      if (!r?.[6]) map.set(id.toString(), "closed");
    });

    if (!chainState) return map;

    stillActive.forEach((l, i) => {
      const owner = chainState[i * 3];
      const approved = chainState[i * 3 + 1];
      const forAll = chainState[i * 3 + 2];
      const key = l.id.toString();

      if (!owner) return;
      if (owner.status === "failure") { map.set(key, "withdrawn"); return; }

      const ownerAddr = String(owner.result ?? zeroAddress).toLowerCase();
      if (ownerAddr === zeroAddress) { map.set(key, "withdrawn"); return; }
      if (ownerAddr !== l.seller.toLowerCase()) { map.set(key, "moved"); return; }

      const approvedTo = String(approved?.result ?? zeroAddress).toLowerCase();
      const operatorOk = forAll?.status === "success" && forAll.result === true;
      if (approvedTo !== marketplace.toLowerCase() && !operatorOk) { map.set(key, "unapproved"); return; }

      map.set(key, "open");
    });

    return map;
  }, [listingData, chainState, stillActive, listingIds, marketplace]);
}
