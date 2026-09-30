"use client";

/**
 * useListingHealth — is an on-chain "active" listing actually sellable?
 *
 * A Vezo listing is escrowless: the NFT stays with the seller under an ERC-721
 * approval. That means a listing can stop being fulfillable without any event
 * being emitted, simply because the world moved on around it:
 *
 *   - the seller transferred the NFT somewhere else
 *   - the seller revoked the marketplace's approval
 *   - the position expired, or was withdrawn and burned
 *
 * In every one of those cases `listing.active` stays true on-chain, `buyNFT`
 * would revert, and the marketplace hides the listing. Until now nothing told
 * the seller any of this: their listing simply disappeared from the market
 * while still counting as active on their own page.
 *
 * This hook reads the ownership and approval that `buyNFT` itself checks, and
 * names the reason so the UI can explain it.
 */

import { useReadContracts } from "wagmi";
import { erc721Abi, zeroAddress } from "viem";
import { useNetwork } from "./useNetwork";

export type ListingHealth =
  | { status: "live"; reason: null }
  | { status: "checking"; reason: null }
  | { status: "moved"; reason: string }
  | { status: "burned"; reason: string }
  | { status: "unapproved"; reason: string };

export function useListingHealth(
  collection: `0x${string}` | undefined,
  tokenId: bigint | undefined,
  seller: string | undefined,
  enabled = true
): ListingHealth {
  const { contracts, chainId } = useNetwork();
  const marketplace = contracts.marketplace as `0x${string}`;

  const ready = enabled && !!collection && tokenId !== undefined && !!seller;

  const { data, isLoading } = useReadContracts({
    contracts: ready
      ? [
          { address: collection, abi: erc721Abi, functionName: "ownerOf", args: [tokenId], chainId },
          { address: collection, abi: erc721Abi, functionName: "getApproved", args: [tokenId], chainId },
          {
            address: collection,
            abi: erc721Abi,
            functionName: "isApprovedForAll",
            args: [seller as `0x${string}`, marketplace],
            chainId,
          },
        ]
      : [],
    query: { enabled: ready, staleTime: 30_000 },
  });

  if (!ready || isLoading || !data) return { status: "checking", reason: null };

  const [ownerRes, approvedRes, allRes] = data;
  if (!ownerRes || !approvedRes || !allRes) return { status: "checking", reason: null };

  // ownerOf reverts once a veNFT is burned (withdrawn after the lock ended).
  if (ownerRes.status === "failure") {
    return {
      status: "burned",
      reason: "This position no longer exists. It was withdrawn after its lock ended, which burns the veNFT.",
    };
  }

  const owner = (ownerRes.result as string | undefined) ?? zeroAddress;
  if (owner.toLowerCase() === zeroAddress) {
    return {
      status: "burned",
      reason: "This position no longer exists. It was withdrawn after its lock ended, which burns the veNFT.",
    };
  }

  if (owner.toLowerCase() !== seller!.toLowerCase()) {
    return {
      status: "moved",
      reason: "The veNFT is no longer in this wallet, so the listing can never complete. Cancel it to tidy up.",
    };
  }

  const approvedTo = ((approvedRes.result as string | undefined) ?? zeroAddress).toLowerCase();
  const operatorOk = allRes.status === "success" && allRes.result === true;
  if (approvedTo !== marketplace.toLowerCase() && !operatorOk) {
    return {
      status: "unapproved",
      reason: "The marketplace is no longer approved to transfer this veNFT, so the listing cannot complete. Re-list it or cancel it.",
    };
  }

  return { status: "live", reason: null };
}
