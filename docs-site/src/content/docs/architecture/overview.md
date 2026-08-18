---
title: System Overview
description: How Vezo's contracts, frontend, indexer, and Mezo's own infrastructure fit together.
---

Vezo is four modular core contracts, two additive v2 modules, a Next.js frontend, and a subgraph indexer. It sits on top of Mezo's existing vote-escrow and DEX infrastructure and modifies none of it.

## The full picture

<figure>
<svg viewBox="0 0 940 660" role="img" aria-label="Vezo architecture. The frontend queries the Goldsky subgraph for fast reads and sends transactions to the Vezo contracts. Inside the Vezo contracts, the marketplace routes payments through the PaymentRouter, is governed by MarketplaceAdmin, and reads veNFT values through the MezoVeNFTAdapter, which queries the veBTC and veMEZO vote-escrow contracts on Mezo. The SwapPaymentRouter swaps through the Velodrome-style BTC/MUSD pool and then buys through the marketplace." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="ar-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="ar-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#FF0040"/>
    </marker>
  </defs>

  <!-- Frontend -->
  <rect x="300" y="20" width="340" height="72" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="470" y="50" text-anchor="middle" fill="currentColor" font-weight="700">Vezo frontend</text>
  <text x="470" y="70" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">Next.js &#183; wagmi/viem &#183; EVM wallets + Mezo Passport</text>

  <!-- Subgraph -->
  <rect x="60" y="160" width="220" height="72" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="170" y="190" text-anchor="middle" fill="currentColor" font-weight="700">Goldsky subgraph</text>
  <text x="170" y="210" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">listings &#183; bids &#183; activity</text>

  <!-- Frontend → subgraph -->
  <polyline points="360,92 360,124 170,124 170,156" fill="none" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="252" y="116" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">GraphQL queries</text>

  <!-- Marketplace events → subgraph (dashed) -->
  <line x1="170" y1="300" x2="170" y2="236" stroke="currentColor" stroke-dasharray="4 4" marker-end="url(#ar-c)"/>
  <text x="178" y="272" fill="currentColor" fill-opacity="0.7" font-size="11">indexes events</text>

  <!-- Frontend → contracts -->
  <line x1="500" y1="92" x2="500" y2="296" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="508" y="180" fill="currentColor" fill-opacity="0.7" font-size="11">transactions &#183; direct reads</text>

  <!-- Vezo contracts group -->
  <rect x="40" y="300" width="580" height="330" rx="14" fill="currentColor" fill-opacity="0.03" stroke="#FF0040" stroke-opacity="0.4"/>
  <text x="64" y="330" fill="#FF0040" font-weight="700" letter-spacing="1" font-size="11">VEZO CONTRACTS</text>

  <!-- Row A: Bidding · Marketplace · Adapter -->
  <rect x="64" y="350" width="150" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="139" y="376" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">VeNFTBidding</text>
  <text x="139" y="394" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">escrowless offers</text>

  <rect x="240" y="350" width="180" height="64" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="330" y="376" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">VeNFTMarketplace</text>
  <text x="330" y="394" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">list &#183; buy &#183; cancel</text>

  <rect x="456" y="350" width="150" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="531" y="376" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">MezoVeNFTAdapter</text>
  <text x="531" y="394" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">read-only</text>

  <!-- Marketplace → Adapter -->
  <line x1="420" y1="382" x2="452" y2="382" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="436" y="370" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10">reads</text>

  <!-- Row B: PaymentRouter · Admin · SwapRouter -->
  <rect x="64" y="520" width="160" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="144" y="546" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">PaymentRouter</text>
  <text x="144" y="564" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">fee &#8594; treasury &#183; rest &#8594; seller</text>

  <rect x="250" y="520" width="170" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="335" y="546" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">MarketplaceAdmin</text>
  <text x="335" y="564" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">roles &#183; pause &#183; 48h timelock</text>

  <rect x="456" y="520" width="150" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="531" y="546" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">SwapPaymentRouter</text>
  <text x="531" y="564" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">pay with any token</text>

  <!-- Marketplace → PaymentRouter -->
  <polyline points="270,414 270,470 144,470 144,516" fill="none" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="200" y="462" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">routePayment</text>

  <!-- Admin → Marketplace -->
  <line x1="335" y1="516" x2="335" y2="418" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="343" y="472" fill="currentColor" fill-opacity="0.7" font-size="11">pause &#183; fee governance</text>

  <!-- SwapRouter → Marketplace -->
  <polyline points="531,516 531,455 400,455 400,418" fill="none" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="470" y="447" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">buyNFT</text>

  <!-- Mezo network group -->
  <rect x="660" y="300" width="250" height="330" rx="14" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="684" y="330" fill="currentColor" font-weight="700" letter-spacing="1" font-size="11" fill-opacity="0.7">MEZO NETWORK</text>

  <rect x="684" y="350" width="202" height="72" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="785" y="378" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">veBTC &#183; veMEZO</text>
  <text x="785" y="397" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">vote-escrow (ERC-721)</text>

  <rect x="684" y="520" width="202" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="785" y="546" text-anchor="middle" fill="currentColor" font-weight="700" font-size="12">Velodrome-style pool</text>
  <text x="785" y="564" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="10.5">BTC / MUSD</text>

  <!-- Adapter → vote-escrow -->
  <line x1="606" y1="382" x2="680" y2="382" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="643" y="370" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10">queries</text>

  <!-- SwapRouter → pool -->
  <line x1="606" y1="552" x2="680" y2="552" stroke="currentColor" marker-end="url(#ar-c)"/>
  <text x="643" y="540" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="10">swap</text>
</svg>
<figcaption>The frontend discovers listings through the Goldsky subgraph (falling back to direct chain reads) and sends transactions to the Vezo contracts. The marketplace routes every settlement through the PaymentRouter, answers to MarketplaceAdmin for pause state and timelocked fees, and prices positions through the read-only MezoVeNFTAdapter, which queries Mezo's vote-escrow contracts. The SwapPaymentRouter swaps through the BTC/MUSD pool, then buys through the marketplace in the same transaction.</figcaption>
</figure>

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
