---
title: Bidding
description: Make escrowless on-chain offers on any veNFT. Funds stay in your wallet until the owner accepts.
---

Listings are seller-initiated. Bids are the buyer-initiated side of the market: you can make an offer on any veNFT, even one that isn't listed, and the owner can accept it on-chain.

## How a bid works

The bidding system (`VeNFTBidding`, a v2 module deployed alongside the core marketplace) follows the same escrowless philosophy as listings:

<figure>
<svg viewBox="0 0 800 330" role="img" aria-label="Sequence of a bid: the bidder creates a bid holding only a token approval, the owner accepts it, and settlement atomically moves the NFT from owner to bidder and the payment minus fee from bidder to owner." style="max-width:100%;height:auto;font-size:12.5px;">
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
  <rect x="330" y="16" width="160" height="40" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="410" y="41" text-anchor="middle" fill="currentColor" font-weight="700">VeNFTBidding</text>
  <rect x="580" y="16" width="140" height="40" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="650" y="41" text-anchor="middle" fill="currentColor" font-weight="700">Owner</text>

  <line x1="150" y1="56" x2="150" y2="315" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <line x1="410" y1="56" x2="410" y2="315" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <line x1="650" y1="56" x2="650" y2="315" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>

  <line x1="150" y1="96" x2="402" y2="96" stroke="currentColor" marker-end="url(#bd-a)"/>
  <text x="276" y="84" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">createBid &#183; approval only, funds stay in wallet</text>

  <line x1="650" y1="140" x2="418" y2="140" stroke="currentColor" marker-end="url(#bd-a)"/>
  <text x="534" y="128" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">acceptBid</text>

  <rect x="90" y="170" width="620" height="130" rx="10" fill="none" stroke="#FF0040" stroke-opacity="0.6" stroke-dasharray="4 4"/>
  <text x="110" y="192" fill="#FF0040" font-weight="700" letter-spacing="1" font-size="10">ATOMIC SETTLEMENT</text>

  <line x1="650" y1="230" x2="158" y2="230" stroke="#FF0040" marker-end="url(#bd-r)"/>
  <text x="400" y="218" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">NFT (owner &#8594; bidder)</text>

  <line x1="150" y1="272" x2="642" y2="272" stroke="#FF0040" marker-end="url(#bd-r)"/>
  <text x="400" y="260" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">payment minus 1% fee (bidder &#8594; owner)</text>
</svg>
<figcaption>A bid holds only a token approval until the owner calls <code>acceptBid</code>, which moves the NFT and the payment in one transaction, routing the protocol fee to the treasury.</figcaption>
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
