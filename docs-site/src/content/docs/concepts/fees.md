---
title: Fees
description: The protocol fee, its hard cap, and the 48-hour timelock governing every change.
---

Vezo charges a single fee, taken from the seller's proceeds at the moment of sale. There are no listing fees, cancellation fees, deposit fees, or bidding fees.

## The protocol fee

| | |
|---|---|
| **Current rate** | 1.00% of the sale price |
| **Charged when** | A sale settles (listing purchase or bid acceptance) |
| **Paid by** | Deducted from the seller's proceeds |
| **Collected in** | The listing's payment currency (BTC, MEZO, or MUSD) |
| **Destination** | The protocol treasury, split automatically by the `PaymentRouter` |

Worked example — a listing priced at 12,500 MEZO:

```
Buyer pays:            12,500 MEZO
Protocol fee (1%):        125 MEZO → treasury
Seller receives:       12,375 MEZO
```

The split happens inside the same atomic settlement as the NFT transfer — the fee cannot be dodged, and the seller cannot be short-changed beyond it.

## Governance constraints on the fee

The fee is not freely adjustable. Three hard constraints are enforced *in the contracts*, not by policy:

1. **Hard cap: 5% (500 bps).** No admin action can ever set the fee higher — the cap is compiled into the contract.
2. **48-hour timelock.** Every fee change must be *proposed* on-chain, then wait 48 hours before it can be *executed*. Users always have two days' public notice of any change.
3. **One proposal at a time.** A pending proposal cannot be silently overwritten; proposing again while one is pending reverts.

Fee governance lives in the [MarketplaceAdmin contract](/architecture/contracts/) under a dedicated `FEE_MANAGER_ROLE`, separate from the pause and collection-management roles.

## Other costs to be aware of

- **Gas** — transactions on Mezo cost BTC gas, typically a trivial amount. Buyers pay gas on purchases; sellers pay gas on listing, cancelling, and accepting bids.
- **Swap execution** — when [paying with a different token](/concepts/pay-with-any-token/), the DEX pool's own pricing (including its spread and your slippage tolerance) applies to the swap leg. This goes to the pool's liquidity providers, not to Vezo.
