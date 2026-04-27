// Mezo Network Contract Addresses
//
// Token and veNFT addresses are fixed public contracts on Mezo, so they can
// safely fall back to known values. Deployment-specific marketplace addresses
// MUST come from environment variables so a new frontend never silently points
// at an older marketplace deployment.

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const getEnvAddress = (key: string, fallback: string): `0x${string}` => {
  const value = process.env[key] || fallback;
  return value as `0x${string}`;
};

const getDeploymentAddress = (key: string): `0x${string}` => {
  return (process.env[key] || ZERO_ADDRESS) as `0x${string}`;
};

export const CONTRACTS = {
  testnet: {
    chainId: 31611,
    rpcUrl: "https://rpc.test.mezo.org",
    explorer: "https://explorer.test.mezo.org",

    // Token addresses (fixed on Mezo network)
    BTC:  getEnvAddress("NEXT_PUBLIC_BTC_ADDRESS",  "0x7b7c000000000000000000000000000000000000"),
    MEZO: getEnvAddress("NEXT_PUBLIC_MEZO_ADDRESS", "0x7b7c000000000000000000000000000000000001"),
    MUSD: getEnvAddress("NEXT_PUBLIC_MUSD_TESTNET", "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"),

    // veNFT addresses
    veBTC:  getEnvAddress("NEXT_PUBLIC_VEBTC_TESTNET",  "0x38E35d92E6Bfc6787272A62345856B13eA12130a"),
    veMEZO: getEnvAddress("NEXT_PUBLIC_VEMEZO_TESTNET", "0xaCE816CA2bcc9b12C59799dcC5A959Fb9b98111b"),

    // Marketplace contracts — require explicit env so new deployments never
    // accidentally show stale activity from an older marketplace.
    marketplace: getDeploymentAddress("NEXT_PUBLIC_MARKETPLACE_TESTNET"),
    adapter:     getDeploymentAddress("NEXT_PUBLIC_ADAPTER_TESTNET"),
    router:      getDeploymentAddress("NEXT_PUBLIC_ROUTER_TESTNET"),
    admin:       getDeploymentAddress("NEXT_PUBLIC_ADMIN_TESTNET"),
  },
  mainnet: {
    chainId: 31612,
    rpcUrl: "https://rpc.mezo.org",
    explorer: "https://explorer.mezo.org",

    // Token addresses (fixed on Mezo network)
    BTC:  getEnvAddress("NEXT_PUBLIC_BTC_ADDRESS",  "0x7b7c000000000000000000000000000000000000"),
    MEZO: getEnvAddress("NEXT_PUBLIC_MEZO_ADDRESS", "0x7b7c000000000000000000000000000000000001"),
    MUSD: getEnvAddress("NEXT_PUBLIC_MUSD_MAINNET", "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186"),

    // veNFT addresses
    veBTC:  getEnvAddress("NEXT_PUBLIC_VEBTC_MAINNET",  "0x3D4b1b884A7a1E59fE8589a3296EC8f8cBB6f279"),
    veMEZO: getEnvAddress("NEXT_PUBLIC_VEMEZO_MAINNET", "0xb90fdAd3DFD180458D62Cc6acedc983D78E20122"),

    // Marketplace contracts — require explicit env so new deployments never
    // accidentally show stale activity from an older marketplace.
    marketplace: getDeploymentAddress("NEXT_PUBLIC_MARKETPLACE_MAINNET"),
    adapter:     getDeploymentAddress("NEXT_PUBLIC_ADAPTER_MAINNET"),
    router:      getDeploymentAddress("NEXT_PUBLIC_ROUTER_MAINNET"),
    admin:       getDeploymentAddress("NEXT_PUBLIC_ADMIN_MAINNET"),
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
    contracts.marketplace !== ZERO_ADDRESS
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
