---
title: System Overview
description: How Vezo's contracts, frontend, indexer, and Mezo's own infrastructure fit together.
---

Vezo is four modular core contracts, two additive v2 modules, a Next.js frontend, and a subgraph indexer. It sits on top of Mezo's existing vote-escrow and DEX infrastructure and modifies none of it.

## The full picture

```
                        ┌─────────────────────────────┐
                        │        Vezo frontend         │
                        │   Next.js · wagmi/viem       │
                        │   EVM wallets + Mezo Passport│
                        └──────┬──────────────┬───────┘
                     reads via │              │ transactions
                ┌──────────────▼───┐          │
                │ Goldsky subgraph  │          │
                │ (listings/activity│          │
                │  + on-chain       │          │
                │  fallback)        │          │
                └──────────────┬───┘          │
                               │              ▼
      ═══════════════════ Mezo network (EVM · BTC gas) ═══════════════════
                               │
   ┌───────────────────────────┼──────────────────────────────────┐
   │  VEZO CONTRACTS           │           MEZO INFRASTRUCTURE    │
   │                           │                                  │
   │  VeNFTMarketplace ────────┼──── reads ──▶ MezoVeNFTAdapter ──┼─▶ veBTC / veMEZO
   │     │        ▲            │              (read-only)         │   (vote-escrow,
   │     │        │ governs    │                                  │    ERC-721)
   │     ▼        │            │                                  │
   │  PaymentRouter  MarketplaceAdmin                             │
   │  (fee split)    (roles · pause · 48h fee timelock)           │
   │                                                              │
   │  v2 modules (additive):                                      │
   │  VeNFTBidding (offers) · SwapPaymentRouter ──────────────────┼─▶ Velodrome-style
   │                                                              │   BTC/MUSD pool
   └──────────────────────────────────────────────────────────────┘
```

## Layer by layer

### Smart contracts

The on-chain core, adapted from the audited OpenXSwap marketplace pattern and extended for Mezo's dual-token vote-escrow system. Four contracts with strict separation of concerns (trading, value-reading, payment routing, governance) plus two additive v2 modules for bidding and swap payments. Detailed in [Smart Contracts](/architecture/contracts/).

### The adapter boundary

All Mezo-specific knowledge is isolated in one read-only contract, `MezoVeNFTAdapter`. The marketplace core never talks to the vote-escrow contracts directly; it asks the adapter for locked amounts, decay-adjusted voting power, expiry status, and collection support. This boundary is what allowed the audited core pattern to be reused unchanged, and it's where the interface differences of Mezo's Velodrome-v2-style contracts (proxy contracts, lock struct shape, missing enumeration helpers) are absorbed.

### Frontend

A Next.js app (the same repo powers [vezo.exchange](https://www.vezo.exchange)) using wagmi/viem for chain access. It supports standard EVM wallets plus Bitcoin wallets (Unisat, OKX, Xverse) through Mezo Passport, and includes the marketplace, portfolio, activity feed, and a testnet/mainnet network switcher. All displayed position data (intrinsic value, voting power, expiry, discounts) is computed from live chain reads, not cached metadata.

### Indexing

Browsing needs fast queries over all listings and historical activity, which raw RPC calls make slow. A Goldsky-hosted subgraph (in `subgraph/`) indexes marketplace events into a queryable API. The frontend uses it when configured, and falls back automatically to direct on-chain reads when it isn't, so the marketplace never depends on the indexer to function. The indexer is a read-path optimization only; it holds no state the chain doesn't.

### Analytics

Protocol-level metrics (volume, sales, discount trends) are tracked publicly on the [Vezo Dune dashboard](https://dune.com/vezo/vezo), built from on-chain data. The queries live in `dune/` in the repo.

## Trust model in one paragraph

Custody never leaves users: NFTs sit in seller wallets until atomic settlement, and bid funds sit in bidder wallets until acceptance. The contracts enforce ordering (NFT before payment), re-validation at settlement, and fee limits (5% hard cap, 48-hour timelock) in code. Admin powers are limited to pausing trades and slow-moving fee governance. The admin cannot touch user NFTs, redirect payments, or change a sale's terms. The full defensive design is documented in [Security](/architecture/security/).
