"use client";

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useNetwork } from "./useNetwork";

// ABI fragments for the contracts we need
const MARKETPLACE_ABI = [
  {
    name: "getListingCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getListing",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "seller", type: "address" },
          { name: "nftContract", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "paymentToken", type: "address" },
          { name: "active", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "createListing",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "paymentToken", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "buyListing",
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
    outputs: [{ type: "uint256" }],
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
  {
    name: "getLockEnd",
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
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
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

export function useMarketplace() {
  const { contracts } = useNetwork();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const marketplaceAddress = contracts.marketplace as `0x${string}` | undefined;
  const adapterAddress = contracts.adapter as `0x${string}` | undefined;

  // Get listing count
  const { data: listingCount, refetch: refetchCount } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "getListingCount",
    query: {
      enabled: !!marketplaceAddress,
    },
  });

  // Create a listing
  const createListing = async (
    nftContract: string,
    tokenId: bigint,
    price: bigint,
    paymentToken: string
  ) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "createListing",
      args: [nftContract as `0x${string}`, tokenId, price, paymentToken as `0x${string}`],
    });
  };

  // Buy a listing
  const buyListing = async (listingId: number, price: bigint, isNativePayment: boolean) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: "buyListing",
      args: [BigInt(listingId)],
      value: isNativePayment ? price : 0n,
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
  const approveNFT = async (nftContract: string, tokenId: bigint) => {
    if (!marketplaceAddress) throw new Error("Marketplace not deployed");

    writeContract({
      address: nftContract as `0x${string}`,
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

  return {
    marketplaceAddress,
    adapterAddress,
    listingCount: listingCount ? Number(listingCount) : 0,
    createListing,
    buyListing,
    cancelListing,
    approveNFT,
    approveToken,
    refetchCount,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// Hook to get a single listing with veNFT data
export function useListing(listingId: number) {
  const { contracts } = useNetwork();

  const marketplaceAddress = contracts.marketplace as `0x${string}` | undefined;
  const adapterAddress = contracts.adapter as `0x${string}` | undefined;

  const { data: listing, isLoading } = useReadContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "getListing",
    args: [BigInt(listingId)],
    query: {
      enabled: !!marketplaceAddress,
    },
  });

  const nftContract = listing?.[0] ? listing[0] : undefined;
  const tokenId = listing?.[2];

  // Get intrinsic value
  const { data: intrinsicValue } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getIntrinsicValue",
    args: nftContract && tokenId ? [nftContract as `0x${string}`, tokenId] : undefined,
    query: {
      enabled: !!adapterAddress && !!nftContract && tokenId !== undefined,
    },
  });

  // Get voting power
  const { data: votingPower } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getVotingPower",
    args: nftContract && tokenId ? [nftContract as `0x${string}`, tokenId] : undefined,
    query: {
      enabled: !!adapterAddress && !!nftContract && tokenId !== undefined,
    },
  });

  // Get lock end
  const { data: lockEnd } = useReadContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "getLockEnd",
    args: nftContract && tokenId ? [nftContract as `0x${string}`, tokenId] : undefined,
    query: {
      enabled: !!adapterAddress && !!nftContract && tokenId !== undefined,
    },
  });

  if (!listing) {
    return { listing: null, isLoading };
  }

  const price = listing[3];
  const iv = intrinsicValue || 0n;
  const discountBps = iv > 0n ? ((iv - price) * 10000n) / iv : 0n;

  const isVeBTC = nftContract?.toLowerCase() === contracts.veBTC.toLowerCase();

  const fullListing: Listing = {
    listingId,
    seller: listing[0],
    nftContract: listing[1],
    collection: isVeBTC ? "veBTC" : "veMEZO",
    tokenId: listing[2],
    price: listing[3],
    paymentToken: listing[4],
    active: listing[5],
    createdAt: listing[6],
    intrinsicValue: intrinsicValue || 0n,
    votingPower: votingPower || 0n,
    lockEnd: lockEnd || 0n,
    discountBps,
  };

  return { listing: fullListing, isLoading };
}

// Hook to get user's veNFTs
export function useUserVeNFTs() {
  const { address } = useAccount();
  const { contracts } = useNetwork();

  const veBTCAddress = contracts.veBTC as `0x${string}`;
  const veMEZOAddress = contracts.veMEZO as `0x${string}`;

  // Get veBTC balance
  const { data: veBTCBalance } = useReadContract({
    address: veBTCAddress,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get veMEZO balance
  const { data: veMEZOBalance } = useReadContract({
    address: veMEZOAddress,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    veBTCBalance: veBTCBalance ? Number(veBTCBalance) : 0,
    veMEZOBalance: veMEZOBalance ? Number(veMEZOBalance) : 0,
    totalVeNFTs: (veBTCBalance ? Number(veBTCBalance) : 0) + (veMEZOBalance ? Number(veMEZOBalance) : 0),
  };
}
