import {
  mezoMainnet,
  mezoTestnet,
  PassportProvider,
  getDefaultWallets,
} from "@mezo-org/passport";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

export { mezoMainnet, mezoTestnet, PassportProvider };

// WalletConnect Project ID is required for RainbowKit v2.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "1d704aa13ff6d856e2935a85987c34ec";

// Build a wagmi config that registers BOTH Mezo chains (testnet + mainnet).
// This allows the network toggle in the Header to seamlessly switch between
// them without losing wallet connection. Wallets are seeded with the Bitcoin
// wallet set from Passport so Unisat/OKX/Xverse all work on both networks.
//
// Passport's getConfig() only supports a single chain; we call getDefaultConfig
// from RainbowKit directly so we can pass both chains with their transports.
export const config = typeof window !== "undefined" ? getDefaultConfig({
  appName: "Mezo veNFT Marketplace",
  projectId,
  // Register both chains so wagmi can route RPC calls to each
  chains: [mezoTestnet, mezoMainnet],
  transports: {
    [mezoTestnet.id]:  http("https://rpc.test.mezo.org"),
    [mezoMainnet.id]: http("https://rpc.mezo.org"),
  },
  // Include all Bitcoin and EVM wallets from Passport for both networks
  wallets: [
    ...getDefaultWallets("testnet"),
    ...getDefaultWallets("mainnet").map((group) => ({
      ...group,
      wallets: group.wallets.filter((w) => {
        // Deduplicate: only add mainnet-specific wallets not already listed
        const testnetNames = getDefaultWallets("testnet")
          .flatMap((g) => g.wallets)
          .map((x: any) => (typeof x === "function" ? x.name : ""));
        const name = typeof w === "function" ? (w as any).name ?? "" : "";
        return !testnetNames.includes(name);
      }),
    })),
  ],
  ssr: false,
}) : null;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
