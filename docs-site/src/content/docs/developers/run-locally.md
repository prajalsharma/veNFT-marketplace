---
title: Run Locally
description: Clone the repo, compile the contracts, run the frontend against testnet or mainnet, and deploy your own instance.
---

Everything — contracts, frontend, subgraph, analytics — lives in one repository: [github.com/prajalsharma/veNFT-marketplace](https://github.com/prajalsharma/veNFT-marketplace).

## Prerequisites

- Node.js ≥ 20 and npm (or bun)
- An EVM wallet with Mezo testnet added ([Getting Started](/guides/getting-started/#2-add-the-mezo-network))
- Testnet BTC from [faucet.test.mezo.org](https://faucet.test.mezo.org)

## Clone, compile, run

```bash
git clone https://github.com/prajalsharma/veNFT-marketplace.git
cd veNFT-marketplace

npm install          # root: contracts + hardhat toolchain
npm run compile      # build contracts, generate ABIs in artifacts/
npm test             # run the contract test suites

cd frontend
npm install
npm run dev          # → http://localhost:3000
```

The frontend runs against the **live deployed contracts** out of the box — you don't need to deploy anything to develop UI against testnet or mainnet.

## Frontend environment

`frontend/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_ID=your_walletconnect_project_id

# Testnet (live deployment — use as-is)
NEXT_PUBLIC_MARKETPLACE_TESTNET=0xF18016FbadfA732c58814b6341054484FcDBF26f
NEXT_PUBLIC_ADAPTER_TESTNET=0x526A542F7B2809376391CD7f884Daf4967fFEb14
NEXT_PUBLIC_ROUTER_TESTNET=0x157ed850E41e0f220549005da8b55bBE2AE32d7D
NEXT_PUBLIC_ADMIN_TESTNET=0xdBBc692828866ab0ee8BC8C2e6B7d911F7B89Ed4
```

Mainnet equivalents (`*_MAINNET`) are in [Smart Contracts → Deployed addresses](/architecture/contracts/#deployed-addresses). Optional: `NEXT_PUBLIC_SUBGRAPH_URL` / `SUBGRAPH_URL` to enable [subgraph-backed](/developers/subgraph/) listing and activity queries — omit them and the app reads the chain directly.

## Deploying your own contracts

Root `.env`:

```env
DEPLOYER_PRIVATE_KEY=0x...        # wallet with testnet BTC for gas
FEE_RECIPIENT=0x...               # receives protocol fees
ADMIN_ADDRESS=0x...               # receives all admin roles
PROTOCOL_FEE_BPS=200              # 200 = 2%
```

```bash
npx hardhat run scripts/deploy-testnet.ts --network mezotestnet
# mainnet: scripts/deploy-mainnet.ts --network mezomainnet
```

The script deploys all four core contracts in [the required order](/architecture/contracts/#deployment-wiring), wires the security topology (`setMarketplace`, fee governance, two-step router admin transfer), writes addresses to `deployments/`, and prints per-contract `npx hardhat verify` commands for the explorer.

:::caution
The deployment order is not cosmetic — steps 5–8 close real attack surface (payment-routing restriction and the 48-hour fee timelock). Use the script rather than deploying by hand; see [Security](/architecture/security/) for what each step enforces.
:::

## Repository map

| Path | Contents |
|---|---|
| `contracts/` | Solidity sources — core marketplace, bidding, swap router, adapters, admin |
| `frontend/` | Next.js app (vezo.exchange) |
| `subgraph/` | Goldsky subgraph — schema, mappings, deploy config |
| `dune/` | Queries behind the [public analytics dashboard](https://dune.com/vezo/vezo) |
| `docs-site/` | This documentation site (Astro Starlight) |
| `scripts/` | Deploy and verification scripts |
| `test/` | Contract test suites |
