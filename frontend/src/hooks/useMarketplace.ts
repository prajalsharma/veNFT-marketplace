"use client";

import { useReadContract, useReadContracts, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useNetwork } from "./useNetwork";

// ─── Marketplace ABI ──────────────────────────────────────────────────────────

const MARKETPLACE_ABI = [
  {
    name: "nextListingId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "listings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "collection", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "paymentToken", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "listNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collection", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "paymentToken", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "buyNFT",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelListing",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getUserListings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
] as const;

// ─── Adapter ABI ──────────────────────────────────────────────────────────────
// getVotingPower is intentionally omitted — it calls balanceOfNFT which does not
// exist on the deployed veBTC/veMEZO contracts (Velodrome v2 fork).
// Voting power is computed in the frontend from locked() data instead.

const ADAPTER_ABI = [
  {
    name: "getIntrinsicValue",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "collection", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "lockEnd", type: "uint256" },
    ],
  },
] as const;

// ─── ERC-721 ABI ──────────────────────────────────────────────────────────────

const ERC721_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getApproved",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    // Standard ERC-721 balanceOf — returns token count for an address
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── VotingEscrow enumeration ABI ─────────────────────────────────────────────
// The deployed veBTC/veMEZO contracts are Velodrome v2 forks.
// They do NOT have tokensOfOwner(address). Instead they expose:
//   balanceOf(address)                    → token count
//   ownerToNFTokenIdList(address,uint256) → tokenId at index

const VOTING_ESCROW_ENUM_ABI = [
  {
    // Returns number of NFTs owned by address (ERC-721 standard)
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    // Returns tokenId at index i for owner (Velodrome v2 enumeration)
    name: "ownerToNFTokenIdList",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── ERC-20 ABI ───────────────────────────────────────────────────────────────

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── Voting power computation ─────────────────────────────────────────────────
// Derived from locked() data returned by getIntrinsicValue.
// Velodrome v2: VP = amount * (end - now) / MAXTIME  (for timed locks)
//               VP = amount                           (for permanent locks, end=0)
// veBTC MAXTIME = 28 days, veMEZO MAXTIME = 4 years (1456 days)

const VEBTC_MAXTIME  = BigInt(28 * 24 * 60 * 60);   // 28 days in seconds
const VEMEZO_MAXTIME = BigInt(1456 * 24 * 60 * 60);  // 4 years in seconds

export function computeVotingPower(
  amount: bigint,
  lockEnd: bigint,
  isVeBTC: boolean
): bigint {
  if (amount === 0n) return 0n;
  // Permanent lock (end=0): full voting power equals locked amount
  if (lockEnd === 0n) return amount;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (lockEnd <= now) return 0n; // expired
  const remaining = lockEnd - now;
  const maxTime = isVeBTC ? VEBTC_MAXTIME : VEMEZO_MAXTIME;
  // Cap at maxTime to avoid > 100% for locks longer than max
  const capped = remaining > maxTime ? maxTime : remaining;
  return (amount * capped) / maxTime;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Listing {
  listingId: number;
  seller: string;
  nftContract: string;
  collection: "veBTC" | "veMEZO";
  tokenId: bigint;
  price: bigint;
  paymentToken: string;
  active: boolean;
  createdAt: bigint;
  intrinsicValue: bigint;
  votingPower: bigint;
  lockEnd: bigint;
  discountBps: bigint;
}

interface ListingTuple {
  seller: `0x${string}`;
  collection: `0x${string}`;
  tokenId: bigint;
  price: bigint;
  paymentToken: `0x${string}`;
  createdAt: bigint;
  active: boolean;
}

export interface WalletVeNFT {
  tokenId: bigint;
  collection: "veBTC" | "veMEZO";
  nftContract: string;
  intrinsicValue: bigint;
  votingPower: bigint;
  lockEnd: bigint;
}

// ─── useMarketplace ───────────────────────────────────────────────────────────

export function useMarketplace() {
  const { contracts } = useNetwork();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const ZERO = "0x0000000000000000000000000000000000000000";
  const marketplaceAddress = contracts.marketplace as `0x${string}`;
  const adapterAddress = contracts.adapter as `0x${string}`;
  const isMarketplaceReady = !!marketplaceAddress && marketplaceAddress !== ZERO;

  const assertNonZeroAddress = (value: string, label: string) => {
    if (!value || value.toLowerCase() === ZERO.toLowerCase()) {
      throw new Error(`${label} not configured`);
    }
  };

  const { data: nextListingId, refetch: refetchCount } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "nextListingId",
    query: {
      enabled: isMarketplaceReady,
    },
  });

  const createListing = async (
    collection: string,
    tokenId: bigint,
    price: bigint,
    paymentToken: string
  ) => {
    if (!isMarketplaceReady) throw new Error("Marketplace not deployed");
    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "listNFT",
      args: [collection as `0x${string}`, tokenId, price, paymentToken as `0x${string}`],
    });
  };

  // Buy with native BTC (single tx, attach msg.value)
  const buyListing = async (listingId: number, price: bigint, isNativePayment: boolean) => {
    if (!isMarketplaceReady) throw new Error("Marketplace not deployed");
    if (listingId < 0) throw new Error("Invalid listing id");
    if (price <= 0n) throw new Error("Invalid listing price");
    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "buyNFT",
      args: [BigInt(listingId)],
      value: isNativePayment ? price : undefined,
    });
  };

  // Step 1 of ERC-20 buy: approve the PaymentRouter to spend the token
  const approveTokenForBuy = async (tokenAddress: string, amount: bigint) => {
    const routerAddress = contracts.router as `0x${string}`;
    assertNonZeroAddress(routerAddress, "Router");
    assertNonZeroAddress(tokenAddress, "Payment token");
    if (amount <= 0n) throw new Error("Invalid approval amount");
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [routerAddress, amount],
    });
  };

  // Step 2 of ERC-20 buy: call buyNFT after approval is confirmed
  const executeBuy = async (listingId: number) => {
    if (!isMarketplaceReady) throw new Error("Marketplace not deployed");
    if (listingId < 0) throw new Error("Invalid listing id");
    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "buyNFT",
      args: [BigInt(listingId)],
    });
  };

  const cancelListing = async (listingId: number) => {
    if (!isMarketplaceReady) throw new Error("Marketplace not deployed");
    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(listingId)],
    });
  };

  const approveNFT = async (collection: string, tokenId: bigint) => {
    if (!isMarketplaceReady) throw new Error("Marketplace not deployed");
    writeContract({
      address: collection as `0x${string}`,
      abi: ERC721_ABI,
      functionName: "approve",
      args: [marketplaceAddress, tokenId],
    });
  };

  const approveToken = async (tokenAddress: string, amount: bigint) => {
    const routerAddress = contracts.router as `0x${string}`;
    if (!routerAddress || routerAddress === "0x0000000000000000000000000000000000000000")
      throw new Error("Router not deployed");
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [routerAddress, amount],
    });
  };

  const { data: userListingIds, refetch: refetchUserListings } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: address ? [address] : undefined,
    query: {
      enabled: isMarketplaceReady && !!address,
    },
  });

  return {
    marketplaceAddress,
    adapterAddress,
    nextListingId: nextListingId ? Number(nextListingId) : 0,
    userListingIds: userListingIds as bigint[] | undefined,
    createListing,
    buyListing,
    approveTokenForBuy,
    executeBuy,
    cancelListing,
    approveNFT,
    approveToken,
    refetchCount,
    refetchUserListings,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  };
}

// ─── useListing ───────────────────────────────────────────────────────────────

export function useListing(listingId: number) {
  const { contracts } = useNetwork();

  const ZERO = "0x0000000000000000000000000000000000000000";
  const marketplaceAddress = contracts.marketplace as `0x${string}`;
  const adapterAddress = contracts.adapter as `0x${string}`;
  const isMarketplaceReady = !!marketplaceAddress && marketplaceAddress !== ZERO;
  const isAdapterReady = !!adapterAddress && adapterAddress !== ZERO;

  const { data: listingData, isLoading } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "listings",
    args: [BigInt(listingId)],
    query: {
      enabled: isMarketplaceReady,
    },
  });

  const listingArray = listingData as any[] | undefined;
  const listing: ListingTuple | undefined = listingArray
    ? {
        seller: listingArray[0],
        collection: listingArray[1],
        tokenId: listingArray[2],
        price: listingArray[3],
        paymentToken: listingArray[4],
        createdAt: listingArray[5],
        active: listingArray[6],
      }
    : undefined;

  const collection = listing?.collection;
  const tokenId = listing?.tokenId;

  // getIntrinsicValue returns (amount, lockEnd) — works correctly on deployed contracts
  const { data: adapterData } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getIntrinsicValue",
    args: collection && tokenId !== undefined ? [collection, tokenId] : undefined,
    query: {
      enabled: isAdapterReady && !!collection && tokenId !== undefined,
    },
  });

  const [intrinsicValue, lockEnd] = (adapterData as [bigint, bigint] | undefined) ?? [0n, 0n];

  if (!listing) return { listing: null, isLoading };

  const price = listing.price;
  const iv = intrinsicValue ?? 0n;
  const discountBps = iv > 0n ? ((iv - price) * 10000n) / iv : 0n;
  const isVeBTC = collection?.toLowerCase() === contracts.veBTC.toLowerCase();

  // Compute voting power from locked() data — avoids calling balanceOfNFT which
  // does not exist on the deployed Velodrome v2 veBTC/veMEZO contracts
  const votingPower = computeVotingPower(iv, lockEnd, isVeBTC ?? true);

  const fullListing: Listing = {
    listingId,
    seller: listing.seller,
    nftContract: listing.collection,
    collection: isVeBTC ? "veBTC" : "veMEZO",
    tokenId: listing.tokenId,
    price: listing.price,
    paymentToken: listing.paymentToken,
    active: listing.active,
    createdAt: listing.createdAt,
    intrinsicValue: iv,
    votingPower,
    lockEnd,
    discountBps,
  };

  return { listing: fullListing, isLoading };
}

// ─── useUserVeNFTs ────────────────────────────────────────────────────────────
// Enumerates the connected wallet's veBTC and veMEZO positions.
//
// The deployed contracts are Velodrome v2 forks and do NOT have tokensOfOwner().
// Enumeration uses: balanceOf(address) → count, then ownerToNFTokenIdList(address,i)
// for each index. We cap at 50 tokens per collection to bound multicall size.

const MAX_TOKENS_PER_COLLECTION = 50;

export function useUserVeNFTs() {
  const { address } = useAccount();
  const { contracts } = useNetwork();

  const ZERO = "0x0000000000000000000000000000000000000000";
  const veBTCAddress   = contracts.veBTC   as `0x${string}`;
  const veMEZOAddress  = contracts.veMEZO  as `0x${string}`;
  const adapterAddress = contracts.adapter as `0x${string}`;
  const isAdapterDeployed = !!adapterAddress && adapterAddress !== ZERO;

  // Step 1: get token counts via ERC-721 balanceOf
  const { data: veBTCCount, isLoading: veBTCCountLoading } = useReadContract({
    address: veBTCAddress,
    abi: VOTING_ESCROW_ENUM_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: veMEZOCount, isLoading: veMEZOCountLoading } = useReadContract({
    address: veMEZOAddress,
    abi: VOTING_ESCROW_ENUM_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const veBTCCountNum  = Math.min(Number(veBTCCount  ?? 0n), MAX_TOKENS_PER_COLLECTION);
  const veMEZOCountNum = Math.min(Number(veMEZOCount ?? 0n), MAX_TOKENS_PER_COLLECTION);

  // Step 2: fetch each tokenId via ownerToNFTokenIdList(address, index)
  const enumCalls = [
    ...Array.from({ length: veBTCCountNum }, (_, i) => ({
      address: veBTCAddress,
      abi: VOTING_ESCROW_ENUM_ABI,
      functionName: "ownerToNFTokenIdList" as const,
      args: [address!, BigInt(i)] as const,
    })),
    ...Array.from({ length: veMEZOCountNum }, (_, i) => ({
      address: veMEZOAddress,
      abi: VOTING_ESCROW_ENUM_ABI,
      functionName: "ownerToNFTokenIdList" as const,
      args: [address!, BigInt(i)] as const,
    })),
  ];

  const { data: enumResults, isLoading: enumLoading } = useReadContracts({
    contracts: enumCalls,
    query: { enabled: !!address && (veBTCCountNum + veMEZOCountNum) > 0 },
  });

  // Build token pairs from enumeration results
  const tokenPairs: { collection: "veBTC" | "veMEZO"; nftContract: `0x${string}`; tokenId: bigint }[] = [];

  if (enumResults) {
    for (let i = 0; i < veBTCCountNum; i++) {
      const tid = enumResults[i]?.result as bigint | undefined;
      if (tid != null && tid > 0n) {
        tokenPairs.push({ collection: "veBTC", nftContract: veBTCAddress, tokenId: tid });
      }
    }
    for (let i = 0; i < veMEZOCountNum; i++) {
      const tid = enumResults[veBTCCountNum + i]?.result as bigint | undefined;
      if (tid != null && tid > 0n) {
        tokenPairs.push({ collection: "veMEZO", nftContract: veMEZOAddress, tokenId: tid });
      }
    }
  }

  // Step 3: fetch intrinsicValue + lockEnd for each token via adapter.getIntrinsicValue
  // (getVotingPower is intentionally skipped — it reverts on deployed contracts)
  const intrinsicCalls = tokenPairs.map((pair) => ({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getIntrinsicValue" as const,
    args: [pair.nftContract, pair.tokenId] as const,
  }));

  const { data: intrinsicResults, isLoading: intrinsicLoading } = useReadContracts({
    contracts: intrinsicCalls,
    query: { enabled: isAdapterDeployed && tokenPairs.length > 0 },
  });

  const isLoading = veBTCCountLoading || veMEZOCountLoading || enumLoading || intrinsicLoading;

  const veNFTs: WalletVeNFT[] = tokenPairs.map((pair, i) => {
    const raw = intrinsicResults?.[i]?.result as [bigint, bigint] | undefined;
    const [intrinsicValue, lockEnd] = raw ?? [0n, 0n];
    const isVeBTC = pair.collection === "veBTC";
    const votingPower = computeVotingPower(intrinsicValue, lockEnd, isVeBTC);

    return {
      tokenId: pair.tokenId,
      collection: pair.collection,
      nftContract: pair.nftContract,
      intrinsicValue,
      votingPower,
      lockEnd,
    };
  });

  return {
    veNFTs,
    isLoading,
    veBTCCount: veBTCCountNum,
    veMEZOCount: veMEZOCountNum,
    totalVeNFTs: tokenPairs.length,
  };
}
