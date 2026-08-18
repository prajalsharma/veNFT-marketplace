---
title: Selling a veNFT
description: Step-by-step guide to listing a veBTC or veMEZO position, pricing it well, managing bids, and cancelling.
---

Prerequisite: a connected wallet holding a veBTC or veMEZO NFT — see [Getting Started](/guides/getting-started/).

## List your position

1. Go to **My Listings** — Vezo detects the veNFTs in your connected wallet automatically.
2. Pick the position and choose **List**.
3. Set your **price** and **payment currency** (BTC, MEZO, or MUSD).
4. Approve the marketplace for this NFT (one wallet transaction), then confirm the listing (a second one).

Your NFT **does not leave your wallet**. Listing only grants the marketplace permission to transfer it *at the moment a buyer pays* — until then you keep voting, keep earning rewards, and can cancel freely. See [Marketplace Mechanics](/concepts/marketplace-mechanics/) for exactly how that works.

## Pricing your listing

The market prices veNFTs relative to **intrinsic value** (the tokens locked inside — shown in the listing flow). Guidelines:

- **A modest discount sells.** Buyers are paid in discount for taking over your lock's remaining wait. The shorter your remaining lock, the smaller the discount needed — annualized, 2% off with a month left is a strong buyer yield.
- **Check the competition.** Sort the marketplace by best discount and see what you're up against in your collection.
- **Premiums are possible** during governance moments when voting power itself is in demand.
- **Priced in what?** Listing in the same currency as your locked asset (MEZO for veMEZO, BTC for veBTC) makes your discount directly visible to buyers, which helps discovery. MUSD pricing is available if you want a stable exit value; BTC- and MUSD-priced listings are also reachable by buyers holding the other token via [swap payments](/concepts/pay-with-any-token/).

There are **no listing fees**. You pay only the [protocol fee](/concepts/fees/) — currently 1% — deducted from proceeds when the sale actually settles, plus gas.

## While your listing is live

- **You keep full ownership benefits** — votes, rewards, custody.
- **You can receive bids** at the same time. If a bid beats waiting for your ask, accept it — `acceptBid` settles with the same atomic, fee-enforced guarantees as a sale.
- **Change of heart? Cancel any time.** Cancelling closes the listing immediately, costs nothing but gas, and has no penalty.

:::caution[Don't move a listed NFT]
If you transfer the NFT elsewhere while listed, the listing becomes dead — any purchase attempt reverts (buyer-protection check), but the stale listing lingers until cleaned up. Cancel first, then move.
:::

## When it sells

Settlement is a single atomic transaction initiated by the buyer:

```
NFT → buyer · payment → you, minus the 1% protocol fee
```

You receive the proceeds in the currency you asked for, in the same transaction that transfers the NFT. There is no delivery step, no claim step, and no scenario where the NFT leaves without your payment arriving.
