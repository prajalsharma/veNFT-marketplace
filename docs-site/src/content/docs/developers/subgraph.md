---
title: Subgraph & Data
description: Query Vezo listings, bids, and marketplace activity through the Goldsky subgraph, with the on-chain fallback pattern.
---

Bulk queries ("all active listings", "sales in the last week", "everything this wallet has done") are slow over raw RPC. Vezo ships a subgraph (in [`subgraph/`](https://github.com/prajalsharma/veNFT-marketplace/tree/main/subgraph)) that indexes marketplace events into a GraphQL API, hosted on Goldsky.

:::note
The subgraph is a read-path optimization, not a dependency. The official frontend automatically falls back to direct on-chain reads (`getActiveListings` pagination) whenever the subgraph is unconfigured or unreachable, and that pattern is worth copying. The endpoint URL is deployment-specific configuration (`SUBGRAPH_URL`); deploy your own from the `subgraph/` sources with the Goldsky CLI, or read on-chain as shown in [Contract Integration](/developers/integrate/).
:::

## Entities

The schema ([`subgraph/schema.graphql`](https://github.com/prajalsharma/veNFT-marketplace/blob/main/subgraph/schema.graphql)) mirrors contract state:

### `Listing`

| Field | Type | Notes |
|---|---|---|
| `listingId` | BigInt | Matches the on-chain listing ID |
| `seller` / `buyer` | Bytes | `buyer` set only after a sale |
| `collection` | Bytes | veBTC or veMEZO contract address |
| `tokenId` | BigInt | |
| `price` / `paymentToken` | BigInt / Bytes | Price in the payment token's smallest unit |
| `active` / `sold` / `cancelled` | Boolean | `active` flips false on sale or cancel; check which via the other two flags |
| `createdAt` / `updatedAt` | BigInt | Block timestamps |

### `Bid`

Same shape for the bidding module: `bidId`, `bidder`, `collection`, `tokenId`, `paymentToken`, `amount`, `expiry`, plus `active` / `accepted` / `cancelled` state flags.

### `ActivityEvent`

An immutable event log (id = `txHash-logIndex`) powering activity feeds, with one row per listing, sale, cancellation, or bid event.

## Example queries

Active listings, cheapest first:

```graphql
{
  listings(
    where: { active: true }
    orderBy: price
    orderDirection: asc
    first: 50
  ) {
    listingId
    seller
    collection
    tokenId
    price
    paymentToken
    createdAt
  }
}
```

Recent sales with buyers:

```graphql
{
  listings(
    where: { sold: true }
    orderBy: updatedAt
    orderDirection: desc
    first: 20
  ) {
    listingId
    tokenId
    price
    paymentToken
    seller
    buyer
    updatedAt
  }
}
```

Open bids on a specific veNFT:

```graphql
{
  bids(
    where: { active: true, collection: "0xb90f…0122", tokenId: "839" }
    orderBy: amount
    orderDirection: desc
  ) {
    bidId
    bidder
    amount
    paymentToken
    expiry
  }
}
```

## What the subgraph can't tell you

Indexed data is event data. Three things must always come from the chain (or the [marketplace read functions](/developers/integrate/#reading-listings)) at decision time:

1. **Intrinsic value, voting power, and discount.** These are computed live from the vote-escrow contracts and change every block as voting power decays.
2. **Current ownership.** A seller can transfer a listed NFT away; only `ownerOf` is authoritative.
3. **Buyability.** Expiry, pause state, and allowance are enforced at `buyNFT` time, not in the index.

The robust pattern, used by the official frontend, is to discover with the subgraph and verify with the chain: query candidates via GraphQL, then call `getListingWithValue` on the ones you act on. Public aggregate metrics (volume, sale counts, discount trends) are also charted on the [Dune dashboard](https://dune.com/vezo/vezo), built from the same on-chain events (`dune/` in the repo).
