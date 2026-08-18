---
title: Smart Contracts
description: The four core contracts, the two v2 modules, their responsibilities, deployment wiring, and all deployed addresses.
---

Vezo's on-chain layer is deliberately modular: each contract has one job, and the seams between them are where security properties are enforced.

## Core contracts

### VeNFTMarketplace

The trading engine: listing, buying, and cancelling.

- Validates ownership and approval at list time, then re-validates ownership at buy time, so a listing can never be used to sell an NFT the seller no longer holds.
- Enforces the settlement order (state closed, then NFT transferred, then payment routed) with checks-effects-interactions and reentrancy guards.
- Blocks self-purchase and purchase of expired positions.
- Consults `MarketplaceAdmin` for pause state, fail-closed: if the check itself fails, trading reverts.

### MezoVeNFTAdapter

A read-only adapter around Mezo's vote-escrow contracts (veBTC and veMEZO). For any token ID it answers: locked amount (intrinsic value), decay-adjusted voting power, lock expiry, expiry status, and collection support. It holds no funds and mutates no state; it isolates every Mezo-specific quirk from the trading core. The deployed vote-escrow contracts are EIP-1967 proxies over a Velodrome-v2-style implementation, whose interface differences (a four-field lock struct with `isPermanent`, no `balanceOfNFT` or `tokensOfOwner` helpers) are absorbed here and in the frontend.

### PaymentRouter

Moves money. Splits every settlement into protocol fee to the treasury and remainder to the seller, supporting native BTC (value transfer) and ERC-20s (MEZO, MUSD) uniformly.

- `routePayment` is restricted to the marketplace contract only (`onlyMarketplace`), a critical guard since users grant this contract ERC-20 approvals.
- `setMarketplace` is one-time only; the routing authority can never be silently re-pointed.
- Admin handover uses a two-step transfer (propose + accept), and admin was transferred to `MarketplaceAdmin` at deployment so fee changes flow through the timelock.
- Includes `sweepBTC()` to recover native BTC accidentally sent to the contract.

### MarketplaceAdmin

Governance and operational controls, with segregated roles:

| Role | Power |
|---|---|
| `PAUSER_ROLE` | Instantly halt all trading (emergency brake) |
| `FEE_MANAGER_ROLE` | Propose and execute fee changes, subject to the 48-hour timelock and 5% hard cap |
| `COLLECTION_MANAGER_ROLE` | Manage supported veNFT collections |

Fee changes are two-phase (`proposeFeeChange`, a 48-hour wait, then `executeFeeChange`), refuse to overwrite a pending proposal, and refuse to execute against an unconfigured router.

## v2 modules (additive)

Deployed on top of the unchanged core:

| Module | Job | Key property |
|---|---|---|
| `VeNFTBidding` | On-chain offers on any veNFT | Escrowless: bidder funds stay in-wallet until `acceptBid` settles atomically with the fee split enforced |
| `SwapPaymentRouter` | Pay-with-any-token purchases | Swaps through the Velodrome-style BTC/MUSD pool (pool-direct, no oracle), then calls `buyNFT` and forwards the NFT in one transaction |

See [Bidding](/concepts/bidding/) and [Pay With Any Token](/concepts/pay-with-any-token/) for user-level behavior.

## Deployment wiring

The deploy sequence establishes the security topology. Each step closes a door:

```
1. MezoVeNFTAdapter(veBTC, veMEZO)
2. PaymentRouter(feeRecipient, admin, MUSD, feeBps)
3. MarketplaceAdmin(admin, isTestnet)
4. VeNFTMarketplace(adapter, router, admin)
5. router.setMarketplace(marketplace)   ← one-time: locks who may route payments
6. admin.setPaymentRouter(router)       ← links fee governance
7. router.transferAdmin(adminContract)  ← proposes handover of router admin
8. admin.acceptRouterAdmin()            ← completes it: fee changes now timelocked
```

## Deployed addresses

### Mezo Mainnet (chain ID 31612)

| Contract | Address |
|---|---|
| VeNFTMarketplace | `0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570` |
| MezoVeNFTAdapter | `0x8EC595099030aB282511c87cAF104E734418Eff5` |
| PaymentRouter | `0xA4098F23aA2883DA13A714982d89BFB403718fb9` |
| MarketplaceAdmin | `0x5bBc2d83D0786Bf2Bc56096d832e6B7cfcca9396` |
| VeNFTBidding (v2) | `0xef35dc538b50549e95687a51e8aa542D485ea384` |
| SwapPaymentRouter (v2) | `0x638Bab65738bA7BcD47D3c1d6Cb4eaf6CC872617` |
| veBTC (Mezo) | `0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279` |
| veMEZO (Mezo) | `0xb90fdAd3DFD180458D62Cc6acedc983D78E20122` |
| MUSD (Mezo) | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |

### Mezo Testnet (chain ID 31611)

| Contract | Address |
|---|---|
| VeNFTMarketplace | `0xF18016FbadfA732c58814b6341054484FcDBF26f` |
| MezoVeNFTAdapter | `0x526A542F7B2809376391CD7f884Daf4967fFEb14` |
| PaymentRouter | `0x157ed850E41e0f220549005da8b55bBE2AE32d7D` |
| MarketplaceAdmin | `0xdBBc692828866ab0ee8BC8C2e6B7d911F7B89Ed4` |
| veBTC (Mezo) | `0x38E35d92E6Bfc6787272A62345856B13eA12130a` |
| veMEZO (Mezo) | `0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b` |
| MUSD (Mezo) | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |

Native tokens on both networks: BTC `0x7b7c…0000`, MEZO `0x7b7c…0001`.

All source is public in the [GitHub repository](https://github.com/prajalsharma/veNFT-marketplace) under `contracts/`.
