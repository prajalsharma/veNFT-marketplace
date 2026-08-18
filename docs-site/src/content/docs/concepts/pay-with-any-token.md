---
title: Pay With Any Token
description: How the SwapPaymentRouter lets buyers pay for a listing in a different token than it's priced in, swapping through Mezo's DEX in one transaction.
---

A listing priced in MUSD shouldn't be unreachable for a buyer holding only BTC. The `SwapPaymentRouter` (a v2 module) removes that friction: the buyer pays in the token they hold, and the router swaps it into the listing's price currency and completes the purchase, all in a single transaction.

## How it works

<figure>
<svg viewBox="0 0 880 300" role="img" aria-label="swapAndBuy pulls the buyer's token, swaps it through the BTC/MUSD pool into the listing's price token, calls buyNFT on the marketplace, and forwards the NFT back to the buyer, all inside one transaction that reverts as a unit." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="sw-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="sw-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#FF0040"/>
    </marker>
  </defs>

  <rect x="200" y="24" width="650" height="252" rx="12" fill="none" stroke="#FF0040" stroke-opacity="0.6" stroke-dasharray="4 4"/>
  <text x="220" y="46" fill="#FF0040" font-weight="700" letter-spacing="1" font-size="10">ONE TRANSACTION &#183; REVERTS AS A UNIT</text>

  <rect x="30" y="60" width="130" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="95" y="95" text-anchor="middle" fill="currentColor" font-weight="700">Buyer</text>

  <rect x="230" y="60" width="180" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="320" y="86" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">SwapPaymentRouter</text>
  <text x="320" y="105" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">swapAndBuy</text>

  <rect x="640" y="60" width="180" height="60" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="730" y="86" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">VeNFTMarketplace</text>
  <text x="730" y="105" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">buyNFT</text>

  <rect x="230" y="190" width="180" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="320" y="216" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">BTC / MUSD pool</text>
  <text x="320" y="235" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">pool-direct, no oracle</text>

  <line x1="160" y1="90" x2="226" y2="90" stroke="currentColor" marker-end="url(#sw-a)"/>
  <text x="193" y="78" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">tokenIn</text>

  <line x1="320" y1="120" x2="320" y2="186" stroke="currentColor" marker-end="url(#sw-a)"/>
  <text x="330" y="158" fill="currentColor" fill-opacity="0.7" font-size="10.5">swap &#8594; listing's price token</text>

  <line x1="410" y1="90" x2="636" y2="90" stroke="currentColor" marker-end="url(#sw-a)"/>
  <text x="523" y="78" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">buyNFT with swapped funds</text>

  <polyline points="730,120 730,286 95,286 95,124" fill="none" stroke="#FF0040" marker-end="url(#sw-r)"/>
  <text x="500" y="278" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10.5">NFT &#8594; buyer</text>
</svg>
<figcaption><code>swapAndBuy</code> pulls the buyer's token, swaps it through the pool into the listing's price currency, buys through the marketplace, and forwards the NFT, atomically end to end.</figcaption>
</figure>

Because everything happens inside one transaction, the atomicity guarantee of the core marketplace extends across the swap. If the swap gets a worse rate than the buyer allowed, or the purchase fails for any reason, the whole transaction reverts and the buyer keeps their original tokens.

## Supported routes

Swaps route through the on-chain BTC/MUSD pool:

| You hold | Listing priced in | Route |
|---|---|---|
| BTC | MUSD | BTC → MUSD via pool, settled by the router |
| The listing's own token | anything | No swap; normal `buyNFT` |

BTC-priced listings are not swappable in the current router: the marketplace settles BTC listings through its native-value path, and the router's swap leg settles in ERC-20 only. Pay BTC-priced listings in BTC directly.

:::note[Why MEZO-priced listings are direct-pay only]
MEZO has no DEX pool on Mezo at present, so there is no on-chain route to swap into or out of MEZO. Listings priced in MEZO are paid in MEZO directly. If a MEZO pool is deployed in the future, the router's pool-direct design can accommodate it.
:::

## Design choices worth knowing

- **Pool-direct, no oracle.** The swap executes against the DEX pool's actual reserves rather than an external price feed. There is no oracle to manipulate or to go stale; the price you get is the pool's real execution price at that block.
- **Slippage-bounded.** The buyer's transaction carries a maximum input amount. If pool movement would exceed it, the transaction reverts rather than overpaying.
- **The core marketplace is untouched.** `SwapPaymentRouter` is additive: it composes with the existing `buyNFT` exactly like an ordinary buyer. Sellers don't do anything differently, and receive exactly the currency they asked for.
