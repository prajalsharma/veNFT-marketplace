---
title: Buying a veNFT
description: Step-by-step guide to evaluating and purchasing a listed veBTC or veMEZO position, or bidding on one.
---

Prerequisite: a connected wallet with funds on Mezo. See [Getting Started](/guides/getting-started/).

## Evaluate before you buy

Every listing card shows the numbers that matter. Check all four:

| Field | What to check |
|---|---|
| Price vs intrinsic value | The [discount](/concepts/pricing-and-discounts/): how far below (or above) the locked contents you're paying |
| Lock ends | How long until you can withdraw the underlying. This is the wait you're being paid the discount for |
| Voting power | The governance weight you'd hold, already decay-adjusted to now |
| Payment token | What currency the seller wants (BTC, MEZO, or MUSD) |

:::tip[Annualize the discount]
A 3% discount with 40 days left is roughly 27% annualized. The same 3% with 300 days left is under 4% annualized. Divide the discount by the lock time remaining before comparing listings.
:::

Use the search box (token ID, collection, or seller address), the **Best discount** sort, and **Filters** (collection, discount range, ending-soon) to narrow the board.

## Buy a listing

1. Click **Buy now** on the listing.
2. If the listing is priced in an ERC-20 (MEZO or MUSD), approve the token first. Your wallet will prompt for an approval transaction, then the purchase. BTC-priced listings skip the approval.
3. Confirm the purchase transaction.
4. Done. The NFT is in your wallet and the seller has been paid.

What the contract guarantees during step 3 (details in [Marketplace Mechanics](/concepts/marketplace-mechanics/)):

- The NFT transfers to you before your payment routes to the seller.
- If the seller no longer owns the NFT, or the lock expired, or anything else is off, the transaction reverts and you keep your funds.
- Price is locked at the listed amount. There is no way to be charged more.

### Paying in a different token

If you hold BTC but the listing wants MUSD, choose **Pay with BTC** in the buy dialog. The app quotes the live pool rate, routes your BTC through Mezo's DEX, and completes the purchase in one transaction, refunding any surplus MUSD. See [Pay With Any Token](/concepts/pay-with-any-token/) for the mechanics and its slippage protection. BTC-priced and MEZO-priced listings are paid in their own currency directly.

## Or: make a bid instead

Not happy with any asking price? Bid below it, or bid on a veNFT that isn't even listed:

1. Open the position and choose **Make offer**.
2. Approve the bid amount. The funds stay in your wallet; only the approval is held.
3. Submit the bid. The owner can accept it on-chain at any time, which settles atomically.

Keep your balance funded while a bid stands, and cancel bids you no longer want honored. Full details in [Bidding](/concepts/bidding/).

## After the purchase

The position is now fully yours: voting power, reward accrual, and the right to withdraw the underlying at lock expiry. You can:

- **Hold to expiry** and withdraw the locked BTC/MEZO, realizing the discount.
- **Vote** in Mezo governance with the position's weight.
- **Re-list it** on Vezo whenever you want. See [Selling](/guides/selling/).
