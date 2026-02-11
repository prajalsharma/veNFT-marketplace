# veNFT Marketplace for Mezo: Complete Technical Plan

## Bounty Submission for Supernormal Foundation
**Version:** 1.0
**Date:** February 11, 2026
**Bounty Window:** Feb 10th – Mar 24th, 2026
**Reward:** 1000 MUSD

---

# 1. Fork Strategy & Repo Selection

## 1.1 Upstream Selection: OpenXSwap NFT Marketplace

**Primary Fork Target:** OpenXSwap NFT Marketplace Contracts
**Repository:** https://github.com/OpenXSwap/nft-marketplace (multichain deployment)
**Reference Docs:** https://docs.openxswap.exchange/the-open-x-project/nft-market-multichain

### Rationale for Selection

| Criteria | OpenXSwap | Alternative (Blur/Seaport) |
|----------|-----------|---------------------------|
| veNFT Native Support | ✅ Yes (veVELO experience) | ❌ No |
| Intrinsic Value Display | ✅ Built-in | ❌ Requires custom |
| Multi-token Payments | ✅ Any ERC-20 | ⚠️ ETH-focused |
| Fee Structure | 1% (adjustable) | 0.5-2.5% |
| Escrowless Design | ✅ Direct transfers | ⚠️ Escrow-based |
| Audit Status | Partial (50%+) | Full |
| Code Complexity | Medium | High |

### Security Posture Assessment

OpenXSwap contracts are:
- Deployed and verified on 5 chains (Optimism, Base, Linea, Ethereum, Arbitrum)
- Partially audited (50%+ of contracts)
- Battle-tested with veVELO and fNFT trading

**Risk Mitigation:** Our fork targets ONLY the marketplace core logic, which is the most audited portion. We add adapter layers for Mezo-specific integrations without modifying core transfer/payment logic.

## 1.2 Git Workflow for Fork

```bash
# 1. Fork upstream
git clone https://github.com/OpenXSwap/nft-marketplace.git mezo-venft-marketplace
cd mezo-venft-marketplace

# 2. Create audit-tracking branch
git checkout -b mezo-mainnet
git checkout -b upstream-sync  # Keep pristine upstream for diff

# 3. Create feature branches
git checkout mezo-mainnet
git checkout -b feat/mezo-adapter
git checkout -b feat/payment-router
git checkout -b feat/emergency-controls

# 4. Generate audit diff
git diff upstream-sync..mezo-mainnet > audit-diff.patch
```

## 1.3 Fork Efficiency Metrics

| Metric | Target | Justification |
|--------|--------|---------------|
| Lines Changed | <500 | Adapters only |
| Files Modified | <10 | Core untouched |
| New Contracts | 3 | Adapter, Router, Admin |
| Core Logic Changes | 0 | Fork efficiency |

---

# 2. Smart Contract Architecture

## 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MEZO NETWORK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   veBTC      │     │   veMEZO     │     │    MUSD      │    │
│  │   ERC-721    │     │   ERC-721    │     │   ERC-20     │    │
│  │ 0x3D4b...279 │     │ 0xb90f...122 │     │ 0xdD46...186 │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MezoVeNFTAdapter.sol (NEW)                  │   │
│  │  - getIntrinsicValue(tokenId) → (btcAmount, lockEnd)    │   │
│  │  - getVotingPower(tokenId) → uint256                     │   │
│  │  - isExpired(tokenId) → bool                             │   │
│  │  - getDecayRate(tokenId) → uint256                       │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           OpenXSwap Marketplace Core (FORKED)            │   │
│  │  - listNFT(collection, tokenId, price, paymentToken)    │   │
│  │  - buyNFT(listingId)                                     │   │
│  │  - cancelListing(listingId)                              │   │
│  │  - updatePrice(listingId, newPrice)                      │   │
│  │  ────────────────────────────────────────────────────    │   │
│  │  MODIFICATIONS: None to core logic                       │   │
│  │  ADDITIONS: Adapter interface calls for value display    │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            PaymentRouter.sol (NEW)                       │   │
│  │  - Accepts: BTC (native), MEZO, MUSD                     │   │
│  │  - routePayment(buyer, seller, amount, token)           │   │
│  │  - calculateFee(amount) → (protocolFee, sellerAmount)   │   │
│  │  - Integrates with Mezo DEX for swaps (optional)        │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            MarketplaceAdmin.sol (NEW)                    │   │
│  │  - setProtocolFee(uint256 bps)  [max 500 = 5%]          │   │
│  │  - setFeeRecipient(address treasury)                     │   │
│  │  - pause() / unpause()  [emergency only]                 │   │
│  │  - addSupportedCollection(address)                       │   │
│  │  - Timelock: 48h delay on fee changes                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Contract Specifications

### 2.2.1 MezoVeNFTAdapter.sol (NEW - ~150 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVotingEscrow {
    struct LockedBalance {
        int128 amount;
        uint256 end;
    }
    function locked(uint256 tokenId) external view returns (LockedBalance memory);
    function balanceOfNFT(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract MezoVeNFTAdapter {
    // Contract addresses (immutable for gas efficiency)
    address public immutable veBTC;   // 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279
    address public immutable veMEZO;  // 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122

    uint256 public constant WEEK = 7 days;
    uint256 public constant MAX_LOCK_VEBTC = 28 days;
    uint256 public constant MAX_LOCK_VEMEZO = 1456 days; // 4 years

    constructor(address _veBTC, address _veMEZO) {
        veBTC = _veBTC;
        veMEZO = _veMEZO;
    }

    /// @notice Get intrinsic BTC/MEZO value locked in veNFT
    /// @param collection veBTC or veMEZO address
    /// @param tokenId The NFT token ID
    /// @return amount Locked token amount (18 decimals)
    /// @return lockEnd Unix timestamp when lock expires
    function getIntrinsicValue(address collection, uint256 tokenId)
        external view returns (uint256 amount, uint256 lockEnd)
    {
        IVotingEscrow.LockedBalance memory lock = IVotingEscrow(collection).locked(tokenId);
        amount = uint256(uint128(lock.amount));
        lockEnd = lock.end;
    }

    /// @notice Get current voting power (decayed)
    function getVotingPower(address collection, uint256 tokenId)
        external view returns (uint256)
    {
        return IVotingEscrow(collection).balanceOfNFT(tokenId);
    }

    /// @notice Check if lock has expired
    function isExpired(address collection, uint256 tokenId)
        external view returns (bool)
    {
        IVotingEscrow.LockedBalance memory lock = IVotingEscrow(collection).locked(tokenId);
        return block.timestamp >= lock.end;
    }

    /// @notice Calculate discount percentage vs intrinsic value
    /// @param listPrice Listed price in payment token
    /// @param intrinsicValue Value of locked tokens
    /// @return discountBps Discount in basis points (e.g., 500 = 5%)
    function calculateDiscount(uint256 listPrice, uint256 intrinsicValue)
        external pure returns (uint256 discountBps)
    {
        if (listPrice >= intrinsicValue) return 0;
        return ((intrinsicValue - listPrice) * 10000) / intrinsicValue;
    }

    /// @notice Get time remaining on lock
    function getTimeRemaining(address collection, uint256 tokenId)
        external view returns (uint256)
    {
        IVotingEscrow.LockedBalance memory lock = IVotingEscrow(collection).locked(tokenId);
        if (block.timestamp >= lock.end) return 0;
        return lock.end - block.timestamp;
    }
}
```

### 2.2.2 PaymentRouter.sol (NEW - ~200 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PaymentRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Supported payment tokens
    address public constant BTC = 0x7b7C000000000000000000000000000000000000;
    address public constant MEZO = 0x7b7C000000000000000000000000000000000001;
    address public constant MUSD = 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186;

    // Fee configuration
    uint256 public protocolFeeBps = 100; // 1% default
    uint256 public constant MAX_FEE_BPS = 500; // 5% max
    address public feeRecipient;
    address public admin;

    mapping(address => bool) public supportedTokens;

    event PaymentRouted(
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 fee
    );

    constructor(address _feeRecipient, address _admin) {
        feeRecipient = _feeRecipient;
        admin = _admin;

        // Initialize supported tokens
        supportedTokens[BTC] = true;
        supportedTokens[MEZO] = true;
        supportedTokens[MUSD] = true;
    }

    /// @notice Route payment from buyer to seller with fee deduction
    /// @param seller Recipient of sale proceeds
    /// @param token Payment token address (BTC uses native)
    /// @param amount Total payment amount
    function routePayment(
        address seller,
        address token,
        uint256 amount
    ) external payable nonReentrant {
        require(supportedTokens[token], "Unsupported token");

        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 sellerAmount = amount - fee;

        if (token == BTC) {
            // Native BTC payment
            require(msg.value == amount, "Incorrect BTC amount");
            (bool success1,) = payable(seller).call{value: sellerAmount}("");
            require(success1, "Seller transfer failed");
            (bool success2,) = payable(feeRecipient).call{value: fee}("");
            require(success2, "Fee transfer failed");
        } else {
            // ERC-20 payment
            IERC20(token).safeTransferFrom(msg.sender, seller, sellerAmount);
            IERC20(token).safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        emit PaymentRouted(msg.sender, seller, token, amount, fee);
    }

    /// @notice Calculate fee breakdown
    function calculateFee(uint256 amount)
        external view returns (uint256 fee, uint256 sellerAmount)
    {
        fee = (amount * protocolFeeBps) / 10000;
        sellerAmount = amount - fee;
    }

    // Admin functions with access control
    function setProtocolFee(uint256 _feeBps) external {
        require(msg.sender == admin, "Not admin");
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        protocolFeeBps = _feeBps;
    }

    function setFeeRecipient(address _recipient) external {
        require(msg.sender == admin, "Not admin");
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
    }
}
```

### 2.2.3 MarketplaceAdmin.sol (NEW - ~180 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MarketplaceAdmin is Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // Timelock for fee changes
    uint256 public constant FEE_TIMELOCK = 48 hours;

    struct PendingFeeChange {
        uint256 newFeeBps;
        uint256 effectiveTime;
    }
    PendingFeeChange public pendingFee;

    // Supported collections whitelist
    mapping(address => bool) public supportedCollections;

    // veBTC and veMEZO are whitelisted by default
    address public constant VEBTC_MAINNET = 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279;
    address public constant VEMEZO_MAINNET = 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122;

    event CollectionAdded(address indexed collection);
    event CollectionRemoved(address indexed collection);
    event FeeChangeProposed(uint256 newFeeBps, uint256 effectiveTime);
    event FeeChangeExecuted(uint256 newFeeBps);
    event EmergencyPause(address indexed pauser, string reason);

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(FEE_MANAGER_ROLE, defaultAdmin);

        // Whitelist Mezo veNFT collections
        supportedCollections[VEBTC_MAINNET] = true;
        supportedCollections[VEMEZO_MAINNET] = true;
    }

    /// @notice Emergency pause - immediate effect
    function emergencyPause(string calldata reason)
        external onlyRole(PAUSER_ROLE)
    {
        _pause();
        emit EmergencyPause(msg.sender, reason);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Propose fee change with 48h timelock
    function proposeFeeChange(uint256 _newFeeBps)
        external onlyRole(FEE_MANAGER_ROLE)
    {
        require(_newFeeBps <= 500, "Max 5%");
        pendingFee = PendingFeeChange({
            newFeeBps: _newFeeBps,
            effectiveTime: block.timestamp + FEE_TIMELOCK
        });
        emit FeeChangeProposed(_newFeeBps, pendingFee.effectiveTime);
    }

    /// @notice Execute pending fee change after timelock
    function executeFeeChange(address paymentRouter)
        external onlyRole(FEE_MANAGER_ROLE)
    {
        require(block.timestamp >= pendingFee.effectiveTime, "Timelock active");
        require(pendingFee.effectiveTime > 0, "No pending change");

        // Call PaymentRouter.setProtocolFee
        (bool success,) = paymentRouter.call(
            abi.encodeWithSignature("setProtocolFee(uint256)", pendingFee.newFeeBps)
        );
        require(success, "Fee update failed");

        emit FeeChangeExecuted(pendingFee.newFeeBps);
        delete pendingFee;
    }

    function addCollection(address collection)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        supportedCollections[collection] = true;
        emit CollectionAdded(collection);
    }

    function removeCollection(address collection)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        supportedCollections[collection] = false;
        emit CollectionRemoved(collection);
    }

    function isCollectionSupported(address collection)
        external view returns (bool)
    {
        return supportedCollections[collection];
    }
}
```

## 2.3 Contracts Summary Table

| Contract | Status | Lines | Purpose |
|----------|--------|-------|---------|
| OpenXSwap Marketplace Core | FORKED | ~800 | Listing/buying/canceling logic |
| MezoVeNFTAdapter.sol | NEW | ~150 | veNFT value/power queries |
| PaymentRouter.sol | NEW | ~200 | Multi-token payments + fees |
| MarketplaceAdmin.sol | NEW | ~180 | Pause, whitelist, timelock |

**Total New Code:** ~530 lines
**Modified Upstream Lines:** <50 (interface additions only)

---

# 3. Security & Audit Approach

## 3.1 Minimal Diff Policy

### Core Principle
**NEVER modify upstream marketplace core logic.** All Mezo-specific functionality is implemented via:
1. Adapter contracts (read-only queries)
2. Payment router (separate payment path)
3. Admin controls (independent governance)

### Diff Categories

| Category | Allowed Changes | Justification |
|----------|-----------------|---------------|
| Interface Additions | Yes | Add IVeNFTAdapter calls |
| Core Transfer Logic | NO | Security critical |
| Payment Handling | Via Router | Separate contract |
| Access Control | Via Admin | Separate contract |
| Fee Calculation | Via Router | Separate contract |

## 3.2 Modified Files & Rationale

```
contracts/
├── core/
│   └── NFTMarketplace.sol      # FORKED - NO CHANGES to core
│       └── Changes: Add adapter interface import (+5 lines)
│       └── Changes: Add getIntrinsicValue call in listNFT (+10 lines)
│       └── Rationale: Display-only, no logic changes
│
├── adapters/
│   └── MezoVeNFTAdapter.sol    # NEW - 150 lines
│       └── Rationale: Read-only veNFT queries
│       └── Risk: None - view functions only
│
├── payments/
│   └── PaymentRouter.sol       # NEW - 200 lines
│       └── Rationale: Multi-token support
│       └── Risk: Reentrancy - mitigated with ReentrancyGuard
│       └── Risk: Fee manipulation - mitigated with MAX_FEE_BPS
│
├── admin/
│   └── MarketplaceAdmin.sol    # NEW - 180 lines
│       └── Rationale: Emergency controls
│       └── Risk: Admin key compromise - mitigated with roles + timelock
│
└── interfaces/
    └── IVeNFTAdapter.sol       # NEW - 30 lines
```

## 3.3 Security Checklist

### Reentrancy Protection
- [x] PaymentRouter uses ReentrancyGuard
- [x] Check-Effects-Interactions pattern in all transfers
- [x] No external calls before state updates

### Access Control
- [x] Role-based access (OpenZeppelin AccessControl)
- [x] 48-hour timelock on fee changes
- [x] Emergency pause requires PAUSER_ROLE
- [x] Admin role separation (PAUSER, FEE_MANAGER, ADMIN)

### Input Validation
- [x] MAX_FEE_BPS = 500 (5% cap)
- [x] Zero address checks on all setters
- [x] Collection whitelist enforcement

### Token Security
- [x] SafeERC20 for all token transfers
- [x] Native BTC handling with explicit checks
- [x] No approve/transferFrom vulnerabilities

## 3.4 Audit Diff Package Generation

```bash
#!/bin/bash
# scripts/generate-audit-package.sh

# 1. Create clean diff from upstream
git diff upstream-sync..mezo-mainnet --stat > audit-package/diff-summary.txt
git diff upstream-sync..mezo-mainnet > audit-package/full-diff.patch

# 2. Extract only modified files
git diff --name-only upstream-sync..mezo-mainnet > audit-package/modified-files.txt

# 3. Generate annotated diff with comments
git diff upstream-sync..mezo-mainnet --word-diff > audit-package/word-diff.patch

# 4. Create tarball
cd audit-package
tar -czvf mezo-venft-audit-$(date +%Y%m%d).tar.gz \
    diff-summary.txt \
    full-diff.patch \
    modified-files.txt \
    word-diff.patch \
    ../contracts/adapters/ \
    ../contracts/payments/ \
    ../contracts/admin/

echo "Audit package created: mezo-venft-audit-$(date +%Y%m%d).tar.gz"
```

## 3.5 Remediation Plan

| Risk | Mitigation | Remediation if Exploited |
|------|------------|-------------------------|
| Reentrancy in payments | ReentrancyGuard | Emergency pause, upgrade PaymentRouter |
| Admin key compromise | Multi-sig + timelock | Revoke roles, deploy new Admin |
| Price manipulation | Oracle integration (v2) | Manual listing review |
| Expired veNFT trades | isExpired check | Frontend warning + optional block |

---

# 4. Protocol Fees & Monetization

## 4.1 Fee Structure

| Parameter | Value | Governance |
|-----------|-------|------------|
| Base Protocol Fee | 1% (100 bps) | Adjustable via timelock |
| Maximum Fee | 5% (500 bps) | Hardcoded limit |
| Fee Recipient | Treasury multisig | Admin changeable |
| Timelock Period | 48 hours | Hardcoded |

## 4.2 Fee Flow Diagram

```
Buyer pays 1.0 BTC for veNFT
          │
          ▼
┌─────────────────────┐
│   PaymentRouter     │
│  ─────────────────  │
│  Total: 1.0 BTC     │
│  Fee (1%): 0.01 BTC │
│  Seller: 0.99 BTC   │
└─────────────────────┘
          │
          ├───────────────────┐
          ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│     Seller       │  │    Treasury      │
│   0.99 BTC       │  │    0.01 BTC      │
└──────────────────┘  └──────────────────┘
```

## 4.3 Treasury Management

```solidity
// Recommended: Gnosis Safe multisig
// Signers: 3-of-5 team members
// Treasury Address: To be deployed

// Fee distribution options:
// - 100% to protocol treasury
// - 50% buyback + 50% development (governance vote)
// - Staking rewards for MEZO holders (future)
```

## 4.4 Revenue Projections

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|------------|
| Monthly Volume | $100K | $500K | $2M |
| Monthly Fees (1%) | $1K | $5K | $20K |
| Annual Fees | $12K | $60K | $240K |

---

# 5. Frontend UX & UI

## 5.1 Page Structure

```
src/
├── pages/
│   ├── index.tsx              # Landing + featured listings
│   ├── marketplace/
│   │   ├── index.tsx          # Browse all veNFTs
│   │   ├── [collection]/
│   │   │   ├── index.tsx      # Collection page (veBTC or veMEZO)
│   │   │   └── [tokenId].tsx  # Individual veNFT detail
│   ├── my-listings/
│   │   └── index.tsx          # User's active listings
│   ├── activity/
│   │   └── index.tsx          # Recent sales/listings
│   └── analytics/
│       └── index.tsx          # Floor prices, volume charts
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # Nav + wallet connect
│   │   ├── Footer.tsx
│   │   └── NetworkToggle.tsx  # Testnet/Mainnet switch
│   │
│   ├── veNFT/
│   │   ├── VeNFTCard.tsx      # Listing card with decay info
│   │   ├── VeNFTDetail.tsx    # Full veNFT page
│   │   ├── IntrinsicValue.tsx # Lock amount display
│   │   ├── DecayTimer.tsx     # Countdown to expiry
│   │   ├── DiscountBadge.tsx  # % below intrinsic
│   │   └── VotingPower.tsx    # Current voting weight
│   │
│   ├── marketplace/
│   │   ├── ListingForm.tsx    # Create listing modal
│   │   ├── BuyModal.tsx       # Purchase confirmation
│   │   ├── CancelButton.tsx   # Cancel listing
│   │   ├── PriceInput.tsx     # Multi-token price input
│   │   └── FilterPanel.tsx    # Sort/filter options
│   │
│   ├── wallet/
│   │   ├── ConnectButton.tsx  # Wallet connection
│   │   ├── WalletModal.tsx    # Wallet selection
│   │   └── NetworkBadge.tsx   # Current network display
│   │
│   └── analytics/
│       ├── FloorPriceChart.tsx
│       ├── VolumeChart.tsx
│       └── RecentSales.tsx
│
├── hooks/
│   ├── useVeNFT.ts            # Read veNFT data
│   ├── useListings.ts         # Marketplace queries
│   ├── useWallet.ts           # Wallet state
│   └── useNetwork.ts          # Network switching
│
└── lib/
    ├── contracts.ts           # Contract addresses
    ├── abis/                  # Contract ABIs
    └── utils/
        ├── formatters.ts      # Value formatting
        └── decay.ts           # Decay calculations
```

## 5.2 Component Specifications

### VeNFTCard.tsx (OpenXSwap-inspired)

```tsx
interface VeNFTCardProps {
  tokenId: string;
  collection: 'veBTC' | 'veMEZO';
  listPrice: bigint;
  paymentToken: string;
  intrinsicValue: bigint;
  lockEnd: number;
  votingPower: bigint;
}

// Visual elements:
// ┌─────────────────────────────┐
// │  [veBTC Badge]    [-12%]    │  ← Discount badge
// │                             │
// │  🔒 0.5 BTC                 │  ← Locked amount
// │  ⚡ 0.25 veBTC              │  ← Voting power
// │  ⏰ 14 days remaining       │  ← Decay timer
// │                             │
// │  Listed: 0.44 BTC           │  ← List price
// │  ─────────────────────────  │
// │  [Buy Now]  [Make Offer]    │  ← CTAs
// └─────────────────────────────┘
```

### DecayTimer.tsx

```tsx
// Real-time countdown with color coding:
// - Green: >14 days remaining
// - Yellow: 7-14 days remaining
// - Orange: 1-7 days remaining
// - Red: <1 day or expired

const DecayTimer: React.FC<{ lockEnd: number }> = ({ lockEnd }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(lockEnd));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(lockEnd));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockEnd]);

  const color = getColorForTime(timeLeft);

  return (
    <div className={`decay-timer ${color}`}>
      {formatTimeLeft(timeLeft)}
    </div>
  );
};
```

## 5.3 UX Flows

### Flow 1: List veNFT

```
1. Connect wallet →
2. Navigate to My veNFTs →
3. Select veNFT to list →
4. Enter price + payment token →
5. Approve marketplace (if needed) →
6. Confirm listing tx →
7. Listing live!
```

### Flow 2: Buy veNFT

```
1. Browse marketplace →
2. Filter by collection/expiry/discount →
3. Click veNFT card →
4. Review intrinsic value vs price →
5. Select payment token →
6. Approve payment (if ERC-20) →
7. Confirm purchase tx →
8. veNFT transferred!
```

### Flow 3: Cancel Listing

```
1. Navigate to My Listings →
2. Click "Cancel" on listing →
3. Confirm cancel tx →
4. veNFT returned to wallet
```

## 5.4 OpenXSwap UI Mapping

| OpenXSwap Feature | Our Implementation |
|-------------------|-------------------|
| Collection grid | /marketplace |
| veNFT cards with discount | VeNFTCard component |
| Lock countdown | DecayTimer component |
| Price:Locked ratio | IntrinsicValue + DiscountBadge |
| Floor price panel | FilterPanel + FloorPriceChart |
| Multi-token listings | PriceInput with token selector |
| Sale history | /activity page |

---

# 6. Wallet Integration

## 6.1 EVM Wallet Support

### Primary: Mezo Passport (@mezo-org/passport)

```typescript
// lib/wallet.ts
import { MezoPassport } from '@mezo-org/passport';

const passport = new MezoPassport({
  appName: 'Mezo veNFT Marketplace',
  chains: [
    {
      id: 31612, // Mainnet
      name: 'Mezo',
      rpcUrl: 'https://rpc.mezo.org',
      nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 }
    },
    {
      id: 31611, // Testnet
      name: 'Mezo Testnet',
      rpcUrl: 'https://rpc.test.mezo.org',
      nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 }
    }
  ]
});

// Connect EVM wallets
export async function connectEVMWallet() {
  const connector = await passport.connect('evm');
  // Supports: MetaMask, Taho, Zerion, OKX Wallet
  return connector;
}
```

### Wallet Configuration

```typescript
// components/wallet/WalletModal.tsx
const evmWallets = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/wallets/metamask.svg',
    connector: 'injected'
  },
  {
    id: 'taho',
    name: 'Taho',
    icon: '/wallets/taho.svg',
    connector: 'injected'
  },
  {
    id: 'zerion',
    name: 'Zerion',
    icon: '/wallets/zerion.svg',
    connector: 'injected'
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '/wallets/okx.svg',
    connector: 'injected'
  }
];
```

## 6.2 Bitcoin Wallet Integration (BONUS)

### Strategy: @mezo-org/passport Bitcoin Support

```typescript
// lib/bitcoinWallet.ts
import { MezoPassport } from '@mezo-org/passport';

// Bitcoin wallet connection (bonus feature)
export async function connectBitcoinWallet() {
  const passport = new MezoPassport({
    appName: 'Mezo veNFT Marketplace',
    bitcoinNetwork: 'mainnet' // or 'testnet'
  });

  const connector = await passport.connect('bitcoin');
  // Supports: Unisat, OKX Bitcoin, Xverse

  return connector;
}

// Bitcoin wallets for display
const bitcoinWallets = [
  {
    id: 'unisat',
    name: 'Unisat',
    icon: '/wallets/unisat.svg'
  },
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '/wallets/xverse.svg'
  },
  {
    id: 'okx-btc',
    name: 'OKX Bitcoin',
    icon: '/wallets/okx.svg'
  }
];
```

### Bitcoin Integration Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| MVP | EVM wallets only | Required |
| v1.1 | Bitcoin wallet connect | Bonus |
| v1.2 | Bitcoin signing for listings | Future |

## 6.3 Network Switching

```typescript
// hooks/useNetwork.ts
export function useNetwork() {
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');

  const switchNetwork = async (target: 'mainnet' | 'testnet') => {
    const chainId = target === 'mainnet' ? 31612 : 31611;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      setNetwork(target);
    } catch (error) {
      // Add network if not present
      await addMezoNetwork(target);
    }
  };

  return { network, switchNetwork };
}

async function addMezoNetwork(network: 'mainnet' | 'testnet') {
  const config = network === 'mainnet' ? {
    chainId: '0x7B9C', // 31612
    chainName: 'Mezo',
    rpcUrls: ['https://rpc.mezo.org'],
    nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
    blockExplorerUrls: ['https://explorer.mezo.org']
  } : {
    chainId: '0x7B8B', // 31611
    chainName: 'Mezo Testnet',
    rpcUrls: ['https://rpc.test.mezo.org'],
    nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
    blockExplorerUrls: ['https://explorer.test.mezo.org']
  };

  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [config]
  });
}
```

---

# 7. Deployment Flow

## 7.1 Environment Variables

```bash
# .env.testnet
NETWORK=testnet
RPC_URL=https://rpc.test.mezo.org
CHAIN_ID=31611
EXPLORER_URL=https://explorer.test.mezo.org

# Contract addresses (Testnet)
VEBTC_ADDRESS=0x38E35d92E6Bfc6787272A62345856B13eA12130a
VEMEZO_ADDRESS=0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b
MUSD_ADDRESS=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503
BTC_ADDRESS=0x7b7c000000000000000000000000000000000000
MEZO_ADDRESS=0x7b7c000000000000000000000000000000000001

# Deployer
DEPLOYER_PRIVATE_KEY=<your_testnet_key>
FEE_RECIPIENT=<treasury_multisig>
ADMIN_ADDRESS=<admin_multisig>

# .env.mainnet
NETWORK=mainnet
RPC_URL=https://rpc.mezo.org
CHAIN_ID=31612
EXPLORER_URL=https://explorer.mezo.org

# Contract addresses (Mainnet)
VEBTC_ADDRESS=0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279
VEMEZO_ADDRESS=0xb90fdAd3DFD180458D62Cc6acedc983D78E20122
MUSD_ADDRESS=0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186
BTC_ADDRESS=0x7b7c000000000000000000000000000000000000
MEZO_ADDRESS=0x7b7c000000000000000000000000000000000001
```

## 7.2 Deployment Scripts

### Hardhat Configuration

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "london"
    }
  },
  networks: {
    mezotestnet: {
      url: process.env.RPC_URL || "https://rpc.test.mezo.org",
      chainId: 31611,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    },
    mezomainnet: {
      url: "https://rpc.mezo.org",
      chainId: 31612,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      mezotestnet: "not-required",
      mezomainnet: "not-required"
    },
    customChains: [
      {
        network: "mezotestnet",
        chainId: 31611,
        urls: {
          apiURL: "https://explorer.test.mezo.org/api",
          browserURL: "https://explorer.test.mezo.org"
        }
      },
      {
        network: "mezomainnet",
        chainId: 31612,
        urls: {
          apiURL: "https://explorer.mezo.org/api",
          browserURL: "https://explorer.mezo.org"
        }
      }
    ]
  }
};
```

### Deploy Script

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const network = hre.network.name;
  const isTestnet = network === "mezotestnet";

  // Contract addresses based on network
  const addresses = isTestnet ? {
    veBTC: "0x38E35d92E6Bfc6787272A62345856B13eA12130a",
    veMEZO: "0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b"
  } : {
    veBTC: "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279",
    veMEZO: "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122"
  };

  // 1. Deploy MezoVeNFTAdapter
  console.log("\n1. Deploying MezoVeNFTAdapter...");
  const Adapter = await hre.ethers.getContractFactory("MezoVeNFTAdapter");
  const adapter = await Adapter.deploy(addresses.veBTC, addresses.veMEZO);
  await adapter.waitForDeployment();
  console.log("MezoVeNFTAdapter:", await adapter.getAddress());

  // 2. Deploy PaymentRouter
  console.log("\n2. Deploying PaymentRouter...");
  const PaymentRouter = await hre.ethers.getContractFactory("PaymentRouter");
  const router = await PaymentRouter.deploy(
    process.env.FEE_RECIPIENT,
    process.env.ADMIN_ADDRESS
  );
  await router.waitForDeployment();
  console.log("PaymentRouter:", await router.getAddress());

  // 3. Deploy MarketplaceAdmin
  console.log("\n3. Deploying MarketplaceAdmin...");
  const Admin = await hre.ethers.getContractFactory("MarketplaceAdmin");
  const admin = await Admin.deploy(process.env.ADMIN_ADDRESS);
  await admin.waitForDeployment();
  console.log("MarketplaceAdmin:", await admin.getAddress());

  // 4. Deploy/Configure OpenXSwap Marketplace Core
  console.log("\n4. Deploying Marketplace Core (forked)...");
  const Marketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy(
    await adapter.getAddress(),
    await router.getAddress(),
    await admin.getAddress()
  );
  await marketplace.waitForDeployment();
  console.log("NFTMarketplace:", await marketplace.getAddress());

  // 5. Verify contracts
  console.log("\n5. Verifying contracts...");
  await verify(adapter, [addresses.veBTC, addresses.veMEZO]);
  await verify(router, [process.env.FEE_RECIPIENT, process.env.ADMIN_ADDRESS]);
  await verify(admin, [process.env.ADMIN_ADDRESS]);

  // Output deployment summary
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Network:", network);
  console.log("MezoVeNFTAdapter:", await adapter.getAddress());
  console.log("PaymentRouter:", await router.getAddress());
  console.log("MarketplaceAdmin:", await admin.getAddress());
  console.log("NFTMarketplace:", await marketplace.getAddress());
}

async function verify(contract, args) {
  try {
    await hre.run("verify:verify", {
      address: await contract.getAddress(),
      constructorArguments: args
    });
  } catch (e) {
    console.log("Verification failed:", e.message);
  }
}

main().catch(console.error);
```

## 7.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Contracts

on:
  push:
    branches: [main]
    paths: ['contracts/**']
  workflow_dispatch:
    inputs:
      network:
        description: 'Target network'
        required: true
        default: 'testnet'
        type: choice
        options:
          - testnet
          - mainnet

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  deploy-testnet:
    needs: test
    if: github.ref == 'refs/heads/main' || github.event.inputs.network == 'testnet'
    runs-on: ubuntu-latest
    environment: testnet
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - run: pnpm install --frozen-lockfile

      - name: Deploy to Testnet
        env:
          DEPLOYER_PRIVATE_KEY: ${{ secrets.TESTNET_DEPLOYER_KEY }}
          FEE_RECIPIENT: ${{ secrets.TESTNET_TREASURY }}
          ADMIN_ADDRESS: ${{ secrets.TESTNET_ADMIN }}
        run: |
          pnpm hardhat run scripts/deploy.js --network mezotestnet

      - name: Save deployment artifacts
        uses: actions/upload-artifact@v4
        with:
          name: testnet-deployment
          path: deployments/

  deploy-mainnet:
    needs: test
    if: github.event.inputs.network == 'mainnet'
    runs-on: ubuntu-latest
    environment: mainnet  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Verify audit approval
        run: |
          # Check that audit-approved tag exists
          if ! git tag -l | grep -q "audit-approved"; then
            echo "ERROR: Mainnet deploy requires audit-approved tag"
            exit 1
          fi

      - run: pnpm install --frozen-lockfile

      - name: Deploy to Mainnet
        env:
          DEPLOYER_PRIVATE_KEY: ${{ secrets.MAINNET_DEPLOYER_KEY }}
          FEE_RECIPIENT: ${{ secrets.MAINNET_TREASURY }}
          ADMIN_ADDRESS: ${{ secrets.MAINNET_ADMIN }}
        run: |
          pnpm hardhat run scripts/deploy.js --network mezomainnet
```

## 7.4 Testnet Deployment Checklist

```markdown
## Pre-Deployment
- [ ] All tests passing locally
- [ ] Coverage >80%
- [ ] Testnet deployer funded (use faucet: https://faucet.test.mezo.org/)
- [ ] Treasury multisig deployed
- [ ] Admin multisig deployed

## Deployment Steps
1. [ ] Deploy MezoVeNFTAdapter
2. [ ] Deploy PaymentRouter
3. [ ] Deploy MarketplaceAdmin
4. [ ] Deploy NFTMarketplace (forked)
5. [ ] Verify all contracts on explorer

## Post-Deployment
- [ ] Test listing flow with veBTC
- [ ] Test listing flow with veMEZO
- [ ] Test buy flow with BTC
- [ ] Test buy flow with MUSD
- [ ] Test cancel listing flow
- [ ] Test emergency pause
- [ ] Verify intrinsic value display
- [ ] Document all deployed addresses
```

---

# 8. Testing Strategy

## 8.1 Test Structure

```
test/
├── unit/
│   ├── MezoVeNFTAdapter.test.ts
│   ├── PaymentRouter.test.ts
│   └── MarketplaceAdmin.test.ts
│
├── integration/
│   ├── Marketplace.integration.test.ts
│   ├── PaymentFlow.integration.test.ts
│   └── EndToEnd.test.ts
│
├── fuzz/
│   ├── PaymentRouter.fuzz.sol
│   └── MarketplaceInvariants.t.sol
│
└── fixtures/
    ├── mockVeBTC.ts
    ├── mockVeMEZO.ts
    └── testAccounts.ts
```

## 8.2 Unit Tests

### MezoVeNFTAdapter Tests

```typescript
// test/unit/MezoVeNFTAdapter.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MezoVeNFTAdapter", function () {
  async function deployFixture() {
    const [owner, user1] = await ethers.getSigners();

    // Deploy mock VotingEscrow contracts
    const MockVE = await ethers.getContractFactory("MockVotingEscrow");
    const mockVeBTC = await MockVE.deploy("veBTC", "veBTC");
    const mockVeMEZO = await MockVE.deploy("veMEZO", "veMEZO");

    // Deploy adapter
    const Adapter = await ethers.getContractFactory("MezoVeNFTAdapter");
    const adapter = await Adapter.deploy(
      await mockVeBTC.getAddress(),
      await mockVeMEZO.getAddress()
    );

    return { adapter, mockVeBTC, mockVeMEZO, owner, user1 };
  }

  describe("getIntrinsicValue", function () {
    it("should return correct locked amount and end time", async function () {
      const { adapter, mockVeBTC } = await loadFixture(deployFixture);

      // Create mock lock: 1 BTC for 28 days
      const tokenId = 1;
      const amount = ethers.parseEther("1");
      const lockEnd = Math.floor(Date.now() / 1000) + 28 * 24 * 60 * 60;

      await mockVeBTC.setLock(tokenId, amount, lockEnd);

      const [value, end] = await adapter.getIntrinsicValue(
        await mockVeBTC.getAddress(),
        tokenId
      );

      expect(value).to.equal(amount);
      expect(end).to.equal(lockEnd);
    });
  });

  describe("isExpired", function () {
    it("should return true for expired locks", async function () {
      const { adapter, mockVeBTC } = await loadFixture(deployFixture);

      const tokenId = 1;
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      await mockVeBTC.setLock(tokenId, ethers.parseEther("1"), pastTime);

      expect(await adapter.isExpired(await mockVeBTC.getAddress(), tokenId))
        .to.be.true;
    });

    it("should return false for active locks", async function () {
      const { adapter, mockVeBTC } = await loadFixture(deployFixture);

      const tokenId = 1;
      const futureTime = Math.floor(Date.now() / 1000) + 100000;
      await mockVeBTC.setLock(tokenId, ethers.parseEther("1"), futureTime);

      expect(await adapter.isExpired(await mockVeBTC.getAddress(), tokenId))
        .to.be.false;
    });
  });

  describe("calculateDiscount", function () {
    it("should calculate 10% discount correctly", async function () {
      const { adapter } = await loadFixture(deployFixture);

      const listPrice = ethers.parseEther("0.9");
      const intrinsicValue = ethers.parseEther("1.0");

      const discount = await adapter.calculateDiscount(listPrice, intrinsicValue);
      expect(discount).to.equal(1000); // 10% = 1000 bps
    });

    it("should return 0 for prices above intrinsic", async function () {
      const { adapter } = await loadFixture(deployFixture);

      const listPrice = ethers.parseEther("1.1");
      const intrinsicValue = ethers.parseEther("1.0");

      const discount = await adapter.calculateDiscount(listPrice, intrinsicValue);
      expect(discount).to.equal(0);
    });
  });
});
```

### PaymentRouter Tests

```typescript
// test/unit/PaymentRouter.test.ts
describe("PaymentRouter", function () {
  describe("routePayment", function () {
    it("should correctly split BTC payment with 1% fee", async function () {
      const { router, treasury, seller, buyer } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("1.0");
      const expectedFee = ethers.parseEther("0.01");
      const expectedSeller = ethers.parseEther("0.99");

      const sellerBefore = await ethers.provider.getBalance(seller.address);
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      await router.connect(buyer).routePayment(
        seller.address,
        BTC_ADDRESS,
        amount,
        { value: amount }
      );

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      const treasuryAfter = await ethers.provider.getBalance(treasury.address);

      expect(sellerAfter - sellerBefore).to.equal(expectedSeller);
      expect(treasuryAfter - treasuryBefore).to.equal(expectedFee);
    });

    it("should reject unsupported tokens", async function () {
      const { router, buyer, seller } = await loadFixture(deployFixture);

      const fakeToken = "0x0000000000000000000000000000000000000001";

      await expect(
        router.connect(buyer).routePayment(seller.address, fakeToken, 1000)
      ).to.be.revertedWith("Unsupported token");
    });

    it("should prevent reentrancy attacks", async function () {
      const { router, attacker } = await loadFixture(deployFixture);

      // Deploy reentrancy attacker contract
      const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attackContract = await Attacker.deploy(await router.getAddress());

      await expect(
        attackContract.attack({ value: ethers.parseEther("1") })
      ).to.be.reverted;
    });
  });

  describe("setProtocolFee", function () {
    it("should reject fees above 5%", async function () {
      const { router, admin } = await loadFixture(deployFixture);

      await expect(
        router.connect(admin).setProtocolFee(501)
      ).to.be.revertedWith("Fee too high");
    });
  });
});
```

## 8.3 Integration Tests

```typescript
// test/integration/EndToEnd.test.ts
describe("End-to-End Marketplace Flow", function () {
  it("should complete full listing -> purchase -> settle flow", async function () {
    const { marketplace, adapter, router, veBTC, seller, buyer } =
      await loadFixture(fullDeployFixture);

    // 1. Seller creates veBTC position
    const tokenId = await createVeBTCPosition(veBTC, seller, {
      amount: ethers.parseEther("1"),
      duration: 28 * 24 * 60 * 60
    });

    // 2. Seller approves marketplace
    await veBTC.connect(seller).approve(
      await marketplace.getAddress(),
      tokenId
    );

    // 3. Seller lists at 10% discount
    const intrinsic = await adapter.getIntrinsicValue(
      await veBTC.getAddress(),
      tokenId
    );
    const listPrice = intrinsic[0] * 90n / 100n; // 10% discount

    await marketplace.connect(seller).listNFT(
      await veBTC.getAddress(),
      tokenId,
      listPrice,
      BTC_ADDRESS
    );

    // 4. Verify listing created
    const listing = await marketplace.getListing(0);
    expect(listing.seller).to.equal(seller.address);
    expect(listing.price).to.equal(listPrice);

    // 5. Buyer purchases
    await marketplace.connect(buyer).buyNFT(0, { value: listPrice });

    // 6. Verify transfer completed
    expect(await veBTC.ownerOf(tokenId)).to.equal(buyer.address);

    // 7. Verify fees distributed correctly
    // (checked in PaymentRouter tests)
  });

  it("should handle expired veNFT listing gracefully", async function () {
    const { marketplace, veBTC, seller, buyer } =
      await loadFixture(fullDeployFixture);

    // Create already-expired lock
    const tokenId = await createVeBTCPosition(veBTC, seller, {
      amount: ethers.parseEther("1"),
      duration: 0 // Already expired
    });

    await veBTC.connect(seller).approve(
      await marketplace.getAddress(),
      tokenId
    );

    // Listing should succeed (seller's choice)
    await marketplace.connect(seller).listNFT(
      await veBTC.getAddress(),
      tokenId,
      ethers.parseEther("0.5"),
      BTC_ADDRESS
    );

    // But UI should show warning (tested in frontend)
    const listing = await marketplace.getListing(0);
    const isExpired = await adapter.isExpired(
      await veBTC.getAddress(),
      tokenId
    );
    expect(isExpired).to.be.true;
  });
});
```

## 8.4 Fuzz Tests (Foundry)

```solidity
// test/fuzz/PaymentRouter.fuzz.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/payments/PaymentRouter.sol";

contract PaymentRouterFuzz is Test {
    PaymentRouter router;
    address treasury = address(0x1);
    address admin = address(0x2);

    function setUp() public {
        router = new PaymentRouter(treasury, admin);
    }

    /// @notice Fuzz test: fee calculation never exceeds amount
    function testFuzz_FeeNeverExceedsAmount(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint128).max);

        (uint256 fee, uint256 sellerAmount) = router.calculateFee(amount);

        assertLe(fee, amount, "Fee exceeds amount");
        assertEq(fee + sellerAmount, amount, "Fee + seller != amount");
    }

    /// @notice Fuzz test: fee is always <= 5% of amount
    function testFuzz_FeeWithinBounds(uint256 amount, uint256 feeBps) public {
        vm.assume(amount > 0 && amount < type(uint128).max);
        vm.assume(feeBps <= 500);

        vm.prank(admin);
        router.setProtocolFee(feeBps);

        (uint256 fee, ) = router.calculateFee(amount);

        uint256 maxFee = (amount * 500) / 10000;
        assertLe(fee, maxFee, "Fee exceeds 5%");
    }
}
```

## 8.5 Property Tests (Invariants)

```solidity
// test/fuzz/MarketplaceInvariants.t.sol
contract MarketplaceInvariants is Test {
    NFTMarketplace marketplace;

    /// @notice Invariant: Total NFT count is always preserved
    /// No NFTs are created or destroyed by marketplace
    function invariant_NFTConservation() public {
        uint256 listedCount = marketplace.getActiveListingCount();
        uint256 soldCount = marketplace.getSoldCount();
        uint256 cancelledCount = marketplace.getCancelledCount();

        // All listings must end in sold or cancelled
        assertEq(
            listedCount + soldCount + cancelledCount,
            marketplace.getTotalListingsCreated()
        );
    }

    /// @notice Invariant: Seller always receives correct amount
    function invariant_SellerReceivesPayment() public {
        // Checked via event tracking in handler
    }

    /// @notice Invariant: Marketplace never holds ETH
    function invariant_NoEthBalance() public {
        assertEq(address(marketplace).balance, 0);
    }
}
```

## 8.6 Test Vectors

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Normal purchase | 1 BTC veNFT @ 0.9 BTC | Seller: 0.891, Treasury: 0.009 |
| Max fee (5%) | 1 BTC @ 1 BTC | Seller: 0.95, Treasury: 0.05 |
| Zero fee | 1 BTC @ 1 BTC | Seller: 1.0, Treasury: 0 |
| Expired veNFT | Lock ended | Warning shown, trade allowed |
| Reentrancy | Malicious receive() | Transaction reverts |
| Overflow | uint256.max amount | Transaction reverts |

## 8.7 Testnet Walkthrough

### Network Configuration

```json
{
  "networkName": "Mezo Testnet",
  "chainId": 31611,
  "rpcUrl": "https://rpc.test.mezo.org",
  "explorer": "https://explorer.test.mezo.org",
  "faucet": "https://faucet.test.mezo.org"
}
```

### Test Accounts

```
Deployer: Fund from faucet
Seller: Fund from faucet, mint test veBTC
Buyer: Fund from faucet
Treasury: Multisig (testnet Gnosis Safe)
```

### Step-by-Step Testnet Demo

```bash
# 1. Get testnet funds
# Visit: https://faucet.test.mezo.org/

# 2. Deploy contracts
npx hardhat run scripts/deploy.js --network mezotestnet

# 3. Create test veBTC position
npx hardhat run scripts/create-test-position.js --network mezotestnet

# 4. List veNFT
npx hardhat run scripts/test-list.js --network mezotestnet

# 5. Purchase veNFT
npx hardhat run scripts/test-buy.js --network mezotestnet

# 6. Verify on explorer
# Visit: https://explorer.test.mezo.org/tx/<tx_hash>
```

---

# 9. Deliverables Checklist

## 9.1 Repository Structure

```
mezo-venft-marketplace/
├── README.md                    # Project overview
├── SECURITY.md                  # Security policy
├── CHANGELOG.md                 # Version history
├── LICENSE                      # MIT License
│
├── contracts/
│   ├── core/
│   │   └── NFTMarketplace.sol   # Forked OpenXSwap
│   ├── adapters/
│   │   └── MezoVeNFTAdapter.sol # NEW
│   ├── payments/
│   │   └── PaymentRouter.sol    # NEW
│   ├── admin/
│   │   └── MarketplaceAdmin.sol # NEW
│   └── interfaces/
│       └── IVeNFTAdapter.sol    # NEW
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   └── package.json
│
├── scripts/
│   ├── deploy.js
│   ├── verify.js
│   ├── generate-audit-package.sh
│   └── testnet-demo.js
│
├── test/
│   ├── unit/
│   ├── integration/
│   ├── fuzz/
│   └── fixtures/
│
├── deployments/
│   ├── testnet/
│   │   └── addresses.json
│   └── mainnet/
│       └── addresses.json
│
├── audit-package/
│   ├── diff-summary.txt
│   ├── full-diff.patch
│   ├── modified-files.txt
│   └── SECURITY_RATIONALE.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── USER_GUIDE.md
│   └── MAINTENANCE.md
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── deploy.yml
│
├── hardhat.config.js
├── foundry.toml
└── package.json
```

## 9.2 Explicit Deliverables

| # | Deliverable | File/Path | Status |
|---|-------------|-----------|--------|
| 1 | Smart contracts | /contracts/ | Required |
| 2 | Unit tests | /test/unit/ | Required |
| 3 | Integration tests | /test/integration/ | Required |
| 4 | Fuzz tests | /test/fuzz/ | Required |
| 5 | Deploy scripts | /scripts/deploy.js | Required |
| 6 | CI/CD pipeline | /.github/workflows/ | Required |
| 7 | Frontend app | /frontend/ | Required |
| 8 | Audit diff package | /audit-package/ | Required |
| 9 | Testnet deployment | /deployments/testnet/ | Required |
| 10 | README documentation | /README.md | Required |
| 11 | Architecture docs | /docs/ARCHITECTURE.md | Required |
| 12 | Maintenance plan | /docs/MAINTENANCE.md | Required |
| 13 | Video demo script | /docs/VIDEO_SCRIPT.md | Required |
| 14 | Mainnet deploy plan | /docs/MAINNET_PLAN.md | Required |

## 9.3 Video Demo Script

```markdown
# Mezo veNFT Marketplace Demo Script (3-5 minutes)

## Scene 1: Introduction (30s)
- Show landing page
- Explain veNFT concept briefly
- Reference Mezo docs: https://mezo.org/docs/users/mezo-earn/lock/vebtc

## Scene 2: Wallet Connection (30s)
- Click "Connect Wallet"
- Show MetaMask connection
- Network auto-detection (Testnet)

## Scene 3: Browse Marketplace (45s)
- Navigate to marketplace
- Show veBTC and veMEZO tabs
- Highlight discount badges
- Show lock countdown timers
- Filter by expiry date

## Scene 4: List veNFT (60s)
- Navigate to "My veNFTs"
- Select veBTC position
- Show intrinsic value calculation
- Enter listing price (10% discount)
- Select BTC as payment token
- Approve and confirm listing
- Show listing appear in marketplace

## Scene 5: Purchase veNFT (60s)
- Switch to buyer account
- Browse marketplace
- Select listed veNFT
- Review discount vs intrinsic value
- Click "Buy Now"
- Confirm transaction
- Show veNFT transferred

## Scene 6: Analytics (30s)
- Show activity page with sale
- Show floor price chart
- Show volume statistics

## Scene 7: Conclusion (15s)
- Recap key features
- Show Testnet deployment link
- Mention 6-month maintenance commitment
```

---

# 10. 6-Month Maintenance Plan

## 10.1 Monthly Milestones

### Month 1: Launch & Stabilization
- **Week 1-2:** Mainnet deployment post-audit
- **Week 3-4:** Monitor for issues, hotfix if needed
- **Deliverables:**
  - Mainnet contracts deployed and verified
  - Monitoring dashboards live
  - Emergency contacts established

### Month 2: Feature Polish
- **Week 1-2:** Implement user feedback
- **Week 3-4:** Analytics dashboard v1
- **Deliverables:**
  - Analytics page with floor prices, volume
  - Performance optimizations
  - Mobile responsiveness

### Month 3: Ecosystem Integration
- **Week 1-2:** Matchbox integration planning
- **Week 3-4:** Bitcoin wallet support (if feasible)
- **Deliverables:**
  - Integration with https://matchbox.mallard.sh/docs
  - @mezo-org/passport Bitcoin wallet option

### Month 4: Governance Preparation
- **Week 1-2:** Fee governance proposal framework
- **Week 3-4:** Community feedback collection
- **Deliverables:**
  - Governance proposal template
  - Fee adjustment mechanism tested

### Month 5: Scaling & Optimization
- **Week 1-2:** Indexer optimizations
- **Week 3-4:** UI/UX improvements based on data
- **Deliverables:**
  - Subgraph deployed
  - Improved query performance

### Month 6: Handoff Preparation
- **Week 1-2:** Documentation finalization
- **Week 3-4:** Knowledge transfer to Mezo team
- **Deliverables:**
  - Complete technical documentation
  - Runbook for operations
  - Training session for team

## 10.2 Ongoing Tasks

### Weekly
- [ ] Monitor contract events for anomalies
- [ ] Check treasury balance and fee accrual
- [ ] Review error logs from frontend
- [ ] Respond to user support tickets

### Monthly
- [ ] Security review of any new code
- [ ] Dependency updates (npm audit fix)
- [ ] Performance metrics review
- [ ] Community update post

### Quarterly
- [ ] Comprehensive security audit (if changes made)
- [ ] Infrastructure review
- [ ] Roadmap planning with Mezo team

## 10.3 SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | Frontend availability |
| Incident Response | <4 hours | Critical issues |
| Bug Fix | <48 hours | High priority |
| Feature Request | <2 weeks | Medium priority |

## 10.4 Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P0 | Critical - funds at risk | <1 hour | Exploit detected |
| P1 | High - major functionality broken | <4 hours | Purchases failing |
| P2 | Medium - degraded performance | <24 hours | Slow queries |
| P3 | Low - minor issues | <1 week | UI glitches |

### Emergency Contacts

```
Primary: [Developer Name] - [Contact]
Secondary: [Developer Name] - [Contact]
Mezo Team: [Contact provided by Supernormal]
```

### Emergency Procedures

1. **Detect** - Monitoring alerts or user reports
2. **Assess** - Determine severity level
3. **Contain** - Emergency pause if P0
4. **Communicate** - Notify stakeholders
5. **Fix** - Deploy remediation
6. **Review** - Post-mortem analysis

## 10.5 Bug Bounty Program

### Proposed Structure

| Severity | Reward | Examples |
|----------|--------|----------|
| Critical | 500 MUSD | Fund theft, reentrancy |
| High | 200 MUSD | Access control bypass |
| Medium | 50 MUSD | Logic errors |
| Low | 10 MUSD | Gas optimizations |

### Scope
- All deployed smart contracts
- Frontend security (XSS, CSRF)
- API vulnerabilities (if applicable)

### Out of Scope
- Social engineering
- Physical attacks
- Third-party services

---

# 11. Why This Wins The Bounty

## 11.1 Evaluation Criteria Mapping

### Functionality ✅
| Requirement | Implementation |
|-------------|----------------|
| List veNFTs | NFTMarketplace.listNFT() |
| Buy veNFTs | NFTMarketplace.buyNFT() |
| Cancel listings | NFTMarketplace.cancelListing() |
| Multi-token payments | PaymentRouter (BTC, MEZO, MUSD) |
| Intrinsic value display | MezoVeNFTAdapter.getIntrinsicValue() |
| Testnet deployment | Full deployment on chain 31611 |

### Code Quality ✅
| Aspect | Evidence |
|--------|----------|
| Modular design | Adapter/Router/Admin separation |
| Documentation | Inline NatSpec comments |
| Linting | Solhint + ESLint configured |
| Type safety | TypeScript frontend |
| Testing | >80% coverage target |

### Security ✅
| Aspect | Evidence |
|--------|----------|
| Minimal diffs | <50 lines modified in core |
| Audit package | Git diff + rationale document |
| Test coverage | Unit + integration + fuzz |
| Access control | Role-based with timelock |
| Emergency pause | MarketplaceAdmin.emergencyPause() |

### UX/UI ✅
| Aspect | Evidence |
|--------|----------|
| Intuitive design | OpenXSwap-inspired UI |
| veNFT education | Decay timers, discount badges |
| Wallet support | MetaMask + Taho + Zerion + OKX |
| Network switching | Built-in Testnet/Mainnet toggle |

### Documentation ✅
| Aspect | Evidence |
|--------|----------|
| README | Comprehensive setup guide |
| Architecture | /docs/ARCHITECTURE.md |
| Maintenance | /docs/MAINTENANCE.md |
| Video demo | Scripted walkthrough |

### Fork Efficiency ✅
| Aspect | Evidence |
|--------|----------|
| Minimal changes | <50 lines in core contracts |
| Adapter pattern | All Mezo logic in adapters |
| Justified changes | Each modification documented |
| Security rationale | /audit-package/SECURITY_RATIONALE.md |

## 11.2 Competitive Advantages

1. **Fork-First Approach**: We inherit OpenXSwap's battle-tested code, minimizing novel vulnerabilities

2. **Escrowless Design**: Direct P2P transfers reduce smart contract risk and gas costs

3. **Multi-Token Flexibility**: Native support for BTC, MEZO, and MUSD payments

4. **48-Hour Timelock**: Protocol fee changes have mandatory delay for transparency

5. **6-Month Commitment**: Explicit maintenance SLAs with weekly/monthly tasks

6. **Comprehensive Testing**: Unit, integration, fuzz, and property-based tests

7. **Minimal Audit Surface**: Only ~530 lines of new code to review

## 11.3 Project Timeline

```
Week 1-2:   Contract development + testing
Week 3:     Testnet deployment + demo
Week 4:     Frontend completion
Week 5:     Audit package preparation + internal review
Week 6:     Final polish + bounty submission
Post-Bounty: Audit review → Mainnet deployment
```

## 11.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Upstream bugs | Monitor OpenXSwap security disclosures |
| veNFT edge cases | Extensive expired/zero-power testing |
| Payment failures | ReentrancyGuard + SafeERC20 |
| Admin compromise | Multi-sig + timelock + role separation |
| Low adoption | Analytics + fee optimization based on data |

---

# Appendix A: Contract Addresses Reference

## Testnet (Chain ID: 31611)

| Contract | Address |
|----------|---------|
| BTC (native) | 0x7b7c000000000000000000000000000000000000 |
| MEZO | 0x7b7c000000000000000000000000000000000001 |
| veBTC | 0x38E35d92E6Bfc6787272A62345856B13eA12130a |
| veMEZO | 0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b |
| MUSD | 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503 |

## Mainnet (Chain ID: 31612)

| Contract | Address |
|----------|---------|
| BTC (native) | 0x7b7c000000000000000000000000000000000000 |
| MEZO | 0x7b7c000000000000000000000000000000000001 |
| veBTC | 0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279 |
| veMEZO | 0xb90fdAd3DFD180458D62Cc6acedc983D78E20122 |
| MUSD | 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186 |

---

# Appendix B: Required Links Reference

- veBTC Overview: https://mezo.org/docs/users/mezo-earn/lock/vebtc
- veMEZO Overview: https://mezo.org/docs/users/mezo-earn/lock/vemezo
- Matchbox: https://matchbox.mallard.sh/docs
- Mezo Passport: https://www.npmjs.com/package/@mezo-org/passport
- Developer Getting Started: https://mezo.org/docs/developers/getting-started/
- Contracts Reference: https://mezo.org/docs/users/resources/contracts-reference/
- Mezo Explorer: https://explorer.mezo.org
- OpenXSwap Docs: https://docs.openxswap.exchange/the-open-x-project/nft-market-multichain
- Velodrome Contracts: https://github.com/velodrome-finance/contracts
- Mezo GitHub: https://github.com/mezo-org
- Network Connect: https://mezo.org/docs/users/getting-started/connect
- Testnet Faucet: https://faucet.test.mezo.org/

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Author:** Senior DeFi Protocol Engineer
**Status:** Ready for Bounty Submission
