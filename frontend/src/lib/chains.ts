import { defineChain } from "viem";

// Mezo Testnet - Chain ID 31611 (0x7B8B)
export const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Bitcoin",
    symbol: "BTC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.test.mezo.org"],
    },
    public: {
      http: ["https://rpc.test.mezo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mezo Explorer",
      url: "https://explorer.test.mezo.org",
      apiUrl: "https://explorer.test.mezo.org/api",
    },
  },
  testnet: true,
});

// Mezo Mainnet - Chain ID 31612 (0x7B8C)
export const mezoMainnet = defineChain({
  id: 31612,
  name: "Mezo",
  nativeCurrency: {
    decimals: 18,
    name: "Bitcoin",
    symbol: "BTC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mezo.org"],
    },
    public: {
      http: ["https://rpc.mezo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mezo Explorer",
      url: "https://explorer.mezo.org",
      apiUrl: "https://explorer.mezo.org/api",
    },
  },
  testnet: false,
});

// wallet_addEthereumChain parameters - must use lowercase hex
export const MEZO_TESTNET_PARAMS = {
  chainId: "0x7b8b", // 31611 in lowercase hex
  chainName: "Mezo Testnet",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.test.mezo.org"],
  blockExplorerUrls: ["https://explorer.test.mezo.org"],
};

export const MEZO_MAINNET_PARAMS = {
  chainId: "0x7b8c", // 31612 in lowercase hex
  chainName: "Mezo",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.mezo.org"],
  blockExplorerUrls: ["https://explorer.mezo.org"],
};

// Helper to get chain params by network type
export function getChainParams(network: "testnet" | "mainnet") {
  return network === "testnet" ? MEZO_TESTNET_PARAMS : MEZO_MAINNET_PARAMS;
}

// Helper to get chain by network type
export function getChain(network: "testnet" | "mainnet") {
  return network === "testnet" ? mezoTestnet : mezoMainnet;
}
