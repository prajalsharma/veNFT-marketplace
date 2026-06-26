# Bidding Feature — Security Audit & Fix Report

Audit performed with the [pashov/skills `solidity-auditor`](https://github.com/pashov/skills)
methodology (4 parallel specialist passes: access-control, economic-security,
execution-trace, trust-gap) over `VeNFTBidding.sol` and its `PaymentRouter`
dependency, cross-checked against live mainnet state.

Scope: the deployed bidding path (`VeNFTBidding` = `0xB61Ff06218D9784D71072ebc6921C682751cba3C`)
and the frontend that drives it (`BidsPanel`, `useBidding`, `useMarketplace`).

---

## Summary

The bidding feature was **non-functional end-to-end** for three independent reasons —
two on-chain, one in the frontend — plus a stale-listing display bug. All four are
fixed in this change set. **One fix requires redeploying `VeNFTBidding`** (see
*Deployment action required* below); the others are live as soon as the frontend ships.

| # | Severity | Where | Issue | Status |
|---|----------|-------|-------|--------|
| 1 | Critical | `PaymentRouter` / `VeNFTBidding.acceptBid` | `routePayment` is `onlyMarketplace`, bound one-time to `VeNFTMarketplace`, so **every `acceptBid` reverts `Unauthorized`** | Fixed (redeploy) |
| 2 | High | `VeNFTBidding` | Native-BTC bids can be created but never settled (ERC-20 pull path, no `msg.value`) | Fixed (redeploy) |
| 3 | High | `BidsPanel.tsx` | Token selector keyed by `t.symbol.toLowerCase()` → `undefined` address → "Address undefined is invalid" + both currency buttons highlight | Fixed (frontend) |
| 4 | High | `BidsPanel.tsx` | `createBid` requires a pre-existing ERC-20 allowance; the form never approved → `InsufficientAllowance` | Fixed (frontend) |
| 5 | Medium | `useMarketplace.ts` | Burned/withdrawn veNFTs (zero locked value) leak into the grid as active listings "worth 0/0" | Fixed (frontend) |
| 6 | Medium | `VeNFTBidding` | Bid filter fields (`minIntrinsicValue`, …) stored but **never enforced** in `acceptBid` | Documented (intentional per NatSpec) |
| 7 | Medium | `VeNFTBidding` | `tokenId == 0` "collection-level bid" is advertised but `acceptBid` uses it literally (`ownerOf(0)`) | Documented |
| 8 | Low | `VeNFTBidding` | `_tokenBids`/`bidderBids` arrays never pruned → view-function gas-DoS under spam | Documented |

---

## Confirmed findings

### 1 — `acceptBid` can never succeed (critical, verified on-chain)

`VeNFTBidding.acceptBid` settled payment via `paymentRouter.routePayment(...)`.
`routePayment` carries `onlyMarketplace`, and `PaymentRouter.marketplace` is a
**one-time** slot (`if (marketplace != address(0)) revert AlreadySet()`).

Live mainnet state:

```
PaymentRouter.marketplace() = 0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570  (VeNFTMarketplace)
VeNFTBidding                = 0xB61Ff06218D9784D71072ebc6921C682751cba3C
VeNFTBidding.nextBidId()    = 0   (no bid has ever settled)
```

Since `msg.sender` inside `routePayment` would be `VeNFTBidding` (≠ `marketplace`),
**every accept reverted** — for MEZO and MUSD too, not just BTC. The router's admin
is now the timelocked `MarketplaceAdmin`, which exposes no setter to re-point it, so
there was no on-chain recovery path.

**Fix:** `acceptBid` no longer calls `routePayment`. It reads the canonical fee
config from the router's public views (`calculateFee` + `feeRecipient`) and moves the
ERC-20 **directly** bidder → seller and bidder → treasury — identical accounting to
`PaymentRouter`'s ERC-20 branch, with **no authorization dependency** and no
`PaymentRouter` redeploy. Proven by `test/VeNFTBidding.test.ts`, which reproduces the
exact production config (router bound to the marketplace, not bidding) and asserts a
successful settlement with a correct 2% fee split and no stranded funds.

### 2 — Native-BTC bids unfillable (high)

`createBid` accepted `paymentToken == BTC` because `PaymentRouter.supportedTokens[BTC]`
is `true`, but BTC (`0x7b7C…0000`) is the native gas asset with no `transferFrom`
path, and the escrowless pull-settlement forwards no `msg.value`. Such bids could be
placed but never accepted (dead offers, misleading floor signals, wasted seller gas).

**Fix:** `createBid` rejects `paymentToken == paymentRouter.BTC()` up-front
(`UnsupportedPaymentToken`). The frontend already only offers MEZO/MUSD for bids, so
this is defense-in-depth that also blocks direct-contract callers.

### 3 & 4 — Frontend bid form bricked (high)

`BidsPanel.tsx` `PlaceBidForm`:

- **Token key bug:** `contracts[t.symbol.toLowerCase()]` → the contracts object keys
  are upper-case (`MEZO`, `MUSD`), so the lookup returned `undefined`. This (a)
  highlighted *both* currency buttons (`undefined === undefined`) and (b) passed
  `undefined` into the bid call → viem's *"Address 'undefined' is invalid"*. Fixed by
  keying on `t.symbol` and guarding the active check.
- **Missing approval:** `VeNFTBidding.createBid` requires the bidder to have already
  approved the bidding contract (it checks `allowance >= amount` and reverts
  `InsufficientAllowance`). The form called `createBid` with no prior approval. Fixed
  by reading allowance and inserting an `approve(bidding, maxUint256)` step (with an
  "Approving…" UI state) before `createBid`.

### 5 — Stale 0-value listings (medium)

`useActiveListings` cross-checks `ownerOf` to hide listings whose seller no longer
owns the NFT. For **burned/withdrawn** veNFTs (`locked()=(0,0,…)`, `ownerOf` reverts),
the per-call multicall failure was treated as an RPC error → "trust the active flag" →
the stale listing leaked through showing intrinsic value 0 / voting power 0 ("worth
0/0"). In a multicall a per-item `status:"failure"` is an on-chain revert (token
nonexistent), not a transport error (which fails the whole query), so these are now
hidden. `useListing` already handled this correctly via `ownerIsError`; this aligns the
grid hook with it.

Live examples found on mainnet (veMEZO, active listings, `ownerOf` = `0x0`):
`#1657`, `#209`, `#941`, `#1633`.

---

## Documented (not changed — design decisions for the team)

- **6. Unenforced bid filters.** `minIntrinsicValue`/`minVotingPower`/… are stored and
  emitted but never checked in `acceptBid`; the contract NatSpec explicitly calls them
  "hints for indexers, not enforced on-chain." A seller can therefore fill a bid with
  an NFT that fails the bidder's stated criteria. If on-chain enforcement is desired,
  add adapter checks (`getIntrinsicValue`/`getVotingPower`/`isExpired`) to `acceptBid`.
- **7. `tokenId == 0` collection-level bids.** Advertised as "any token in collection"
  but `acceptBid` uses the literal id. Either remove the semantics or add a separate
  `acceptCollectionBid(bidId, actualTokenId)` path. The frontend always passes a real
  `tokenId`, so this is latent.
- **8. Unbounded bid arrays.** `_tokenBids`/`bidderBids` are append-only; combined with
  escrow-free creation, an attacker can inflate them and gas-DoS the array-returning
  views. Recommend swap-pop pruning on cancel/accept + pagination on the views.

No reentrancy, double-spend, or fee-accounting defects were found — CEI ordering +
`ReentrancyGuard` + `SafeERC20` are correctly applied, and the fee split rounds down in
the seller's favour.

---

## Deployment action required

Finding #1's fix changes `VeNFTBidding` bytecode, so the currently-deployed bidding
contract (`0xB61Ff062…`) stays permanently broken until you **redeploy**:

```bash
# deploys a fresh VeNFTBidding wired to the existing router + admin
npx hardhat run scripts/deploy-v2-modules.ts --network mezomainnet
```

Then set the new address (the script prints it) in `frontend/src/lib/contracts.ts`
(`bidding:` fallback) or via `NEXT_PUBLIC_BIDDING_MAINNET`, and verify:

```bash
npx hardhat verify --network mezomainnet <NEW_BIDDING> <ROUTER> <ADMIN_CONTRACT>
```

No `PaymentRouter` redeploy is needed — the new `acceptBid` only reads its public
views. Findings #3–#5 are frontend-only and ship without any redeploy.
