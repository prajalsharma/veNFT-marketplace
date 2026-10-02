// One definition of "buyable", shared by the marketplace grid, its stats,
// the landing page and anything else that counts listings. A listing can be
// active on-chain yet unbuyable: the marketplace contract rejects purchases
// of positions whose lock has already expired.

type ListingLike = { active: boolean; lockEnd: bigint | number | string };

export const nowSec = () => Math.floor(Date.now() / 1000);

export const isLockExpired = (l: ListingLike, now = nowSec()) =>
  Number(l.lockEnd) !== 0 && Number(l.lockEnd) <= now;

export const isBuyable = (l: ListingLike, now = nowSec()) => l.active && !isLockExpired(l, now);
