# Mezo veNFT Marketplace

[![Built on Mezo](https://img.shields.io/badge/Network-Mezo-orange.svg)](https://mezo.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Audit Ready](https://img.shields.io/badge/Security-Audit--Ready-success.svg)](#security)

A high-performance, escrowless P2P marketplace for trading vote-escrowed NFTs (veBTC and veMEZO) on the Mezo Network.

## 🌟 Overview

The Mezo veNFT Marketplace provides a secondary liquidity layer for locked Bitcoin and MEZO governance positions. It enables users to trade locked assets (veNFTs) with real-time intrinsic value calculation and voting power analysis.

### Core Features
- **Escrowless Design**: Assets remain in the user's wallet until the atomic swap.
- **Intrinsic Value Engine**: Real-time calculation of underlying locked value and voting power.
- **Multi-Token Support**: Native BTC, MEZO, and MUSD payments.
- **Institutional Governance**: Role-based access control with timelocked fee management.
- **Optimized UI**: High-fidelity React dashboard with advanced market metrics.

## 🏗️ Architecture

The system is composed of four primary smart contract modules, specifically adapted for Mezo's dual-token system:

| Module | Purpose | Source |
| :--- | :--- | :--- |
| **`VeNFTMarketplace`** | Core listing and trading logic for veBTC and veMEZO | [View Source](./contracts/core/VeNFTMarketplace.sol) |
| **`MezoVeNFTAdapter`** | Technical abstraction for Mezo's linear decay and 4-year lock metrics | [View Source](./contracts/adapters/MezoVeNFTAdapter.sol) |
| **`PaymentRouter`** | Handles BTC, MEZO, and MUSD distribution with protocol fees | [View Source](./contracts/core/PaymentRouter.sol) |
| **`MarketplaceAdmin`** | Governance, emergency pausing, and fee timelocks | [View Source](./contracts/core/MarketplaceAdmin.sol) |

## 💰 Monetization & Fees

The marketplace implements a sustainable business model through a configurable protocol fee:
- **Base Fee**: 1.00% (default)
- **Max Fee**: 5.00% (hardcapped in `PaymentRouter.sol`)
- **Governance**: 48-hour timelock on all fee adjustments via `MarketplaceAdmin.sol`.

## 🌐 Network Configuration

### Mezo Testnet
- **Network Name**: Mezo Testnet
- **Chain ID**: `31611`
- **RPC URL**: `https://rpc.test.mezo.org`
- **Native Token**: BTC (`0x7b7c000000000000000000000000000000000000`)
- **Governance Token**: MEZO (`0x7b7c000000000000000000000000000000000001`)
- **veBTC (NFT)**: `0x38E35d92E6Bfc6787272A62345856B13eA12130a`
- **veMEZO (NFT)**: `0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b`
- **MUSD**: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **Explorer**: [explorer.test.mezo.org](https://explorer.test.mezo.org)

### Mezo Mainnet
- **Network Name**: Mezo Mainnet
- **Chain ID**: `31612`
- **RPC URL**: `https://rpc.mezo.org`
- **Native Token**: BTC (`0x7b7c000000000000000000000000000000000000`)
- **Governance Token**: MEZO (`0x7b7c000000000000000000000000000000000001`)
- **veBTC (NFT)**: `0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279`
- **veMEZO (NFT)**: `0xb90fdAd3DFD180458D62Cc6acedc983D78E20122`
- **MUSD**: `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186`
- **Explorer**: [explorer.mezo.org](https://explorer.mezo.org)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- npm / bun
- A wallet with Mezo Testnet BTC ([Faucet](https://faucet.test.mezo.org/))

### Installation & Development
```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Configure environment (see .env.example)
cp .env.example .env

# Run local development environment (Node + Frontend)
npm run dev
```

### Deployment Configuration
For Vercel or other frontend deployments, ensure the following environment variable is set:
- `NEXT_PUBLIC_WALLETCONNECT_ID`: Your WalletConnect Cloud Project ID ([Get one here](https://cloud.walletconnect.com/))

## 💼 Deliverables & Compliance

This submission meets all requirements specified in the Mezo Bounty:

- [x] **GitHub Repo**: Full source code included.
- [x] **Live Testnet**: Deployment scripts and instructions provided.
- [x] **Maintenance Plan**: [See MAINTENANCE.md](./MAINTENANCE.md) for 6-month commitment.
- [x] **Wallet Integration**: Full support for Mezo Passport (Unisat, OKX, Xverse).
- [x] **Security**: Forked from audited code with documented modifications.

## 🔐 Security & Audit Diff

As required by the bounty, we provide a clear record of modifications from the base audited marketplace (OpenXSwap pattern):

1. **Adapter Pattern**: Introduced `MezoVeNFTAdapter` to handle Mezo's specific linear decay and lock calculation without modifying core marketplace logic.
2. **Payment Router**: Added support for native BTC as gas and payment, ensuring 100% compatibility with Mezo's native BTC bridging.
3. **Role Segregation**: Enhanced `MarketplaceAdmin` to separate Pauser and Collection Manager roles for better operational security.

### How to View Diff
To view modifications against the reference implementation:
```bash
# Compare with reference patterns (Internal documentation)
# All modifications are documented in /contracts/core and /contracts/adapters
```

## 🛠️ Maintenance Commitment
We are committed to the Mezo ecosystem for the long term. A detailed 6-month support plan is available in [MAINTENANCE.md](./MAINTENANCE.md).
