---
title: Pricing & Discounts
description: How intrinsic value, voting power, and discount percentages are computed and displayed across the marketplace.
---

Every number on a Vezo listing card is derived from live on-chain data. This page defines each one precisely.

## Intrinsic value

**Intrinsic value** is the amount of underlying tokens locked inside the veNFT — read directly from Mezo's vote-escrow contract via Vezo's read-only adapter:

- a veBTC position's intrinsic value is denominated in **BTC**;
- a veMEZO position's intrinsic value is denominated in **MEZO**.

It answers the question: *"If I hold this to expiry, what do I withdraw?"*

## Voting power

Voting power is computed with the standard vote-escrow decay formula:

```
voting power = locked amount × (lock end − now) / MAXTIME
```

It is recalculated live, so the number you see is current — not a snapshot from listing time. Permanent locks (no expiry) show non-decaying voting power.

## Discount

The discount compares the asking price to the intrinsic value, **in the same denomination**:

```
discount = (intrinsic value − price) / intrinsic value × 100%
```

Examples with a veMEZO position holding 12,902 MEZO:

| Listed price | Discount | Meaning |
|---|---|---|
| 12,500 MEZO | **+3.1%** | Buyer pays 3.1% less than the locked contents |
| 12,902 MEZO | 0% | Buyer pays exactly intrinsic value |
| 13,500 MEZO | −4.6% (premium) | Buyer pays *more* than contents — pricing in governance utility |

:::note[Cross-currency listings]
A discount is only computed when the price and intrinsic value are comparable. Where a listing is priced in a different token than the locked asset (e.g. a veMEZO priced in MUSD), the interface either converts through live prices or shows no discount figure rather than an misleading one.
:::

### How to think about a discount

A discount is **payment for patience**. The buyer locks up liquidity until the lock expires; the discount is the yield on that wait, and the voting power plus reward accrual come on top. Two listings with identical discounts are *not* equal offers:

- **Time remaining** — 3% off with 40 days left annualizes far better than 3% off with 400 days left.
- **Reward stream** — a position that keeps earning protocol rewards effectively adds to the discount.
- **Premiums are rational too** — around contested governance votes, voting power *now* can be worth more than the locked contents.

## Marketplace-level stats

The marketplace header aggregates the live order book:

| Stat | Definition |
|---|---|
| **veBTC / veMEZO floor** | The cheapest active listing per collection, compared in USD terms (prices span BTC/MEZO/MUSD, so raw numbers aren't comparable), displayed in its own currency |
| **Avg discount** | The average discount across all open listings with a computable discount — what a buyer can actually get right now |

USD conversion uses the app's live price ticker. The [Dune dashboard](https://dune.com/vezo/vezo) tracks historical volume and discount trends over time.

## Sorting and filtering

Listings can be sorted by best discount and filtered by collection, discount range, lock expiry ("ending soon"), and position flags. Listings with premiums or unusually deep discounts are *not* silently hidden — filters only exclude what you explicitly ask them to.
