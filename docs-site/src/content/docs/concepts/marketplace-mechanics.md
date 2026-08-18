---
title: Marketplace Mechanics
description: How listing, buying, and cancelling work, and why the escrowless, atomic design protects both sides of every trade.
---

This page walks through the lifecycle of a trade and the two design principles behind it: escrowless custody and atomic settlement.

## Escrowless: listing is an approval, not a deposit

When a seller lists a veNFT, the marketplace does not take the NFT. Instead:

1. The seller grants the marketplace contract an ERC-721 approval for that token ID.
2. The seller calls `listNFT` with the price and payment token (BTC, MEZO, or MUSD).
3. The contract verifies the seller actually owns the NFT and has approved it, then records the listing.

The NFT stays in the seller's wallet. The approval only permits transfer through the marketplace's buy path, which requires payment. This has three consequences:

- **Voting and rewards continue** for the seller while listed. The position is never parked in a contract doing nothing.
- **Cancelling is trivial.** Remove the listing (and optionally the approval) at any time; nothing needs to be withdrawn.
- **No honeypot.** The marketplace contract never holds a pool of valuable NFTs for an attacker to target.

## Atomic settlement: the buy path

A purchase is one transaction, ordered defensively (checks, then effects, then interactions):

<figure>
<svg viewBox="0 0 860 470" role="img" aria-label="The buyNFT call runs four ordered stages: validate the listing, close its state, transfer the NFT, then route payment. If any stage fails the entire transaction reverts." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="bp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <rect x="250" y="16" width="280" height="44" rx="22" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="390" y="43" text-anchor="middle" fill="currentColor" font-weight="700">buyNFT(listingId)</text>
  <line x1="390" y1="60" x2="390" y2="84" stroke="currentColor" marker-end="url(#bp-a)"/>

  <rect x="180" y="88" width="420" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <circle cx="210" cy="120" r="12" fill="none" stroke="#FF0040"/>
  <text x="210" y="124" text-anchor="middle" fill="#FF0040" font-weight="700" font-size="11">1</text>
  <text x="234" y="115" fill="currentColor" font-weight="700" font-size="12">Validate</text>
  <text x="234" y="134" fill="currentColor" fill-opacity="0.6" font-size="10.5">listing active &#183; seller owns NFT &#183; not expired &#183; not paused &#183; allowance</text>
  <line x1="390" y1="152" x2="390" y2="176" stroke="currentColor" marker-end="url(#bp-a)"/>

  <rect x="180" y="180" width="420" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <circle cx="210" cy="212" r="12" fill="none" stroke="#FF0040"/>
  <text x="210" y="216" text-anchor="middle" fill="#FF0040" font-weight="700" font-size="11">2</text>
  <text x="234" y="207" fill="currentColor" font-weight="700" font-size="12">Close state</text>
  <text x="234" y="226" fill="currentColor" fill-opacity="0.6" font-size="10.5">listing marked sold before any external call</text>
  <line x1="390" y1="244" x2="390" y2="268" stroke="currentColor" marker-end="url(#bp-a)"/>

  <rect x="180" y="272" width="420" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <circle cx="210" cy="304" r="12" fill="none" stroke="#FF0040"/>
  <text x="210" y="308" text-anchor="middle" fill="#FF0040" font-weight="700" font-size="11">3</text>
  <text x="234" y="299" fill="currentColor" font-weight="700" font-size="12">Transfer the NFT first</text>
  <text x="234" y="318" fill="currentColor" fill-opacity="0.6" font-size="10.5">safeTransferFrom(seller &#8594; buyer)</text>
  <line x1="390" y1="336" x2="390" y2="360" stroke="currentColor" marker-end="url(#bp-a)"/>

  <rect x="180" y="364" width="420" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <circle cx="210" cy="396" r="12" fill="none" stroke="#FF0040"/>
  <text x="210" y="400" text-anchor="middle" fill="#FF0040" font-weight="700" font-size="11">4</text>
  <text x="234" y="391" fill="currentColor" font-weight="700" font-size="12">Route payment</text>
  <text x="234" y="410" fill="currentColor" fill-opacity="0.6" font-size="10.5">1% fee &#8594; treasury &#183; remainder &#8594; seller</text>

  <line x1="650" y1="88" x2="650" y2="428" stroke="#FF0040" stroke-opacity="0.6" stroke-dasharray="4 4"/>
  <text x="666" y="250" fill="#FF0040" font-size="11" font-weight="600">any step fails &#8594;</text>
  <text x="666" y="268" fill="#FF0040" font-size="11" font-weight="600">everything reverts</text>
</svg>
<figcaption>The four stages of <code>buyNFT</code>, in order. State closes before any external call, the NFT moves before money moves, and a failure at any stage reverts the whole transaction.</figcaption>
</figure>

If any step fails, the whole transaction reverts. The orderings worth noting:

- **The NFT moves before money moves.** If the payment can't complete, the NFT transfer unwinds with the revert. A buyer can never pay for an NFT that doesn't arrive.
- **Ownership is re-validated at buy time.** If the seller transferred the NFT away after listing, the buy reverts instead of taking the buyer's money.
- **Expired positions can't be bought.** A veNFT whose lock has expired is blocked from purchase.
- **Self-purchase is blocked**, so a seller can't wash-trade their own listing to fake volume.

## The three states of a listing

| State | How it happens | What's true |
|---|---|---|
| Active | Seller lists | NFT in seller's wallet; buyable; cancellable |
| Sold | Buyer executes `buyNFT` | NFT with buyer; seller paid (minus fee); listing closed forever |
| Cancelled | Seller cancels | Listing closed; approval can be revoked; NFT untouched |

A listing can also become unbuyable without a state change, for example if the lock expires or the seller moves the NFT. In that case the interface hides or flags it, and the contract would revert any purchase attempt.

## Payment tokens

Each listing names its price in one of three currencies:

| Token | Type | Notes |
|---|---|---|
| BTC | Native asset | Mezo's native currency (it also pays gas); paid via transaction value |
| MEZO | ERC-20 | Requires approval before buying |
| MUSD | ERC-20 stablecoin | Requires approval before buying |

Buyers holding a different token than the listing's price currency can still buy in one transaction via the [swap router](/concepts/pay-with-any-token/).

## Emergency pause

A `PAUSER_ROLE` held through the [MarketplaceAdmin contract](/architecture/contracts/) can halt all trading instantly in an emergency. The pause check is fail-closed: if the marketplace cannot verify the pause state, it reverts rather than assuming trading is allowed. Listings and custody are unaffected by a pause, since NFTs are in user wallets as always.
