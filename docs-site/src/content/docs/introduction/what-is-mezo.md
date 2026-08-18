---
title: What is Mezo?
description: An introduction to Mezo, the EVM-compatible Bitcoin Layer 2 that Vezo is built on. No prior knowledge assumed.
---

:::note
You don't need to know anything about Mezo to read this page. If you already use Mezo, skip ahead to [Vote-Escrow & veNFTs](/introduction/vote-escrow/).
:::

Mezo is a Bitcoin-focused Layer 2 network. Its goal is to make Bitcoin productive: instead of BTC sitting idle in a wallet, Mezo lets you use it in applications for borrowing, earning, governance, and trading, while staying anchored to Bitcoin.

## The essentials

| Property | What it means for you |
|---|---|
| EVM-compatible | Mezo runs the Ethereum Virtual Machine, so it works with MetaMask and every standard EVM wallet, and developers deploy Solidity contracts to it. The economy is denominated in Bitcoin. |
| BTC is the gas token | Transaction fees are paid in BTC, not ETH. On Mezo, BTC plays the role ETH plays on Ethereum. |
| MUSD | Mezo's native stablecoin, minted against Bitcoin collateral. On Vezo it's one of the three payment currencies. |
| MEZO | The network's governance token. Locking it grants voting rights over the protocol. |

### Networks

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | `31612` | `31611` |
| RPC | `https://rpc.mezo.org` | `https://rpc.test.mezo.org` |
| Explorer | [explorer.mezo.org](https://explorer.mezo.org) | [explorer.test.mezo.org](https://explorer.test.mezo.org) |
| Faucet | n/a | [faucet.test.mezo.org](https://faucet.test.mezo.org) |

The Vezo app has a network switcher supporting both. Testnet is free to experiment on using faucet BTC.

## Governance on Mezo: why locks exist

Like many DeFi protocols, Mezo uses vote-escrow governance: to get a say in how the protocol evolves (and to earn the rewards that come with participating), you *lock* your tokens for a period of time. Two assets can be locked:

- **BTC → veBTC.** Lock Bitcoin, receive a veBTC position.
- **MEZO → veMEZO.** Lock the governance token, receive a veMEZO position.

The lock is a real commitment: your tokens cannot be withdrawn until the lock expires. In exchange, you receive voting power proportional to how much you locked and how long you locked it for, plus whatever rewards the protocol distributes to voters.

Each lock is represented as an NFT, and this is the key fact for Vezo. Because the position is an ERC-721 token, it is transferable: selling the NFT sells the entire locked position, including its remaining lock, its voting power, and its claim on future rewards. That transferability is what makes a secondary market possible. It's explained in depth in [Vote-Escrow & veNFTs](/introduction/vote-escrow/).

## Where Vezo fits in Mezo's ecosystem

```
Bitcoin (L1)
   │  bridge
   ▼
Mezo (L2, EVM) ── BTC as gas · MUSD stablecoin · MEZO governance
   │
   ├── Vote-escrow system ── lock BTC/MEZO → veBTC/veMEZO NFTs
   │
   ├── Velodrome-style DEX ── on-chain token swaps (used by Vezo's swap router)
   │
   └── Vezo ── secondary market for veBTC/veMEZO NFTs
```

Vezo doesn't modify Mezo's vote-escrow system in any way. It reads positions from the official vote-escrow contracts and facilitates transfers of the NFTs between users. The locked funds themselves never touch Vezo's contracts.

## Learn more

- [mezo.org](https://mezo.org), the official Mezo site
- [Vote-Escrow & veNFTs](/introduction/vote-escrow/), the asset class Vezo trades, in depth
