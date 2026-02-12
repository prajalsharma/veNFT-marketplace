import { http, createConfig } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { mezoTestnet, mezoMainnet } from "./chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, injectedWallet],
    },
  ],
  {
    appName: "Mezo veNFT Marketplace",
    projectId,
  }
);

export const config = createConfig({
  chains: [mezoTestnet, mezoMainnet],
  connectors,
  transports: {
    [mezoTestnet.id]: http("https://rpc.test.mezo.org"),
    [mezoMainnet.id]: http("https://rpc.mezo.org"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
