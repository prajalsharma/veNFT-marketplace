// Mezo Network Contract Addresses

export const CONTRACTS = {
  testnet: {
    chainId: 31611,
    rpcUrl: "https://rpc.test.mezo.org",
    explorer: "https://explorer.test.mezo.org",

    // Token addresses
    BTC: "0x7b7c000000000000000000000000000000000000" as `0x${string}`,
    MEZO: "0x7b7c000000000000000000000000000000000001" as `0x${string}`,
    MUSD: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503" as `0x${string}`,

    // veNFT addresses
    veBTC: "0x38E35d92E6Bfc6787272A62345856B13eA12130a" as `0x${string}`,
    veMEZO: "0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b" as `0x${string}`,

    // Marketplace contracts (to be filled after deployment)
    marketplace: "" as `0x${string}`,
    adapter: "" as `0x${string}`,
    router: "" as `0x${string}`,
    admin: "" as `0x${string}`,
  },
  mainnet: {
    chainId: 31612,
    rpcUrl: "https://rpc.mezo.org",
    explorer: "https://explorer.mezo.org",

    // Token addresses
    BTC: "0x7b7c000000000000000000000000000000000000" as `0x${string}`,
    MEZO: "0x7b7c000000000000000000000000000000000001" as `0x${string}`,
    MUSD: "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186" as `0x${string}`,

    // veNFT addresses
    veBTC: "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279" as `0x${string}`,
    veMEZO: "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122" as `0x${string}`,

    // Marketplace contracts (to be filled after deployment)
    marketplace: "" as `0x${string}`,
    adapter: "" as `0x${string}`,
    router: "" as `0x${string}`,
    admin: "" as `0x${string}`,
  },
} as const;

export type NetworkType = "testnet" | "mainnet";

export function getContracts(network: NetworkType) {
  return CONTRACTS[network];
}

// Payment token options
export const PAYMENT_TOKENS = [
  { symbol: "BTC", name: "Bitcoin", decimals: 18, isNative: true },
  { symbol: "MEZO", name: "MEZO", decimals: 18, isNative: false },
  { symbol: "MUSD", name: "MUSD Stablecoin", decimals: 18, isNative: false },
] as const;

// Collection info
export const COLLECTIONS = {
  veBTC: {
    name: "veBTC",
    description: "Vote-escrowed BTC NFTs",
    maxLock: 28 * 24 * 60 * 60, // 28 days
    symbol: "veBTC",
  },
  veMEZO: {
    name: "veMEZO",
    description: "Vote-escrowed MEZO NFTs",
    maxLock: 1456 * 24 * 60 * 60, // 4 years
    symbol: "veMEZO",
  },
} as const;
