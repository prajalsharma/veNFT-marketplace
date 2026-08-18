---
title: Marketplace Mechanics
description: How listing, buying, and cancelling work — and why the escrowless, atomic design protects both sides of every trade.
---

This page walks through the lifecycle of a trade and the two design principles behind it: **escrowless custody** and **atomic settlement**.

## Escrowless: listing is an approval, not a deposit

When a seller lists a veNFT, the marketplace does **not** take the NFT. Instead:

1. The seller grants the marketplace contract an ERC-721 **approval** for that token ID.
2. The seller calls `listNFT` with the price and payment token (BTC, MEZO, or MUSD).
3. The contract verifies the seller actually owns the NFT and has approved it, then records the listing.

The NFT stays in the seller's wallet. The approval only permits transfer *through the marketplace's buy path*, which requires payment. Consequences:

- **Voting and rewards continue** for the seller while listed — the position is never parked in a contract doing nothing.
- **Cancelling is trivial** — remove the listing (and optionally the approval) at any time; nothing needs to be "withdrawn".
- **No honeypot** — the marketplace contract never holds a pool of valuable NFTs for an attacker to target.

## Atomic settlement: the buy path

A purchase is one transaction, ordered defensively (checks → effects → interactions):

```
buyNFT(listingId)
 │
 ├─ 1. Validate     listing active · seller still owns the NFT · buyer ≠ seller
 │                  · veNFT not expired · marketplace not paused
 │                  · ERC-20 allowance sufficient (pre-checked)
 ├─ 2. Effects      mark listing sold (state closed before any external calls)
 ├─ 3. NFT first    safeTransferFrom(seller → buyer)
 └─ 4. Payment      PaymentRouter routes buyer's funds:
                      fee (currently 1%) → treasury
                      remainder         → seller
```

If **any** step fails, the whole transaction reverts. Notable orderings:

- **The NFT moves before money moves.** If the payment can't complete, the NFT transfer unwinds with the revert — a buyer can never pay for an NFT that doesn't arrive.
- **Ownership is re-validated at buy time.** If the seller transferred the NFT away after listing, the buy reverts instead of taking the buyer's money.
- **Expired positions can't be bought.** A veNFT whose lock has expired (zero remaining value as a governance position) is blocked from purchase.
- **Self-purchase is blocked** — no wash-trading a listing to fake volume.

## The three states of a listing

| State | How it happens | What's true |
|---|---|---|
| **Active** | Seller lists | NFT in seller's wallet; buyable; cancellable |
| **Sold** | Buyer executes `buyNFT` | NFT with buyer; seller paid (minus fee); listing closed forever |
| **Cancelled** | Seller cancels | Listing closed; approval can be revoked; NFT untouched |

A listing can also become *unbuyable* without a state change — for example the lock expires, or the seller moves the NFT — in which case the interface hides or flags it and the contract would revert any purchase attempt.

## Payment tokens

Each listing names its price in one of three currencies:

| Token | Type | Notes |
|---|---|---|
| **BTC** | Native gas token | Paid via transaction value |
| **MEZO** | ERC-20 | Requires approval before buying |
| **MUSD** | ERC-20 stablecoin | Requires approval before buying |

Buyers holding a *different* token than the listing's price currency can still buy in one transaction via the [swap router](/concepts/pay-with-any-token/).

## Emergency pause

A `PAUSER_ROLE` held through the [MarketplaceAdmin contract](/architecture/contracts/) can halt all trading instantly in an emergency. The pause check is **fail-closed**: if the marketplace cannot verify the pause state, it reverts rather than assuming trading is allowed. Listings and custody are unaffected by a pause — NFTs are in user wallets, as always.
