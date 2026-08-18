---
title: What is Mezo?
description: An introduction to Mezo, Bitcoin's Economic Layer, the EVM-compatible Bitcoin chain that Vezo is built on. No prior knowledge assumed.
---

:::note
You don't need to know anything about Mezo to read this page. If you already use Mezo, skip ahead to [Vote-Escrow & veNFTs](/introduction/vote-escrow/).
:::

Mezo describes itself as **Bitcoin's Economic Layer**: an EVM-compatible, Bitcoin-native blockchain built so that Bitcoin holders can borrow, earn, spend, and participate in governance without selling their BTC. Instead of sitting idle in a wallet, Bitcoin on Mezo is working capital.

## The essentials

| Property | What it means for you |
|---|---|
| EVM-compatible | Mezo runs the Ethereum Virtual Machine, so it works with MetaMask and every standard EVM wallet, and developers deploy Solidity contracts to it. The economy is denominated in Bitcoin. |
| BTC is the gas token | Transaction fees are paid in BTC, not ETH or a separate gas token. BTC on Mezo is bridged via Threshold Network's tBTC. |
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

<figure>
<svg viewBox="0 0 760 330" role="img" aria-label="Bitcoin bridges into Mezo via tBTC. On Mezo, the vote-escrow system mints veBTC and veMEZO NFTs, which trade on Vezo. Vezo's swap router uses Mezo's DEX pool." style="max-width:100%;height:auto;font-size:12.5px;">
  <defs>
    <marker id="mz-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="mz-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#FF0040"/>
    </marker>
  </defs>

  <!-- Bitcoin -->
  <rect x="20" y="130" width="130" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="85" y="158" text-anchor="middle" fill="currentColor" font-weight="700">Bitcoin</text>
  <text x="85" y="177" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">BTC</text>

  <!-- bridge arrow -->
  <line x1="150" y1="162" x2="212" y2="162" stroke="currentColor" marker-end="url(#mz-a)"/>
  <text x="181" y="150" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">tBTC bridge</text>

  <!-- Mezo group -->
  <rect x="216" y="16" width="524" height="298" rx="14" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="240" y="44" fill="currentColor" font-weight="700" letter-spacing="1" font-size="11">MEZO · BITCOIN'S ECONOMIC LAYER</text>
  <text x="240" y="61" fill="currentColor" fill-opacity="0.6" font-size="11">EVM &#183; BTC as gas &#183; MUSD stablecoin &#183; MEZO governance</text>

  <!-- Vote-escrow -->
  <rect x="240" y="84" width="222" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="351" y="110" text-anchor="middle" fill="currentColor" font-weight="700">Vote-escrow system</text>
  <text x="351" y="129" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">lock BTC / MEZO</text>

  <!-- DEX -->
  <rect x="240" y="230" width="222" height="64" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="351" y="256" text-anchor="middle" fill="currentColor" font-weight="700">Velodrome-style DEX</text>
  <text x="351" y="275" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">BTC / MUSD pool</text>

  <!-- Vezo -->
  <rect x="536" y="84" width="180" height="210" rx="10" fill="none" stroke="#FF0040" stroke-width="1.5"/>
  <text x="626" y="180" text-anchor="middle" fill="#FF0040" font-weight="800" font-size="15">Vezo</text>
  <text x="626" y="200" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">secondary market</text>
  <text x="626" y="216" text-anchor="middle" fill="currentColor" fill-opacity="0.6" font-size="11">for veNFTs</text>

  <!-- vote-escrow → Vezo -->
  <line x1="462" y1="116" x2="532" y2="116" stroke="#FF0040" marker-end="url(#mz-r)"/>
  <text x="497" y="104" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">veBTC / veMEZO NFTs</text>

  <!-- DEX → Vezo -->
  <line x1="462" y1="262" x2="532" y2="262" stroke="currentColor" marker-end="url(#mz-a)"/>
  <text x="497" y="250" text-anchor="middle" fill="currentColor" fill-opacity="0.7" font-size="11">swap route</text>
</svg>
<figcaption>Bitcoin enters Mezo through the tBTC bridge. Mezo's vote-escrow system turns locked BTC and MEZO into veNFTs, which trade on Vezo; Vezo's swap router uses the on-chain DEX pool for cross-token payments.</figcaption>
</figure>

Vezo doesn't modify Mezo's vote-escrow system in any way. It reads positions from the official vote-escrow contracts and facilitates transfers of the NFTs between users. The locked funds themselves never touch Vezo's contracts.

## Learn more

- [mezo.org](https://mezo.org), the official Mezo site
- [Vote-Escrow & veNFTs](/introduction/vote-escrow/), the asset class Vezo trades, in depth
