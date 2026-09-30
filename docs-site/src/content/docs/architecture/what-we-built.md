---
title: What We Built, and Why
description: The engineering decisions behind Vezo - atomic escrowless settlement, the live price feed, cross-token checkout, on-chain bidding, grant disclosure, and the on-chain support page.
---

Vezo is a small surface with a lot of decisions underneath it. This page explains
what exists and the reasoning behind each piece, for anyone evaluating the
protocol, integrating with it, or building something similar on Mezo.

## Escrowless, atomic settlement

**What it is.** A seller lists a veNFT without transferring it anywhere. The
position stays in the seller's wallet, under an ERC-721 approval, until a buyer
executes the purchase. Payment and NFT transfer happen in one transaction.

**Why.** Escrow-based marketplaces take custody of the asset for the entire
listing period. For a vote-escrowed position that is expensive: while the NFT
sits in an escrow contract, the seller loses voting power and reward accrual on
an asset they still own. Approval-based listing means a seller keeps voting and
earning right up to the moment of sale, and can cancel at any time by revoking
the approval. It also removes the single largest attack surface, because there is
never a contract holding other people's NFTs.

The tradeoff is that a listing can go stale if the seller moves or re-approves
the token elsewhere. `buyNFT` revalidates ownership, approval, expiry, and
listing state at execution time and reverts rather than settling a bad trade.

## The live price feed

**What it is.** A server-side proxy at `/api/prices` that fetches BTC, MEZO, and
MUSD prices from CoinGecko, caches them at the edge for 60 seconds, and serves
them to the app. The header ticker, the USD figures under each listing price, the
bid estimator, and the support page all read from this one source.

**Why a proxy rather than calling CoinGecko from the browser.** Three reasons,
each of which broke a naive client-side implementation:

1. **CORS.** CoinGecko's public API rejects direct browser requests from an
   arbitrary origin. A server-side fetch has no such restriction.
2. **Rate limits.** The free tier is limited per IP. With every visitor calling
   directly, a busy hour exhausts the quota and the whole app loses prices. One
   cached server-side call serves every visitor at once.
3. **Failure containment.** The route returns nulls on any upstream error instead
   of throwing, so a CoinGecko outage degrades the UI to a dash where a price
   would be, rather than breaking the page.

**What it is used for beyond display.** The feed is an independent data path from
the chain RPC, which makes it useful as a sanity check. When you pay for an
MUSD-priced listing in BTC, the app derives the required input amount from the
on-chain pool, then compares that against the market-implied cost from this feed.
If the pool-derived amount exceeds the market cost by more than 25 percent, the
swap is refused with an explanation. An attacker would have to compromise two
unrelated data sources coherently to push a bad rate through.

Prices refresh every 60 seconds and carry 24-hour change, which is what drives
the green and red arrows in the ticker.

## Discounts computed, not claimed

**What it is.** Every listing shows how far its price sits below the position's
intrinsic value: the amount of BTC or MEZO locked inside the NFT. The percentage
is computed from on-chain state and the live price feed, never entered by the
seller.

**Why.** "10% off" means nothing if the seller types it in. Reading the locked
balance from the vote-escrow contract and converting the asking price through
live rates makes the number verifiable: anyone can recompute it from public data.
It also makes the market legible at a glance, because sorting by discount ranks
real value rather than marketing.

Positions are not automatically a bargain because they show a discount. A locked
token you cannot withdraw for two years is genuinely worth less than a liquid
one, and the discount is partly the market pricing that time. See
[Pricing & Discounts](/concepts/pricing-and-discounts/).

## Cross-token checkout

**What it is.** A listing priced in MUSD can be paid for in BTC. The
SwapPaymentRouter swaps the buyer's token through Mezo's Velodrome-style pool and
settles the purchase in one transaction, refunding any surplus.

**Why.** Requiring the exact quote token turns a two-click purchase into a manual
detour through a DEX, and the buyer eats the price movement in between. Routing
the swap inside the same transaction means the purchase either completes at an
acceptable rate or reverts entirely.

**Why it is deliberately narrow.** Only routes with real liquidity are offered.
BTC to MUSD works because that pool exists and is deep. There are no MEZO pools
on Mezo's DEX at present, so MEZO-priced listings are paid in MEZO, and
BTC-quoted listings reject swaps at the contract level. Offering a route that
reverts on execution is worse than not offering it, so the app only shows the
option where it actually works. The approval is also scoped to the exact budget
for that purchase rather than an unlimited allowance.

## On-chain bidding

**What it is.** Anyone can place a binding offer on a specific veNFT, in any
accepted payment token, with an expiry. Funds stay in the bidder's wallet under
an ERC-20 allowance until the owner accepts.

**Why.** The alternative, a bid contract that holds deposits, locks up capital
across every open offer and creates the same custody problem escrow does on the
sell side. Allowance-based bidding lets a bidder keep their funds working
elsewhere, bid on several positions at once, and cancel instantly. Acceptance
revalidates ownership and allowance on-chain, so a bid can never settle against
someone who no longer owns the token or no longer has the funds.

## Grant position disclosure

**What it is.** Listings created through the vote-escrow contract's token grant
mechanism carry a Grant badge, and the listing detail explains the vesting
schedule, the revocation window, and the merge/split restriction.

**Why.** A grant-backed veNFT looks identical to a normal one in every standard
field: same collection, same locked amount, same voting power. The difference is
invisible unless you read specific contract state. Until vesting completes, the
grant manager can revoke the portion of the locked tokens that has not vested,
and the position cannot be merged or split. A buyer who does not know this is
buying a different asset than they think they are.

Rather than hide the flag or block these listings, Vezo surfaces the state and
the vesting end date so the market can price the risk. See the badge on any
affected listing for the exact date.

## The support page

**What it is.** [support.vezo.exchange](https://support.vezo.exchange) accepts
contributions in BTC, MEZO, or MUSD and shows a public supporter board.

**Why it has no database.** Contributions are plain transfers to a dedicated
wallet, and the supporter's chosen name travels as bytes appended to the
transfer's own calldata. The board is reconstructed entirely from chain data, so
the numbers cannot be inflated and the names cannot be edited after the fact,
including by us. It costs nothing to run and nothing can be lost.

## What Vezo deliberately does not do

- **No custody, ever.** No deposits, no balances, no contract holding user
  assets between transactions.
- **No unlimited approvals in the swap path.** Approvals are scoped to the
  purchase amount.
- **No price oracle dependency for settlement.** Prices inform the interface;
  they never decide whether a trade is valid. Settlement depends only on the
  terms both parties signed.
- **No token, no points, no emissions.** The protocol charges a small fee on
  completed sales and nothing else.
