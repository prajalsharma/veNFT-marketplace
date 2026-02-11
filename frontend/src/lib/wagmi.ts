import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mezoTestnet, mezoMainnet } from "./chains";

export const config = getDefaultConfig({
  appName: "Mezo veNFT Marketplace",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "demo-project-id",
  chains: [mezoTestnet, mezoMainnet],
  ssr: true,
});
