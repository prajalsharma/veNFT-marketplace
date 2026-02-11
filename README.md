# Mezo veNFT Marketplace

A production-ready marketplace for trading vote-escrowed NFTs (veBTC and veMEZO) on the Mezo Network.

## Overview

This marketplace enables P2P trading of veNFTs with:
- **Multi-token payments**: Accept BTC, MEZO, or MUSD
- **Intrinsic value display**: See locked amount, voting power, and discount
- **Escrowless design**: Direct transfers, no escrow risk
- **Protocol fees**: Configurable 1% fee (max 5%)
- **Emergency controls**: Pause functionality for security

## Quick Start

### Prerequisites

- Node.js >= 18
- npm or pnpm
- A wallet with testnet BTC (get from [faucet](https://faucet.test.mezo.org/))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/mezo-venft-marketplace.git
cd mezo-venft-marketplace

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your deployer key
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test

# With coverage
npm run test:coverage
```

### Deploy to Testnet

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=your_private_key
export FEE_RECIPIENT=your_treasury_address
export ADMIN_ADDRESS=your_admin_address

# Deploy
npm run deploy:testnet
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

## Contract Addresses

### Mezo Testnet (Chain ID: 31611)

| Contract | Address |
|----------|---------|
| BTC (native) | `0x7b7c000000000000000000000000000000000000` |
| MEZO | `0x7b7c000000000000000000000000000000000001` |
| veBTC | `0x38E35d92E6Bfc6787272A62345856B13eA12130a` |
| veMEZO | `0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b` |
| MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |

### Mezo Mainnet (Chain ID: 31612)

| Contract | Address |
|----------|---------|
| BTC (native) | `0x7b7c000000000000000000000000000000000000` |
| MEZO | `0x7b7c000000000000000000000000000000000001` |
| veBTC | `0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279` |
| veMEZO | `0xb90fdAd3DFD180458D62Cc6acedc983D78E20122` |
| MUSD | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |

## Architecture

```
contracts/
├── core/
│   ├── VeNFTMarketplace.sol    # Main marketplace (list/buy/cancel)
│   ├── PaymentRouter.sol       # Multi-token payments + fees
│   └── MarketplaceAdmin.sol    # Pause, whitelist, fee governance
├── adapters/
│   └── MezoVeNFTAdapter.sol    # veNFT value queries
├── interfaces/
│   ├── IVotingEscrow.sol       # veBTC/veMEZO interface
│   ├── IPaymentRouter.sol
│   └── IMezoVeNFTAdapter.sol
└── mocks/
    ├── MockVotingEscrow.sol    # Testing
    └── MockERC20.sol           # Testing
```

## Environment Variables

```bash
# Required for deployment
DEPLOYER_PRIVATE_KEY=0x...      # Deployer wallet private key
FEE_RECIPIENT=0x...              # Protocol fee treasury
ADMIN_ADDRESS=0x...              # Admin multisig

# Optional
PROTOCOL_FEE_BPS=100             # Protocol fee (100 = 1%)
REPORT_GAS=true                  # Enable gas reporting
```

## Network Configuration

### Add Mezo Testnet to MetaMask

- Network Name: Mezo Testnet
- RPC URL: `https://rpc.test.mezo.org`
- Chain ID: `31611`
- Currency Symbol: BTC
- Explorer: `https://explorer.test.mezo.org`

### Add Mezo Mainnet to MetaMask

- Network Name: Mezo
- RPC URL: `https://rpc.mezo.org`
- Chain ID: `31612`
- Currency Symbol: BTC
- Explorer: `https://explorer.mezo.org`

## Fork Workflow

This marketplace is designed to be a minimal fork of audited marketplace contracts:

```bash
# 1. Fork upstream (e.g., OpenXSwap)
git remote add upstream https://github.com/OpenXSwap/nft-marketplace.git
git fetch upstream

# 2. Create tracking branch
git checkout -b upstream-sync upstream/main

# 3. Create feature branch
git checkout -b mezo-mainnet

# 4. Generate audit diff
git diff upstream-sync..mezo-mainnet > audit-diff.patch
```

## Resources

- **veBTC Documentation**: https://mezo.org/docs/users/mezo-earn/lock/vebtc
- **veMEZO Documentation**: https://mezo.org/docs/users/mezo-earn/lock/vemezo
- **Matchbox (Gauge Voting)**: https://matchbox.mallard.sh/docs
- **Mezo Developer Docs**: https://mezo.org/docs/developers/getting-started/
- **Mezo Passport (Wallet SDK)**: https://www.npmjs.com/package/@mezo-org/passport
- **Testnet Faucet**: https://faucet.test.mezo.org/
- **Block Explorer**: https://explorer.mezo.org

## Security

- All admin functions require role-based access control
- Fee changes have a 48-hour timelock
- Emergency pause available for critical situations
- Protocol fee capped at 5% maximum

## License

MIT
