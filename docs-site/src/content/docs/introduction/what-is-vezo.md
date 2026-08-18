---
title: What is Vezo?
description: Vezo is an escrowless, peer-to-peer secondary marketplace for veBTC and veMEZO vote-escrowed NFTs on the Mezo network.
---

Vezo is a secondary marketplace for locked governance positions on Mezo. When users lock BTC or MEZO in Mezo's vote-escrow system, they receive an NFT (a *veNFT*) representing that locked position. Those positions are normally illiquid until the lock expires, which is often months away. Vezo lets holders sell them, and lets buyers acquire them, without waiting for the lock to end.

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

## Where to go next

- If Mezo itself is new to you, read [What is Mezo?](/introduction/what-is-mezo/)
- To understand the asset being traded, read [Vote-Escrow & veNFTs](/introduction/vote-escrow/)
- To start trading, jump to [Getting Started](/guides/getting-started/)
