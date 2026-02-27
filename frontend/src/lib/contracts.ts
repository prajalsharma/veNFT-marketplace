// Mezo Network Contract Addresses

// Read from environment variables with fallbacks
const getEnvAddress = (key: string, fallback: string = ""): `0x${string}` => {
  const value = process.env[key] || fallback;
  return (value || "0x0000000000000000000000000000000000000000") as `0x${string}`;
};

export const CONTRACTS = {
  testnet: {
    chainId: 31611,
    rpcUrl: "https://rpc.test.mezo.org",
    explorer: "https://explorer.test.mezo.org",

    // Token addresses
    BTC: getEnvAddress("NEXT_PUBLIC_BTC_ADDRESS", "0x7b7c000000000000000000000000000000000000"),
    MEZO: getEnvAddress("NEXT_PUBLIC_MEZO_ADDRESS", "0x7B7c000000000000000000000000000000000001"),
    MUSD: getEnvAddress("NEXT_PUBLIC_MUSD_TESTNET", "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"),

    // veNFT addresses
    veBTC: getEnvAddress("NEXT_PUBLIC_VEBTC_TESTNET", "0x38E35d92E6Bfc6787272A62345856B13eA12130a"),
    veMEZO: getEnvAddress("NEXT_PUBLIC_VEMEZO_TESTNET", "0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b"),

    // Marketplace contracts (set via environment variables after deployment)
    marketplace: getEnvAddress("NEXT_PUBLIC_MARKETPLACE_TESTNET"),
    adapter: getEnvAddress("NEXT_PUBLIC_ADAPTER_TESTNET"),
    router: getEnvAddress("NEXT_PUBLIC_ROUTER_TESTNET"),
    admin: getEnvAddress("NEXT_PUBLIC_ADMIN_TESTNET"),
  },
  mainnet: {
    chainId: 31612,
    rpcUrl: "https://rpc.mezo.org",
    explorer: "https://explorer.mezo.org",

    // Token addresses
    BTC: getEnvAddress("NEXT_PUBLIC_BTC_ADDRESS", "0x7b7c000000000000000000000000000000000000"),
    MEZO: getEnvAddress("NEXT_PUBLIC_MEZO_ADDRESS", "0x7B7c000000000000000000000000000000000001"),
    MUSD: getEnvAddress("NEXT_PUBLIC_MUSD_MAINNET", "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186"),

    // veNFT addresses
    veBTC: getEnvAddress("NEXT_PUBLIC_VEBTC_MAINNET", "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279"),
    veMEZO: getEnvAddress("NEXT_PUBLIC_VEMEZO_MAINNET", "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122"),

    // Marketplace contracts (set via environment variables after deployment)
    marketplace: getEnvAddress("NEXT_PUBLIC_MARKETPLACE_MAINNET"),
    adapter: getEnvAddress("NEXT_PUBLIC_ADAPTER_MAINNET"),
    router: getEnvAddress("NEXT_PUBLIC_ROUTER_MAINNET"),
    admin: getEnvAddress("NEXT_PUBLIC_ADMIN_MAINNET"),
  },
} as const;

export type NetworkType = "testnet" | "mainnet";

export function getContracts(network: NetworkType) {
  return CONTRACTS[network];
}

// Check if marketplace is deployed
export function isMarketplaceDeployed(network: NetworkType): boolean {
  const contracts = getContracts(network);
  return (
    contracts.marketplace !== "0x0000000000000000000000000000000000000000"
  );
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
