---
title: Security
description: Vezo's security model — audited base pattern, the full list of hardening fixes, defensive checklist, and what admins can and cannot do.
---

Vezo's contracts are adapted from the **audited OpenXSwap marketplace pattern**, with every modification documented and independently reviewed. This page summarizes the security posture; the complete diff lives in the [repository README](https://github.com/prajalsharma/veNFT-marketplace#security--audit-diff) and the per-module audit notes (`AUDIT_LISTINGS.md`, `AUDIT_BIDDING.md`, `AUDIT_SWAP.md`).

## The core guarantees

1. **You cannot lose funds buying.** The NFT transfers before payment routes; ownership, expiry, allowance, and pause state are all validated first; any failure reverts everything.
2. **You cannot lose your NFT selling.** The NFT leaves your wallet only inside a settlement that pays you in the same transaction.
3. **Fees are bounded in code.** 5% hard cap, 48-hour timelock on changes, one pending proposal at a time.
4. **Approvals can't be farmed.** The `PaymentRouter` — the contract holding user ERC-20 approvals — only accepts routing calls from the marketplace contract, set once, immutably.

## Issues found and fixed during review

| Issue | Severity | Fix |
|---|---|---|
| Payment sent before NFT transfer — buyer could pay for a moved NFT | **Critical** | Reordered: NFT transfers first, then payment routes |
| `routePayment` callable by anyone — ERC-20 approval drain vector | **High** | `onlyMarketplace` modifier on `PaymentRouter` |
| Pause check fail-open — pause ineffective if the admin call failed | **High** | Fail-closed: reverts with `PauseCheckFailed` |
| ERC-20 allowance unvalidated before the NFT moved | **High** | Allowance pre-check before `safeTransferFrom` |
| Expired (zero-value) veNFTs purchasable | Medium | `adapter.isExpired()` check in `buyNFT` |
| Seller could buy own listing | Medium | `SelfPurchase` guard |
| Ownership not re-checked at buy time | Medium | `ownerOf` re-validation before state mutation |
| Fee proposal silently overwritable | Medium | Reverts with `PendingChangeExists` |
| Fee "executed" without router configured | Medium | Reverts with `RouterNotSet` |
| Stale, manipulable floor-price accounting | Medium | Marked view-only; never used as a price oracle |

Additional hardening on the payment path: two-step admin transfer (typo-proof), one-time `setMarketplace` (no silent re-pointing), and `sweepBTC()` recovery for stray native BTC.

## Defensive checklist (enforced in code)

```
[✓] Checks-effects-interactions in buyNFT (state → NFT → payment)
[✓] ReentrancyGuard on all state-mutating functions
[✓] SafeERC20 for all token transfers · safeTransferFrom for all NFTs
[✓] Ownership + approval validated at list AND re-validated at buy
[✓] Self-purchase and expired-position purchase blocked
[✓] routePayment restricted to the marketplace, set once
[✓] Fee hard cap 5% · 48h timelock · no proposal overwrite
[✓] Emergency pause fail-closed, held by dedicated PAUSER_ROLE
[✓] Two-step admin transfers · zero-address guards on constructors
[✓] Solidity ^0.8.28 (checked arithmetic)
```

## What admins can and cannot do

| Admins **can** | Admins **cannot** |
|---|---|
| Pause/unpause trading | Move or freeze any user's NFT |
| Propose a fee change (≤5%), executable after 48h | Change a fee without the public 48-hour delay |
| Manage supported collections | Redirect a sale's payment |
| Recover stray BTC sent to the router | Touch bid funds or listing proceeds |

Roles are segregated (`PAUSER_ROLE`, `FEE_MANAGER_ROLE`, `COLLECTION_MANAGER_ROLE`) so operational keys carry minimum power.

## Residual risks — be honest with yourself

No system removes all risk. What remains:

- **Smart contract risk.** The base pattern is audited and the modifications reviewed, but audits reduce risk; they don't eliminate it.
- **Upstream risk.** veNFT values are read from Mezo's vote-escrow contracts (upgradeable proxies); Vezo inherits the correctness and governance of that upstream system, as does every holder of these positions.
- **Market risk.** A discount to intrinsic value is not free money — you carry BTC/MEZO price exposure for the remaining lock duration.
- **Swap-leg risk.** Swap payments execute against live pool reserves; thin liquidity means worse pricing (bounded by your slippage setting).

Found a vulnerability? Open a security advisory on the [GitHub repository](https://github.com/prajalsharma/veNFT-marketplace) rather than a public issue.
