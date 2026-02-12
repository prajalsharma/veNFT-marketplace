import { http, createConfig, fallback } from "wagmi";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { mezoTestnet, mezoMainnet } from "./chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";

if (!projectId) {
  console.warn("WalletConnect Project ID not found. Please set NEXT_PUBLIC_WALLETCONNECT_ID");
}

const { connectors } = getDefaultWallets({
  appName: "Mezo veNFT Marketplace",
  projectId,
});

export const config = createConfig({
  chains: [mezoTestnet, mezoMainnet],
  connectors,
  transports: {
    [mezoTestnet.id]: fallback([
      http("https://rpc.test.mezo.org"),
      http("https://rpc.test.mezo.org"), // Fallback to same (no alternate RPC available)
    ]),
    [mezoMainnet.id]: fallback([
      http("https://rpc.mezo.org"),
      http("https://rpc.mezo.org"),
    ]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
