---
title: Pay With Any Token
description: How the SwapPaymentRouter lets buyers pay for a listing in a different token than it's priced in, swapping through Mezo's DEX in one transaction.
---

A listing priced in MUSD shouldn't be unreachable for a buyer holding only BTC. The **SwapPaymentRouter** (a v2 module) removes that friction: the buyer pays in the token they hold, and the router swaps it into the listing's price currency and completes the purchase — **all in a single transaction**.

## How it works

```
swapAndBuy(listingId, tokenIn, maxAmountIn)
 │
 ├─ 1. Pull buyer's tokenIn
 ├─ 2. Swap tokenIn → listing's price token
 │        via Mezo's Velodrome-style BTC/MUSD pool (pool-direct, no oracle)
 ├─ 3. Call marketplace buyNFT with the swapped funds
 └─ 4. Forward the NFT to the buyer
```

Because everything happens inside one transaction, the atomicity guarantee of the core marketplace extends across the swap: if the swap gets a worse rate than the buyer allowed, or the purchase fails for any reason, **the whole transaction reverts** and the buyer keeps their original tokens.

## Supported routes

Swaps route through the on-chain **BTC/MUSD pool**:

| You hold | Listing priced in | Route |
|---|---|---|
| BTC | MUSD | BTC → MUSD via pool |
| MUSD | BTC | MUSD → BTC via pool |
| The listing's own token | anything | No swap — normal `buyNFT` |

:::note[Why MEZO-priced listings are direct-pay only]
MEZO has no DEX pool on Mezo at present, so there is no on-chain route to swap into or out of MEZO. Listings priced in MEZO are paid in MEZO directly. If a MEZO pool is deployed in the future, the router's pool-direct design can accommodate it.
:::

## Design choices worth knowing

- **Pool-direct, no oracle.** The swap executes against the DEX pool's actual reserves rather than an external price feed. There is no oracle to manipulate or to go stale; the price you get is the pool's real execution price at that block.
- **Slippage-bounded.** The buyer's transaction carries a maximum input amount; if pool movement would exceed it, the transaction reverts rather than overpaying.
- **The core marketplace is untouched.** `SwapPaymentRouter` is additive — it composes with the existing `buyNFT` exactly like an ordinary buyer. Sellers don't do anything differently, and receive exactly the currency they asked for.
