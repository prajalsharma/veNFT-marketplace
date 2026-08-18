---
title: What is Vezo?
description: Vezo is an escrowless, peer-to-peer secondary marketplace for veBTC and veMEZO vote-escrowed NFTs on the Mezo network.
---

**Vezo** is the first secondary marketplace for veNFTs on Mezo. When users lock BTC or MEZO in Mezo's vote-escrow system, they receive an NFT (a *veNFT*) representing that locked position. Those positions are normally illiquid until the lock expires, which is often months away. Vezo lets holders sell them, and lets buyers acquire them, without waiting for the lock to end.

## The problem Vezo solves

Vote-escrow systems reward long-term commitment: the longer you lock, the more voting power and rewards you earn. The trade-off is liquidity, because your capital is stuck until the lock expires. Before Vezo, a veBTC or veMEZO holder who needed that capital back early had two bad options:

1. **Wait out the lock.** No liquidity for weeks or months.
2. **Find a buyer over-the-counter.** Trust a stranger to pay after you send the NFT (or vice versa), with no protection for either side.

Vezo replaces both with an on-chain market. Sellers list their veNFT at any price, buyers purchase it in a single atomic transaction, and neither side ever has to trust the other.

## What makes it different

### Escrowless by design

Most NFT marketplaces take custody: you deposit your NFT into a contract and wait. On Vezo, the NFT never leaves the seller's wallet until the moment of sale. Listing only grants the marketplace contract an *approval* to transfer the NFT when a buyer pays. Until then:

- The seller keeps voting with the position.
- Rewards keep accruing to the seller.
- The seller can cancel at any time with no penalty.

### Atomic settlement

A purchase is a single transaction: the NFT transfers to the buyer first, then payment routes to the seller (minus the protocol fee). If any step fails, whether the seller moved the NFT, the lock expired, or the payment can't complete, the entire transaction reverts and nobody loses anything. There is no state where the buyer has paid but holds nothing, or the seller has shipped but wasn't paid.

### Transparent pricing

Every listing displays the position's **intrinsic value** (the amount of BTC or MEZO locked inside), its **voting power** with time-decay applied, the **lock expiry**, and the **discount or premium** relative to intrinsic value. All of it is read live from the chain, so buyers know exactly what they're getting before they click Buy.

### Multi-token payments

Listings can be priced in BTC, MEZO, or MUSD (Mezo's stablecoin). Buyers can even pay with a different token than the listing asks for; the [swap router](/concepts/pay-with-any-token/) converts it through Mezo's on-chain DEX inside the same transaction.

## What you can do on Vezo

| Action | Description |
|---|---|
| List | Put a veBTC or veMEZO position up for sale at any price in BTC, MEZO, or MUSD |
| Browse | See all active listings with live intrinsic value, voting power, lock expiry, and discount |
| Buy | Purchase atomically in one transaction |
| Bid | Make an offer on any veNFT; funds stay in your wallet until the owner accepts |
| Pay in any token | Buy a listing priced in one currency using another, swapped automatically |
| Cancel | Delist at any time, no penalty |

## How Vezo came to be

Vezo didn't start as a startup pitch. It began as the official Mezo community bounty, ["veNFT Marketplace for veBTC and veMEZO Locks"](https://docs.superhuman.com/d/Mezo-Community-Resources_d7Ee5YHYoEI/Bounty-veNFT-Marketplace-for-veBTC-and-veMEZO-Locks_suY2iKqe#Table-9_tuZ45qDv/r7&columnId=c-2laUloylgR), which asked the ecosystem to build exactly this: an escrowless secondary market for locked positions. Vezo was built against that spec, audited by the Mezo team, and shipped to mainnet.

<figure>
<svg viewBox="0 0 860 190" role="img" aria-label="Timeline: spring 2026 community bounty, build and security review, June 2026 mainnet launch, and ongoing growth with v2 modules, analytics, and documentation." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="tl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <line x1="40" y1="95" x2="828" y2="95" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#tl-a)"/>

  <circle cx="110" cy="95" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="110" y="62" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Community bounty</text>
  <text x="110" y="128" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">official Mezo bounty spec</text>
  <text x="110" y="144" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">spring 2026</text>

  <circle cx="330" cy="95" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="330" y="62" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Build &amp; review</text>
  <text x="330" y="128" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">audited by the Mezo team</text>
  <text x="330" y="144" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">proven on testnet</text>

  <circle cx="550" cy="95" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="550" y="62" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Mainnet launch</text>
  <text x="550" y="128" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">live on Mezo &#183; June 2026</text>
  <text x="550" y="144" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">vezo.exchange</text>

  <circle cx="770" cy="95" r="7" fill="#FF0040"/>
  <text x="770" y="62" text-anchor="middle" fill="#FF0040" font-weight="700" font-size="12">Today</text>
  <text x="770" y="128" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">bidding &#183; swap payments</text>
  <text x="770" y="144" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">analytics &#183; docs</text>
</svg>
<figcaption>From bounty spec to live protocol: built spring 2026, audited by the Mezo team, on mainnet since June 2026, and growing since with the v2 bidding and swap modules, public analytics, and this documentation.</figcaption>
</figure>

The bounty origin shapes how Vezo is run: the contracts follow the bounty's security requirements (documented in [Security](/architecture/security/)), the code is fully [open source](https://github.com/prajalsharma/veNFT-marketplace), and the project carries a post-launch maintenance commitment covering indexing, batch operations, governance integration, and analytics.

## Where to go next

- If Mezo itself is new to you, read [What is Mezo?](/introduction/what-is-mezo/)
- To understand the asset being traded, read [Vote-Escrow & veNFTs](/introduction/vote-escrow/)
- To start trading, jump to [Getting Started](/guides/getting-started/)
