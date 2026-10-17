/**
 * grantVesting.ts
 *
 * How much of a grant veNFT the grant manager could take back right now.
 * Mirrors VeMEZO `Grant._revokeGrant` (contracts/ve/Grant.sol) exactly:
 *
 *   now >= vestingEnd          → nothing (fully vested, revoke reverts)
 *   now <= cliffEnd            → everything except rebase rewards
 *                                (no rewards: all but 1 wei, and the NFT itself)
 *   otherwise                  → effective = locked − rebase
 *                                vested    = effective × (now − start) / (end − start)
 *                                revocable = effective − vested
 *
 * Rebase rewards earned by the grant always stay with the holder.
 */

export interface GrantTerms {
  vestingStart: bigint;
  vestingEnd: bigint;
  cliffEnd: bigint;
  rebaseAmount: bigint;
}

export function revocableAmount(locked: bigint, g: GrantTerms, nowSec: bigint): bigint {
  if (locked <= 0n || g.vestingStart === 0n || g.vestingEnd === 0n) return 0n;
  if (nowSec >= g.vestingEnd) return 0n;
  const rebase = g.rebaseAmount > locked ? locked : g.rebaseAmount;
  if (nowSec <= g.cliffEnd) {
    return rebase > 0n ? locked - rebase : locked - 1n;
  }
  const effective = locked - rebase;
  const span = g.vestingEnd - g.vestingStart;
  if (span <= 0n) return 0n;
  const vested = (effective * (nowSec - g.vestingStart)) / span;
  return effective > vested ? effective - vested : 0n;
}
