---
title: Security
description: Vezo's security model - audit status, the guarantees enforced in code, and how to report a vulnerability.
---

## Audit status

Vezo's contracts are adapted from the OpenXSwap marketplace pattern, an audited codebase, and were **audited by the Mezo team before launching on mainnet**. Every modification made for Mezo's dual-token vote-escrow system is documented; ten findings from that audit (one critical, three high, six medium) were fixed before deployment. The complete audit diff and per-module review notes are public in the repository:

- [Security & audit diff](https://github.com/prajalsharma/veNFT-marketplace#security--audit-diff): every change from the audited base, with severity and fix
- [`AUDIT_LISTINGS.md`](https://github.com/prajalsharma/veNFT-marketplace/blob/main/AUDIT_LISTINGS.md) · [`AUDIT_BIDDING.md`](https://github.com/prajalsharma/veNFT-marketplace/blob/main/AUDIT_BIDDING.md) · [`AUDIT_SWAP.md`](https://github.com/prajalsharma/veNFT-marketplace/blob/main/AUDIT_SWAP.md): per-module notes

## Guarantees enforced in code

1. **Buyers cannot lose funds.** Settlement follows checks-effects-interactions: ownership, expiry, allowance, and pause state are validated, then the NFT transfers, then payment routes. Any failure reverts the entire transaction.
2. **Sellers cannot lose their NFT.** The NFT leaves the seller's wallet only inside a settlement that pays them in the same transaction. Listing grants an approval, never custody.
3. **Bid funds stay with bidders.** Bids hold an ERC-20 approval only; payment is pulled at acceptance, atomically with the NFT transfer and fee split.
4. **Fees are bounded.** A hard cap of 5% is compiled into the contracts, every change sits behind a 48-hour on-chain timelock, and only one proposal can be pending at a time.
5. **Approvals cannot be farmed.** The `PaymentRouter`, the contract holding user ERC-20 approvals, accepts routing calls only from the marketplace contract, set once at deployment and immutable thereafter.

All state-mutating functions are reentrancy-guarded, all transfers use `SafeERC20`/`safeTransferFrom`, and the contracts are built on Solidity `^0.8.28` with checked arithmetic.

## Admin powers

Admin capabilities are deliberately narrow: pause/unpause trading in an emergency, propose timelocked fee changes (up to the 5% cap), and manage supported collections. Each sits behind its own segregated role (`PAUSER_ROLE`, `FEE_MANAGER_ROLE`, `COLLECTION_MANAGER_ROLE`). Admins cannot move or freeze user NFTs, redirect payments, or access bid funds. The pause check is fail-closed: if the marketplace cannot verify pause state, trading reverts rather than proceeding.

## Reporting a vulnerability

Please report suspected vulnerabilities privately via a [GitHub security advisory](https://github.com/prajalsharma/veNFT-marketplace/security/advisories/new) rather than a public issue or social media. Include a reproduction path if you can; reports are triaged promptly.
