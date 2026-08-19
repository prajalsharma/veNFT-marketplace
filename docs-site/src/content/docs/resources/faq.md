---
title: FAQ
description: Frequently asked questions about Vezo, veNFTs, custody, fees, and trading on Mezo.
---

## Basics

### Do I need to deposit anything to use Vezo?

No. Vezo has no accounts, deposits, or balances. Sellers keep their NFTs in their own wallets; bidders keep their funds in their own wallets. Your wallet talks to the contracts directly.

### What exactly am I buying?

The entire locked position: the ERC-721 token, its remaining voting power (decaying on its original schedule), all future reward accrual, and the right to withdraw the locked BTC/MEZO when the lock expires. See [Vote-Escrow & veNFTs](/introduction/vote-escrow/).

### Can I unlock the underlying tokens early after buying?

No. The lock schedule is set by Mezo's vote-escrow system and is unchanged by a sale. You withdraw when the lock expires, same as the original locker would have.

### What is intrinsic value?

The amount of BTC or MEZO locked inside the position, which is what it redeems for at expiry. The discount on every listing is measured against it. See [Pricing & Discounts](/concepts/pricing-and-discounts/).

## Selling

### Does listing lock up my NFT?

No, and this is the point of the escrowless design. Listing grants an approval only; the NFT stays in your wallet, you keep voting and earning rewards, and you can cancel anytime free of charge.

### What does it cost to sell?

Nothing to list or cancel (beyond gas). A 1% protocol fee is deducted from your proceeds only when a sale actually settles. See [Fees](/concepts/fees/).

### Can I get paid in stablecoins?

Yes. Price your listing in MUSD. You can also price in BTC or MEZO.

### What happens if I transfer my NFT while it's listed?

The listing becomes dead: any purchase attempt reverts, because a buyer-protection check re-validates your ownership at buy time. Cancel the listing before moving the NFT to keep the order book clean.

## Buying

### Is it safe to buy from a stranger?

That's what the atomic settlement is for. The purchase transaction transfers the NFT to you before routing payment, and reverts entirely if anything is wrong (the seller moved the NFT, the lock expired, and so on). There is no scenario where you pay and receive nothing. See [Marketplace Mechanics](/concepts/marketplace-mechanics/).

### The listing is priced in MUSD but I only have BTC. Am I stuck?

No. Choose **Pay with BTC** in the buy dialog: your BTC is swapped to MUSD through Mezo's DEX and the purchase completes in the same transaction, with slippage protection. See [Pay With Any Token](/concepts/pay-with-any-token/). The swap only works in that direction, though: BTC-priced listings must be paid in BTC (the marketplace settles them natively), and MEZO-priced listings must be paid in MEZO (MEZO has no DEX pool).

### Why do some listings show a premium instead of a discount?

Because voting power has value of its own. Around active governance decisions, buyers sometimes pay more than intrinsic value to acquire voting weight immediately rather than starting a long lock themselves.

### What wallets can I use?

Any EVM wallet (MetaMask, Rabby, WalletConnect), plus Bitcoin wallets (Unisat, OKX, Xverse) via Mezo Passport.

## Bidding

### Where are my funds while my bid is open?

In your wallet. Bids are escrowless; the bidding contract holds only an approval. When the owner accepts, settlement is atomic: NFT to you, payment to them, fee to the treasury, one transaction.

### Can the owner accept my bid after I've spent the funds elsewhere?

Acceptance would simply fail. The pull of funds reverts if your balance or approval no longer covers the bid. Cancel bids you can no longer honor, as a courtesy and to keep your offers credible.

## Protocol

### Who can change the fee, and how fast?

Fee changes go through the `MarketplaceAdmin` contract: proposed on-chain, then executable only after a 48-hour timelock, and never above the 5% hard cap compiled into the contracts. The current fee is 1%. See [Fees](/concepts/fees/).

### What can the admin do in an emergency?

Pause trading, instantly, via a dedicated pauser role. The admin cannot move user NFTs, seize funds, or alter a sale. See [Security](/architecture/security/).

### Is Vezo open source?

Yes. Contracts, frontend, subgraph, and analytics: [github.com/prajalsharma/veNFT-marketplace](https://github.com/prajalsharma/veNFT-marketplace).

### Where can I see protocol stats?

The public [Dune dashboard](https://dune.com/vezo/vezo) tracks volume, sales, and discount trends, and the app's Activity page shows the live event feed.
