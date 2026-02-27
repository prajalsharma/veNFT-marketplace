import { 
  getConfig, 
  mezoMainnet, 
  mezoTestnet,
  PassportProvider
} from "@mezo-org/passport";

export { mezoMainnet, mezoTestnet, PassportProvider };

// WalletConnect Project ID is required for RainbowKit v2. 
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "1d704aa13ff6d856e2935a85987c34ec";

export const config = typeof window !== "undefined" ? getConfig({
  appName: "Mezo veNFT Marketplace",
  walletConnectProjectId: projectId,
  mezoNetwork: "testnet",
  ssr: false,
}) : null;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
