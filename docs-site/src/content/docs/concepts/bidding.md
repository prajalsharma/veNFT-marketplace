---
title: Bidding
description: Make escrowless on-chain offers on any veNFT — funds stay in your wallet until the owner accepts.
---

Listings are seller-initiated. **Bids are the buyer-initiated side of the market**: you can make an offer on any veNFT — even one that isn't listed — and the owner can accept it on-chain.

## How a bid works

The bidding system (`VeNFTBidding`, a v2 module deployed alongside the core marketplace) follows the same escrowless philosophy as listings:

```
Bidder                                Owner
  │                                     │
  ├─ 1. approve(bidding contract)       │      funds stay in bidder's wallet
  ├─ 2. createBid(nft, amount, token)   │      only an approval is held
  │                                     │
  │                     3. acceptBid ───┤
  │                                     │
  └──────── atomic settlement ──────────┘
       NFT → bidder · payment → owner (minus protocol fee → treasury)
```

1. **The bidder approves** the bidding contract to spend the bid amount — the tokens remain in the bidder's wallet.
2. **The bidder creates the bid** on-chain, naming the token ID and offer.
3. **The owner accepts** (or ignores) it. `acceptBid` atomically transfers the NFT to the bidder and pulls the payment, routing the protocol fee to the treasury — one transaction, same all-or-nothing guarantee as a listing purchase.

## Properties

| Property | Detail |
|---|---|
| **Escrowless for the bidder** | No deposit; your funds never sit in a contract waiting |
| **Atomic for both sides** | Acceptance settles NFT and payment together or reverts |
| **Works on unlisted NFTs** | Any veBTC/veMEZO position can receive offers |
| **Cancellable** | Bidders can withdraw a bid; revoking the token approval also neutralizes it |

## Things bidders should know

- **Keep your balance funded.** Because nothing is escrowed, an accepted bid pulls funds at acceptance time. If your balance or approval no longer covers the bid, acceptance simply fails — the owner sees a dead bid, and you've wasted both parties' time. Cancel bids you can no longer honor.
- **A bid is a firm on-chain offer.** The owner can accept at any moment while it stands; there is no confirmation step on your side.

## Things owners should know

- Accepting a bid is subject to the same protections as a sale: the fee split is enforced by the contract, and settlement is atomic — you cannot lose the NFT without receiving payment.
- You can hold a listing *and* receive bids simultaneously; whichever executes first closes the position.
