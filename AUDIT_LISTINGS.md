# Vezo Marketplace — Forensic Listings Audit

**Date:** 2026-06-02
**Scope:** Why veNFT listings are not appearing for the deployed mainnet/testnet addresses.
**Method:** Static trace of the repo's read path + **live on-chain verification** via raw JSON-RPC against the deployed contracts. No addresses, ABIs, or events were invented; every claim below is either traced to a file or verified against chain state.

---

## TL;DR (the answer)

1. **The deployed contracts DO contain listings.** Verified by direct `eth_call` against the addresses in `frontend/src/lib/contracts.ts`.
   - **Mainnet** `0x293ba0…8570`: `nextListingId = 173`, **19 flagged `active`**, of which **10 are genuinely valid** (seller still owns the NFT, lock not expired, sensible discounts paid in MEZO). These 10 *should* render.
   - **Testnet** `0xF180…F26f`: `nextListingId = 1`, that single listing is `active` **but its veNFT lock is expired** → correctly hidden by both the UI expiry filter and the contract's `ExpiredVeNFT` guard. The testnet marketplace is therefore **genuinely empty of buyable listings.**

2. **The read-path code in this snapshot is correct.** Traced line-by-line, `useActiveListings` → `MarketplaceClient` would render the 10 valid mainnet listings. Chain selection, address mapping, RPC transports, Multicall3, and the ABI all check out on-chain.

3. **Therefore the "empty marketplace" has two distinct, evidence-backed explanations:**
   - **Testnet:** real empty state (only listing is expired). **VERIFIED.**
   - **Mainnet:** if it appears empty in production, the cause is **not** the fetch logic in this backup. The leading hypothesis is a **host environment-variable override** of `NEXT_PUBLIC_MARKETPLACE_MAINNET` / veNFT addresses (env takes precedence over the correct fallback). **BLOCKED** — needs the production env to confirm.

---

## Critical diagnostic questions (answered)

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | Which contract for listings? | `VeNFTMarketplace` (`marketplace` in `contracts.ts`) | VERIFIED |
| 2 | Which contract for NFT metadata? | `MezoVeNFTAdapter.getIntrinsicValue` + the veNFT ERC-721s | VERIFIED |
| 3 | Which network is active by default? | Mainnet (`useChainId()` → `chains[0]` = `mezoMainnet`; `RainbowKitProvider initialChain={mezoMainnet}`) | VERIFIED |
| 4 | Address actually used per network? | The hardcoded fallbacks in `contracts.ts` **unless** a `NEXT_PUBLIC_*` env var overrides | VERIFIED (code) |
| 5 | Address that *should* be used? | The fallbacks — confirmed to hold listings on-chain | VERIFIED |
| 6 | Right event source indexed? | `Listed/Purchased/Cancelled` via chunked `eth_getLogs` (2 000-block chunks) | VERIFIED |
| 7 | Is the empty state real or accidental? | **Testnet: real.** **Mainnet: should NOT be empty** (10 valid listings) | VERIFIED |
| 8 | Chain mismatch? | No — `chainId`, `network`, transports, and contract map all derive from one source (`useChainId`) | VERIFIED |
| 9 | Address mismatch? | Only possible via env override (host) | BLOCKED |
| 10 | Data-source mismatch? | No — UI reads the same marketplace the contracts were deployed to | VERIFIED |
| 11 | Filtering bug? | Yes — a **latent** one (see Finding C); not the cause of the current mainnet emptiness | VERIFIED |
| 12 | Cache bug? | No cross-network cache key reuse found; reads are keyed by `chainId` | VERIFIED |
| 13 | ABI mismatch? | No — `listings`, `nextListingId`, struct order match the deployed contract | VERIFIED |
| 14 | RPC mismatch? | No — `eth_chainId` returns `0x7b7c` (31612) mainnet, `0x7b7b` (31611) testnet, matching config | VERIFIED |
| 15 | Subgraph mismatch? | N/A — no subgraph; data is read directly from chain + logs | VERIFIED |

---

## Findings (strict format)

### Finding A — Deployed contracts contain listings; testnet is legitimately empty
- **Status:** VERIFIED
- **Evidence (live RPC):**
  - Mainnet `nextListingId = 173`; 19 active; **10 pass** the ownerOf + non-expired checks (e.g. slot 149 veMEZO #1869, price 15 900 MEZO vs intrinsic 18 466 → ~13.9% discount; slot 165 #1650, 93 000 vs 116 408 → ~20.1%).
  - Testnet `nextListingId = 1`; slot 0 veBTC #1134 `active=true` but `lockEnd` is in the past → expired.
  - `adapter()` / `paymentRouter()` on the mainnet marketplace return exactly the addresses in `contracts.ts`.
- **File(s):** `frontend/src/lib/contracts.ts`, `frontend/src/hooks/useMarketplace.ts` (`useActiveListings`), `contracts/core/VeNFTMarketplace.sol`
- **Reasoning:** The on-chain `getActiveListings` count is misleading to parse by hand (returns `(Listing[], total)` where `total` is the 2nd ABI word), so I scanned every slot directly. The slot scan is exactly what `useActiveListings` does.
- **Impact:** On testnet the empty marketplace is expected. On mainnet, 10 listings should be visible.
- **Fix:** None required for the data itself. See Findings C/D/E for UX honesty + the mainnet hypothesis.
- **Verification:** Re-run an `eth_call` to `listings(i)` for `i` in `0..172` on mainnet and `0` on testnet.

### Finding B — Read path is correct (chain, address, ABI, Multicall3)
- **Status:** VERIFIED
- **Evidence:** `eth_chainId` → mainnet `0x7b7c`/testnet `0x7b7b` match `CONTRACTS.*.chainId`. Multicall3 is deployed at the canonical `0xca11…ca11` on both chains (3 808 bytes), so wagmi's batched `useReadContracts` (173 `listings` calls) resolves rather than reverting. Transports in `wagmi.ts` map `[mezoMainnet.id]→validationcloud`, `[mezoTestnet.id]→rpc.test`.
- **File(s):** `frontend/src/lib/wagmi.ts`, `frontend/src/hooks/useNetwork.ts`, `frontend/src/hooks/useMarketplace.ts`
- **Reasoning:** Both `network` and the `chainId` passed to every read derive from the single `useChainId()` source, so they cannot disagree. The numeric `chainId` fields in `contracts.ts` are not used for routing (routing uses the passport chain objects), so a numeric drift there could not misroute reads.
- **Impact:** Rules out chain/address/ABI/multicall as the cause of an empty mainnet grid.
- **Fix:** None.
- **Verification:** `eth_getCode` on `0xca11…ca11`; `eth_chainId` on each RPC.

### Finding C — Default discount filter silently hides valid listings (latent bug)
- **Status:** VERIFIED
- **Evidence:** `MarketplaceClient.tsx` `DEFAULT_FILTERS.maxDiscount = 50` and the filter:
  ```ts
  const dPct = l.discountBps !== null ? Number(l.discountBps) / 100 : 0;
  if (dPct < minDiscount || dPct > maxDiscount) return false; // minDiscount=0, maxDiscount=50
  ```
- **File(s):** `frontend/src/components/MarketplaceClient.tsx:111`, `:146-180`
- **Reasoning:** Any same-token listing priced **at a premium** (negative `discountBps` → `dPct < 0 < 0`) **or** at a **>50% discount** is dropped by default, with no active-filter pill telling the user a discount range is applied (the pills only surface `minDiscount > 0`). The current 10 mainnet listings happen to sit in 0–50%, so this is **not** today's root cause — but it is a real way valid listings vanish.
- **Impact:** Premium and deep-discount listings disappear; user sees fewer/zero listings with no indication a filter is active.
- **Fix:** Widen the default range to include premiums (e.g. `minDiscount = -100`) and remove the upper cap by default (or raise to a value that cannot exclude real listings), and/or treat the discount slider as inactive until the user touches it. Surface an active-filter pill whenever the range is non-default.
- **Verification:** Unit-test the filter with listings at −20%, 0%, 60% discount and assert all render under default filters.

### Finding D — Empty/error states are not distinguished (honesty gap)
- **Status:** VERIFIED
- **Evidence:** `useActiveListings` returns `{ listings, isLoading, refetch }` with **no error channel**; `MarketplaceClient` shows "No active listings yet" whenever `filteredListings.length === 0 && !isLoading`, regardless of whether the RPC actually failed.
- **File(s):** `frontend/src/hooks/useMarketplace.ts:794-967`, `frontend/src/components/MarketplaceClient.tsx:58-85,491-493`
- **Reasoning:** Spec rules #8/#10 (never hide failures, never fake empty states). If the RPC errors, the user is told "no listings" — a false empty state.
- **Impact:** A transient RPC failure is indistinguishable from a truly empty market; masks real outages.
- **Fix:** Thread `error`/`isError` out of the `useReadContract(s)` calls and render a distinct error state ("Couldn't load listings — retry") separate from the genuine empty state.
- **Verification:** Force the RPC to 500 and confirm the error state (not the empty state) renders.

### Finding E — Mainnet emptiness is most likely a host env-var override
- **Status:** BLOCKED
- **Evidence:** `contracts.ts` resolves every marketplace/veNFT address via `getEnvAddress(key, fallback)` where **the env var wins**. The fallbacks are confirmed-correct on-chain.
- **File(s):** `frontend/src/lib/contracts.ts:10-13,35-44,57-72`
- **Reasoning:** If the Vercel project has a stale/empty/wrong `NEXT_PUBLIC_MARKETPLACE_MAINNET` (or `NEXT_PUBLIC_VEBTC/VEMEZO_MAINNET`), it overrides the working fallback. A wrong veNFT address would also make the collection-equality check in `useActiveListings` reject every listing (collection address mismatch) → empty grid even though `nextListingId` is non-zero.
- **Missing dependency:** The production environment variables (Vercel dashboard) for the deployed frontend.
- **What must exist before implementation:** Confirmation of the live `NEXT_PUBLIC_*_MAINNET` values. If any differ from the verified addresses, that is the bug; the fix is to correct/unset them so the fallback applies.
- **Verification:** In the deployed app, log the resolved `CONTRACTS.mainnet` and compare against the verified addresses; or temporarily unset the env vars and confirm listings appear.

### Finding F — `vercel.json` build command uses `cd ..` (deployment risk)
- **Status:** PARTIALLY VERIFIED
- **Evidence:** Root `vercel.json`: `"buildCommand": "cd .. && npm run build --workspace=mezo-venft-frontend"` and `"installCommand": "cd .. && npm install --legacy-peer-deps"`.
- **File(s):** `vercel.json`
- **Reasoning:** `cd ..` steps **above** the repo root. This only works if Vercel's "Root Directory" is set to a subfolder; otherwise install/build run in the wrong place and may deploy a stale or wrong artifact. There are also two Next apps in the repo (`src/` is the default Next starter, `frontend/` is the real marketplace) — a misconfigured root could build the wrong one.
- **Impact:** Could deploy the placeholder app or a stale build, presenting as "nothing works / no listings."
- **Fix:** Set Vercel Root Directory to the repo root and drop the `cd ..`, or document the required Root Directory explicitly. Confirm the deployed app is `frontend/` (name `mezo-venft-frontend`), not the root `src/` starter.
- **Verification:** Inspect the Vercel build logs for the working directory and which workspace builds.

---

## Other verified observations (non-blocking)

- **Activity feed / history is sound on the read side.** `useActivityFeed` chunks `eth_getLogs` into 2 000-block slices (RPC caps at 10 000), wraps everything in try/catch, and computes **average discount from completed `Purchased` events** — not from open listings (matches spec Step 8). It only scans the last 200 000 blocks, so older history is not shown — acceptable, but document it.
- **Discount math is conservative and correct.** `computeDiscount.ts` returns `null` for cross-token listings (no oracle) instead of guessing — matches spec rule #11/#13.
- **Escrowless staleness is handled.** `useActiveListings` and the contract both cross-check `ownerOf == seller`; 9 of the 19 mainnet "active" listings are stale (seller transferred/withdrew/burned) and are correctly excluded. Note: when `ownerOf` *reverts* (burned token), the optimistic fallback keeps the listing visible — a minor inverse issue worth tightening.

---

## Prioritized, evidence-backed fix list

1. **(Finding E / BLOCKED)** Confirm and correct production `NEXT_PUBLIC_*_MAINNET` env vars. *Highest-likelihood real cause of a mainnet empty state.*
2. **(Finding F)** Fix/justify `vercel.json` root + `cd ..`; confirm `frontend/` is what deploys.
3. **(Finding C)** Fix the default discount-range filter so premiums and >50% discounts are not silently hidden; show a pill when the range is non-default.
4. **(Finding D)** Add a real error state to `useActiveListings` + `MarketplaceClient`; stop showing "no listings" on RPC failure.
5. **(Testnet)** Optionally differentiate "no listings" from "all listings expired/unbuyable" so the testnet empty state is honest.

Items 3 and 4 are safe, fully-justified code changes I can implement now. Items 1, 2, and 5 depend on data I cannot see from the repo (host env / Vercel settings) and are documented rather than guessed.

---

## Implemented fixes (2026-06-02)

### Fix C — discount filter no longer hides valid listings
- **Files:** `frontend/src/components/MarketplaceClient.tsx`
- **Change:** The discount band is now applied **only when the user narrows it** (`minDiscount > 0 || maxDiscount < 50`). At its default (0–50) it no longer excludes premium (negative-discount) or >50%-discount listings, and **never** hides listings whose discount is not computable (cross-token → `null`).
- **Why it matters for mainnet:** Several of the 10 valid mainnet listings sit near the 20% mark today, but the previous logic would have silently dropped any future premium or deep-discount listing with no filter pill shown.

### Fix D — honest error vs empty state + resolved-address surfacing
- **Files:** `frontend/src/hooks/useMarketplace.ts`, `frontend/src/components/MarketplaceClient.tsx`
- **Change:** `useActiveListings` now exposes `isError`, `error`, `marketplaceAddress`, and `isMarketplaceReady`. `MarketplaceClient` renders a distinct **LoadFailureState** when the read errors or no marketplace address is configured, instead of the false "No active listings yet" message. The state prints the **address actually being queried**.
- **Why it matters for mainnet (Finding E):** If the host env points `NEXT_PUBLIC_MARKETPLACE_MAINNET` at a wrong/empty address, the UI will now show that exact address, making an env-override misconfiguration immediately diagnosable instead of looking like an empty market.

### Fix G — testnet/honest empty state ("expired vs empty")
- **Files:** `frontend/src/components/MarketplaceClient.tsx`
- **Change:** `EmptyState` now takes a `variant`: `"filtered"` (user filters excluded everything), `"unavailable"` (listings exist on-chain but are all expired/sold/unbuyable — the current testnet case), or `"empty"` (genuinely no listings). The misleading "No active listings yet" is no longer shown when listings actually exist but are unbuyable.
- **Why:** Matches spec rule #8 — empty states must be honest. Testnet's single expired listing now reads as "No buyable listings right now" instead of "be the first to list."

### Fix H — burned/withdrawn veNFT (`ownerOf` revert) edge case
- **Files:** `frontend/src/hooks/useMarketplace.ts` (`useActiveListings` and `useListing`)
- **Change:** The `ownerOf` cross-check previously treated *any* missing result — including a **revert** (burned/nonexistent token) — as "still loading" and optimistically kept the listing visible. It now distinguishes three states: in-flight (trust the flag), reverted/zero-address owner (→ NOT owned, hide the stale listing), and a concrete owner (compare to seller). This prevents stale listings for burned positions from showing as buyable (they would revert on `buyNFT`).
- **Evidence:** On mainnet, burned veMEZO positions returned `ownerOf == 0x000…000`; several "active" slots are in this state.

### Still open (need your input)
- **E (mainnet root-cause, BLOCKED):** share the deployed `NEXT_PUBLIC_*_MAINNET` env values, or load the deployed site and read the address shown in the new empty/error state — compare against `0x293ba099c5Cf32af54013F00fEe8D2EA1cad8570` (marketplace), `0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279` (veBTC), `0xb90fdAd3DFD180458D62Cc6acedc983D78E20122` (veMEZO).
- **F:** confirm the Vercel Root Directory so the `cd ..` in `vercel.json` is correct and `frontend/` (not the root starter) is what deploys.
