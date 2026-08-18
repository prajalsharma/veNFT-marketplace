---
title: Vote-Escrow & veNFTs
description: What happens when users vote-escrow BTC or MEZO, how veNFTs work, how voting power decays, and what a buyer actually acquires.
---

This page explains the asset class Vezo trades. If you understand this page, everything else in the docs follows naturally.

## What "vote-escrow" means

Vote-escrow (the "ve" in veBTC and veMEZO) is a governance model pioneered by Curve and refined by Velodrome. The core idea:

> **Influence should belong to the participants with the longest commitment.**

Instead of one-token-one-vote (which lets anyone buy tokens, vote, and dump them), vote-escrow requires you to **lock tokens for a chosen duration**. Your voting power is a function of *both* the amount locked *and* the time remaining:

```
voting power = locked amount × (lock end − now) / MAXTIME
```

Two consequences fall out of this formula:

1. **Longer locks are more powerful.** Locking 1 BTC for the maximum duration gives close to 1.0 voting power; locking it for a tenth of that gives ~0.1.
2. **Voting power decays linearly.** As `now` approaches `lock end`, your voting power slides toward zero — even though the locked amount never changes. A position with 6 months left is twice as powerful as the same position with 3 months left.

When the lock finally expires, voting power reaches zero and the underlying tokens become withdrawable by whoever holds the position.

## What happens when you lock

On Mezo, locking works like this:

1. You choose an **amount** (BTC or MEZO) and a **duration**.
2. The vote-escrow contract takes custody of your tokens.
3. It mints you an **ERC-721 NFT** — a veBTC or veMEZO token — whose token ID identifies your lock.

That NFT *is* the position. It is the sole key to everything the lock grants:

| The veNFT holder gets | Details |
|---|---|
| **Voting power** | Decaying per the formula above; used in Mezo governance votes |
| **Reward accrual** | Protocol rewards flow to the position's current owner |
| **The underlying tokens** | Withdrawable by the holder once the lock expires |

:::tip[The key insight]
Because the position is an NFT, **transferring the NFT transfers the entire position** — remaining lock, voting power, reward stream, and the eventual claim on the locked tokens. Nothing about the lock changes when it changes hands; only the beneficiary does.
:::

### Permanent locks

Mezo's vote-escrow contracts (a Velodrome v2 lineage) also support **permanent locks** — positions with no expiry (`end = 0`) whose voting power never decays. Vezo's interface detects and displays these correctly.

## Intrinsic value: what's actually inside

Every veNFT has an objective floor: the **amount of BTC or MEZO locked inside it**, which Vezo calls its **intrinsic value**. A veBTC NFT with 0.5 BTC locked will, at lock expiry, be redeemable for exactly 0.5 BTC.

This is what makes veNFTs unusual among NFTs — they are not valued by scarcity or aesthetics, but by *redeemable contents plus governance utility*. It also creates the central dynamic of the Vezo market:

- **Sellers accept a discount to intrinsic value** as the price of exiting early. Selling 0.5 BTC's worth of locked value for 0.45 BTC today can beat waiting three months for the full 0.5.
- **Buyers earn that discount** as compensation for taking over the wait — and they get the voting power and rewards along the way, effectively for free.

How Vezo computes and displays this is covered in [Pricing & Discounts](/concepts/pricing-and-discounts/).

## What a buyer actually acquires — checklist

When you buy a veNFT on Vezo you receive, atomically, in one transaction:

- ✅ The ERC-721 token itself, in your wallet
- ✅ All remaining voting power (decaying on the same schedule)
- ✅ All future reward accrual from the moment of transfer
- ✅ The right to withdraw the locked BTC/MEZO at lock expiry
- ❌ **Not** rewards the seller already claimed before the sale
- ❌ **Not** the ability to unlock early — the lock schedule is unchanged by the sale

## Why locked positions need a marketplace

Vote-escrow deliberately makes positions illiquid — that's the commitment mechanism. But the *NFT wrapper* means the commitment can be traded without being broken: the lock stays intact no matter how many times the position changes hands. Vezo is the venue where that trade happens safely: [escrowless custody, atomic settlement](/concepts/marketplace-mechanics/), and live on-chain pricing data on every listing.
