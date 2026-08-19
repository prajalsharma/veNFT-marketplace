---
title: Contract Integration
description: Integrate Vezo on-chain - chain configuration, key function signatures, and viem code samples for reading listings and executing purchases.
---

This page is for developers integrating Vezo's contracts directly: bots, aggregators, portfolio trackers, or alternative frontends. All function signatures below are taken from the deployed source in [`contracts/`](https://github.com/prajalsharma/veNFT-marketplace/tree/main/contracts). Addresses for both networks are in [Smart Contracts → Deployed addresses](/architecture/contracts/#deployed-addresses).

## Chain configuration

Mezo is a standard EVM chain with BTC as the native (gas) currency. With [viem](https://viem.sh):

```ts
import { defineChain } from "viem";

export const mezo = defineChain({
  id: 31612,
  name: "Mezo",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.mezo.public.validationcloud.io"] } },
  blockExplorers: { default: { name: "Mezo Explorer", url: "https://explorer.mezo.org" } },
});

// Testnet: id 31611, RPC https://rpc.test.mezo.org
```

```ts
export const ADDRESSES = {
  marketplace: "0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570",
  bidding: "0xef35dc538b50549e95687a51e8aa542D485ea384",
  swapRouter: "0x638Bab65738bA7BcD47D3c1d6Cb4eaf6CC872617",
  veBTC: "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279",
  veMEZO: "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122",
  BTC: "0x7b7c000000000000000000000000000000000000", // native sentinel
  MEZO: "0x7b7c000000000000000000000000000000000001",
  MUSD: "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186",
} as const;
```

:::note[Native BTC sentinel]
Listings priced in native BTC use the sentinel address `0x7b7c…0000` as `paymentToken`. Pay those with transaction `value`; everything else is a standard ERC-20 `approve` + pull.
:::

## Reading listings

The marketplace exposes paginated reads, so no indexer is required (though the [subgraph](/developers/subgraph/) is faster for bulk queries):

```solidity
function getActiveListings(address collection, uint256 offset, uint256 limit)
    external view returns (Listing[] memory result, uint256 total);

function getListingWithValue(uint256 listingId)
    external view returns (
        Listing memory listing,   // (seller, collection, tokenId, price, paymentToken, createdAt, active)
        uint256 intrinsicValue,   // tokens locked inside the veNFT
        uint256 lockEnd,          // unix timestamp (0 = permanent lock)
        uint256 votingPower,      // decay-adjusted, live
        uint256 discountBps       // (intrinsic − price) / intrinsic, in basis points
    );
```

```ts
const [listing, intrinsicValue, lockEnd, votingPower, discountBps] =
  await client.readContract({
    address: ADDRESSES.marketplace,
    abi: marketplaceAbi,
    functionName: "getListingWithValue",
    args: [42n],
  });
```

`discountBps` is computed on-chain by the adapter. A value of 310 means 3.1% below intrinsic value.

## Buying

```solidity
function buyNFT(uint256 listingId) external payable;
```

Two payment paths, decided by the listing's `paymentToken`:

```ts
// BTC-priced listing: send value
await wallet.writeContract({
  address: ADDRESSES.marketplace,
  abi: marketplaceAbi,
  functionName: "buyNFT",
  args: [listingId],
  value: listing.price,
});

// MEZO/MUSD-priced listing: approve first, then buy (no value)
await wallet.writeContract({
  address: listing.paymentToken,
  abi: erc20Abi,
  functionName: "approve",
  args: [ADDRESSES.marketplace, listing.price],
});
await wallet.writeContract({
  address: ADDRESSES.marketplace,
  abi: marketplaceAbi,
  functionName: "buyNFT",
  args: [listingId],
});
```

The call reverts (entire transaction, funds returned) if the listing is inactive, the seller no longer owns the NFT, the veNFT's lock has expired, the buyer is the seller, the allowance is insufficient, or the marketplace is paused. You do not need to pre-validate these, but reading first saves gas on doomed transactions.

## Listing and cancelling

```solidity
function listNFT(address collection, uint256 tokenId, uint256 price, address paymentToken)
    external returns (uint256 listingId);

function cancelListing(uint256 listingId) external;
```

Before `listNFT`, the seller must `approve` (or `setApprovalForAll`) the marketplace on the veNFT contract. The NFT stays in the seller's wallet; listing only records the order and verifies ownership plus approval.

## Bidding

```solidity
function createBid(
    address collection,
    uint256 tokenId,          // 0 = collection-wide bid, any token
    address paymentToken,     // ERC-20 only; native BTC bids are rejected
    uint256 amount,
    uint256 expiry,           // unix timestamp, must be in the future
    BidFilter calldata filter,
    uint256 minIntrinsicValue,
    uint256 maxIntrinsicValue, // 0 = no cap
    uint256 minVotingPower,
    uint256 minLockDuration,   // min remaining lock, seconds
    bool    requireAutoMaxLock
) external returns (uint256 bidId);

function cancelBid(uint256 bidId) external;
function acceptBid(uint256 bidId) external;   // called by the NFT owner
```

Bids are escrowless: `createBid` holds only an ERC-20 approval, and `acceptBid` pulls payment and transfers the NFT atomically, reading the canonical fee configuration from the `PaymentRouter` so bids and listings pay the same protocol fee. Note that native BTC cannot be a bid currency, because escrowless settlement needs `transferFrom` and native value doesn't have one. Bid in MEZO or MUSD instead.

:::caution[Filter criteria are hints, not on-chain constraints]
The filter parameters (intrinsic value range, voting power, lock duration) are **stored on-chain but not enforced by `acceptBid`**. They exist so indexers and UIs can surface a collection-wide bid against matching positions; the contract does not currently reject an acceptance that violates them. If your integration relies on the filters, validate the position yourself before treating a bid as matched.
:::

## Paying with a different token

```solidity
function swapAndBuy(
    uint256 listingId,
    address payToken,      // the token the buyer holds
    uint256 maxAmountIn,   // slippage bound; reverts if the swap needs more
    uint256 amountOutMin,  // minimum swap output accepted
    bool    stable         // Velodrome pool type flag
) external;
```

Routes `payToken` through the on-chain BTC/MUSD pool, then executes `buyNFT` and forwards the NFT in one atomic transaction. Semantics are exact-in: the router pulls `maxAmountIn`, skims its routing fee (`platformFeeSwapBps`), swaps the remainder, requires the output to cover the listing price, and refunds any surplus in the quote token. Two constraints: the listing's quote token must be ERC-20 (BTC-quoted listings revert with `UnsupportedQuoteToken`, since the marketplace settles those natively), and the pay token needs a direct pool to the quote token. BTC, mUSDC, and mUSDT all pool to MUSD (use `stable: true` for the mUSDC/mUSDT routes), so any of them can pay for an MUSD-quoted listing; the Vezo app exposes the BTC route. MEZO has no pool and cannot be swapped either way. See [Pay With Any Token](/concepts/pay-with-any-token/) for the design rationale.

## Getting ABIs

Full ABIs are generated from source. Clone the [repository](https://github.com/prajalsharma/veNFT-marketplace), run `npm install && npm run compile`, and read them from `artifacts/`. The frontend's minimal inline ABIs (`frontend/src/hooks/`) are a good reference for the read paths shown above.
