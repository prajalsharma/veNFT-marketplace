import { 
  getConfig, 
  mezoMainnet, 
  mezoTestnet,
  PassportProvider
} from "@mezo-org/passport";
import { http } from "wagmi";

export { mezoMainnet, mezoTestnet, PassportProvider };

// WalletConnect Project ID is required for RainbowKit v2. 
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";

export const config = typeof window !== "undefined" ? getConfig({
  appName: "Vezo",
  walletConnectProjectId: projectId,
  // Keep testnet-first wallet defaults, but include both chains in wagmi.
  mezoNetwork: "testnet",
  chains: [mezoTestnet, mezoMainnet],
  transports: {
    [mezoTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_TESTNET || "https://rpc.test.mezo.org"),
    [mezoMainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET || "https://mainnet.mezo.public.validationcloud.io"),
  },
  ssr: false,
}) : null;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
