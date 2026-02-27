"use client";

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useNetwork } from "./useNetwork";

// ABI fragments for the contracts we need
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
        { name: "value", type: "uint256" },
        { name: "lockEnd", type: "uint256" }
    ],
  },
  {
    name: "getVotingPower",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "collection", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

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
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

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

// Type for the listing tuple returned by the contract
interface ListingTuple {
  seller: `0x${string}`;
  collection: `0x${string}`;
  tokenId: bigint;
  price: bigint;
  paymentToken: `0x${string}`;
  createdAt: bigint;
  active: boolean;
}

export function useMarketplace() {
  const { contracts } = useNetwork();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const marketplaceAddress = contracts.marketplace as `0x${string}` | undefined;
  const adapterAddress = contracts.adapter as `0x${string}` | undefined;

  // Get listing count
  const { data: nextListingId, refetch: refetchCount } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "nextListingId",
    query: {
      enabled: !!marketplaceAddress && marketplaceAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Create a listing
  const createListing = async (
    collection: string,
    tokenId: bigint,
    price: bigint,
    paymentToken: string
  ) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "listNFT",
      args: [collection as `0x${string}`, tokenId, price, paymentToken as `0x${string}`],
    });
  };

  // Buy a listing
  const buyListing = async (listingId: number, price: bigint, isNativePayment: boolean) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "buyNFT",
      args: [BigInt(listingId)],
      value: isNativePayment ? price : BigInt(0),
    });
  };

  // Cancel a listing
  const cancelListing = async (listingId: number) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(listingId)],
    });
  };

  // Approve NFT for marketplace
  const approveNFT = async (collection: string, tokenId: bigint) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: collection as `0x${string}`,
      abi: ERC721_ABI,
      functionName: "approve",
      args: [marketplaceAddress, tokenId],
    });
  };

  // Approve ERC20 for router
  const approveToken = async (tokenAddress: string, amount: bigint) => {
    const routerAddress = contracts.router as `0x${string}`;
    if (!routerAddress) throw new Error("Router not deployed");

    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [routerAddress, amount],
    });
  };

  // Get user's listing IDs
  const { data: userListingIds, refetch: refetchUserListings } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: address ? [address] : undefined,
    query: {
      enabled: !!marketplaceAddress && !!address,
    },
  });

  return {
    marketplaceAddress,
    adapterAddress,
    nextListingId: nextListingId ? Number(nextListingId) : 0,
    userListingIds: userListingIds as bigint[] | undefined,
    createListing,
    buyListing,
    cancelListing,
    approveNFT,
    approveToken,
    refetchCount,
    refetchUserListings,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error
  };
}

// Hook to get a single listing with veNFT data
export function useListing(listingId: number) {
  const { contracts } = useNetwork();

  const marketplaceAddress = contracts.marketplace as `0x${string}` | undefined;
  const adapterAddress = contracts.adapter as `0x${string}` | undefined;

  const { data: listingData, isLoading } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "listings",
    args: [BigInt(listingId)],
    query: {
      enabled: !!marketplaceAddress && marketplaceAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Cast the listing data to our expected type
  const listingArray = listingData as any[] | undefined;
  
  const listing: ListingTuple | undefined = listingArray ? {
    seller: listingArray[0],
    collection: listingArray[1],
    tokenId: listingArray[2],
    price: listingArray[3],
    paymentToken: listingArray[4],
    createdAt: listingArray[5],
    active: listingArray[6],
  } : undefined;

  const collection = listing?.collection;
  const tokenId = listing?.tokenId;

  // Get intrinsic value and lock end
  const { data: adapterData } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getIntrinsicValue",
    args: collection && tokenId !== undefined ? [collection, tokenId] : undefined,
    query: {
      enabled: !!adapterAddress && !!collection && tokenId !== undefined,
    },
  });

  const [intrinsicValue, lockEnd] = (adapterData as [bigint, bigint] | undefined) || [BigInt(0), BigInt(0)];

  // Get voting power
  const { data: votingPower } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getVotingPower",
    args: collection && tokenId !== undefined ? [collection, tokenId] : undefined,
    query: {
      enabled: !!adapterAddress && !!collection && tokenId !== undefined,
    },
  });

  if (!listing) {
    return { listing: null, isLoading };
  }

  const price = listing.price;
  const iv = intrinsicValue || BigInt(0);
  const discountBps = iv > BigInt(0) ? ((iv - price) * BigInt(10000)) / iv : BigInt(0);

  const isVeBTC = collection?.toLowerCase() === contracts.veBTC.toLowerCase();

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
    votingPower: (votingPower as bigint) || BigInt(0),
    lockEnd: lockEnd,
    discountBps,
  };

  return { listing: fullListing, isLoading };
}

// Hook to get user's veNFTs from their wallet (unlisted)
export function useUserVeNFTs() {
  const { address } = useAccount();
  const { contracts } = useNetwork();
  
  const veBTCAddress = contracts.veBTC as `0x${string}`;
  const veMEZOAddress = contracts.veMEZO as `0x${string}`;

  const { data: veBTCBalance } = useReadContract({
    address: veBTCAddress,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: veMEZOBalance } = useReadContract({
    address: veMEZOAddress,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    veBTCBalance: veBTCBalance ? Number(veBTCBalance) : 0,
    veMEZOBalance: veMEZOBalance ? Number(veMEZOBalance) : 0,
    totalVeNFTs: (veBTCBalance ? Number(veBTCBalance) : 0) + (veMEZOBalance ? Number(veMEZOBalance) : 0),
  };
}
