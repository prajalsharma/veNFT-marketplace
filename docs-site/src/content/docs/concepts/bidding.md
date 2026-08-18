---
title: Bidding
description: Make escrowless on-chain offers on any veNFT. Funds stay in your wallet until the owner accepts.
---

Listings are seller-initiated. Bids are the buyer-initiated side of the market: you can make an offer on any veNFT, even one that isn't listed, and the owner can accept it on-chain.

## How a bid works

The bidding system (`VeNFTBidding`, a v2 module deployed alongside the core marketplace) follows the same escrowless philosophy as listings:

<figure>
<svg viewBox="0 0 800 370" role="img" aria-label="Three steps. Step one: the bidder calls createBid on the VeNFTBidding contract, which holds a token approval only while funds stay in the bidder's wallet. Step two: the owner calls acceptBid. Step three: in one atomic transaction the contract moves the NFT from owner to bidder and the payment minus the one percent fee from bidder to owner." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="bd-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="bd-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#FF0040"/>
    </marker>
  </defs>
  <rect x="80" y="16" width="140" height="40" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="150" y="41" text-anchor="middle" fill="currentColor" font-weight="700">Bidder</text>
  <rect x="320" y="16" width="160" height="40" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="400" y="35" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">VeNFTBidding</text>
  <text x="400" y="49" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="9.5">the contract</text>
  <rect x="580" y="16" width="140" height="40" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="650" y="41" text-anchor="middle" fill="currentColor" font-weight="700">Owner</text>
  <line x1="150" y1="56" x2="150" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <line x1="400" y1="56" x2="400" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <line x1="650" y1="56" x2="650" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <text x="275" y="84" text-anchor="middle" fill="currentColor" font-weight="700" font-size="11">1 &#183; createBid</text>
  <text x="275" y="99" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="9.5">holds a token approval only &#183; funds stay in bidder's wallet</text>
  <line x1="150" y1="110" x2="392" y2="110" stroke="currentColor" marker-end="url(#bd-a)"/>
  <text x="525" y="140" text-anchor="middle" fill="currentColor" font-weight="700" font-size="11">2 &#183; acceptBid</text>
  <text x="525" y="155" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="9.5">the owner takes the offer</text>
  <line x1="650" y1="166" x2="408" y2="166" stroke="currentColor" marker-end="url(#bd-a)"/>
  <rect x="90" y="196" width="620" height="140" rx="10" fill="none" stroke="#FF0040" stroke-opacity="0.6" stroke-dasharray="4 4"/>
  <text x="110" y="218" fill="#FF0040" font-weight="700" letter-spacing="1" font-size="10">3 &#183; SETTLEMENT &#183; ONE TRANSACTION, ALL OR NOTHING</text>
  <text x="400" y="248" text-anchor="middle" fill="currentColor" font-weight="700" font-size="10.5">NFT: owner &#8594; bidder</text>
  <line x1="650" y1="260" x2="158" y2="260" stroke="#FF0040" marker-end="url(#bd-r)"/>
  <text x="400" y="292" text-anchor="middle" fill="currentColor" font-weight="700" font-size="10.5">payment &#8722; 1% fee: bidder &#8594; owner</text>
  <line x1="150" y1="304" x2="642" y2="304" stroke="#FF0040" marker-end="url(#bd-r)"/>
</svg>
<figcaption>Step 1: the bidder creates the bid; the contract holds only a token approval, so the funds never leave the bidder's wallet. Step 2: the owner accepts. Step 3: the contract executes both transfers in a single transaction, sending the 1% protocol fee to the treasury; if either transfer can't complete, the whole transaction reverts and nothing moves.</figcaption>
</figure>

1. **The bidder approves** the bidding contract to spend the bid amount. The tokens remain in the bidder's wallet.
2. **The bidder creates the bid** on-chain, naming the token ID and offer.
3. **The owner accepts** (or ignores) it. `acceptBid` atomically transfers the NFT to the bidder and pulls the payment, routing the protocol fee to the treasury. It's one transaction with the same all-or-nothing guarantee as a listing purchase.

## Properties

| Property | Detail |
|---|---|
| Escrowless for the bidder | No deposit; your funds never sit in a contract waiting |
| Atomic for both sides | Acceptance settles NFT and payment together or reverts |
| Works on unlisted NFTs | Any veBTC/veMEZO position can receive offers |
| Cancellable | Bidders can withdraw a bid; revoking the token approval also neutralizes it |

## Things bidders should know

- **Keep your balance funded.** Because nothing is escrowed, an accepted bid pulls funds at acceptance time. If your balance or approval no longer covers the bid, acceptance simply fails: the owner sees a dead bid and both parties have wasted time. Cancel bids you can no longer honor.
- **A bid is a firm on-chain offer.** The owner can accept at any moment while it stands. There is no confirmation step on your side.

## Things owners should know

- Accepting a bid is subject to the same protections as a sale: the fee split is enforced by the contract, and settlement is atomic. You cannot lose the NFT without receiving payment.
- You can hold a listing and receive bids simultaneously; whichever executes first closes the position.
