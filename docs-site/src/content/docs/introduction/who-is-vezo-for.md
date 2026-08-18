---
title: Who is Vezo for?
description: The participants Vezo serves - sellers who need liquidity, value buyers, governance participants, and the Mezo ecosystem itself.
---

Vezo serves four overlapping groups. Most users are more than one at different times.

## 1. Holders who need liquidity (sellers)

You locked BTC or MEZO months ago. The lock made sense then; now you need the capital for an opportunity, an emergency, or a change of plans. Without Vezo your position is frozen until expiry.

Vezo gives you an exit at a price you set, today. You choose the listing price (typically a small discount to intrinsic value; see [Pricing & Discounts](/concepts/pricing-and-discounts/)), and until someone buys:

- the NFT stays in your wallet,
- you keep voting and earning rewards,
- you can cancel anytime, free.

You can also skip listing entirely and wait for [bids](/concepts/bidding/) to come to you.

## 2. Value buyers

You want exposure to BTC or MEZO and you're patient. Buying a veNFT below intrinsic value is buying the underlying asset at a discount, with the discount realized automatically when the lock expires and you withdraw.

The trade you're making: you give up liquidity for the remaining lock duration, and you receive the discount plus all voting power and reward accrual in the meantime. A 5% discount on a position with 45 days left is a materially different offer than 5% with 300 days left, so Vezo shows lock expiry on every card to let you price the wait.

## 3. Governance participants

Voting power in Mezo requires locked positions, normally acquired by locking your own tokens for a long duration. Vezo offers a second path: buy voting power that someone else already committed.

- Acquire an existing position instantly instead of starting a fresh max-duration lock.
- Scale voting weight ahead of a governance decision you care about.
- Exit governance exposure when you no longer need it, by re-listing.

Because rewards and voting rights transfer with the NFT, a bought position is indistinguishable on-chain from one you locked yourself.

## 4. The Mezo ecosystem

A liquid secondary market makes the primary lock more attractive: users lock more, and for longer, when they know an exit exists. This is the flywheel Vezo contributes to Mezo:

<figure>
<svg viewBox="0 0 800 270" role="img" aria-label="A six-stage loop: a liquid exit exists, so locking feels safer, so users create more and longer locks, which mints more veNFTs, which creates more listings, which deepens the market, which strengthens the liquid exit." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="fw-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <rect x="40" y="30" width="200" height="56" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="140" y="53" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Liquid exit exists</text>
  <text x="140" y="71" text-anchor="middle" fill="#FF0040" fill-opacity="0.9" font-size="10.5">Vezo</text>

  <rect x="300" y="30" width="200" height="56" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="400" y="63" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Locking feels safer</text>

  <rect x="560" y="30" width="200" height="56" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="660" y="63" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">More, longer locks</text>

  <rect x="560" y="180" width="200" height="56" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="660" y="213" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">More veNFTs minted</text>

  <rect x="300" y="180" width="200" height="56" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="400" y="213" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">More listings</text>

  <rect x="40" y="180" width="200" height="56" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="140" y="213" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Deeper market</text>

  <line x1="240" y1="58" x2="296" y2="58" stroke="currentColor" marker-end="url(#fw-a)"/>
  <line x1="500" y1="58" x2="556" y2="58" stroke="currentColor" marker-end="url(#fw-a)"/>
  <line x1="660" y1="86" x2="660" y2="176" stroke="currentColor" marker-end="url(#fw-a)"/>
  <line x1="556" y1="208" x2="504" y2="208" stroke="currentColor" marker-end="url(#fw-a)"/>
  <line x1="296" y1="208" x2="244" y2="208" stroke="currentColor" marker-end="url(#fw-a)"/>
  <line x1="140" y1="176" x2="140" y2="90" stroke="currentColor" marker-end="url(#fw-a)"/>
</svg>
<figcaption>The liquidity flywheel: an exit market makes locking safer, which produces more locked positions, which feeds back into a deeper exit market.</figcaption>
</figure>

Vezo is deliberately neutral infrastructure: no whitelist, no curation, no permission needed to list or buy. Anyone holding a veBTC or veMEZO NFT can use it.

## Who Vezo is *not* for

- **Anyone seeking early unlock.** Buying or selling never changes the lock schedule. The underlying tokens stay locked until expiry regardless of who holds the NFT.
- **Custodial traders.** Vezo has no accounts, no deposits, and no balances. It is a set of contracts your wallet talks to directly.
