import {
  getDefaultWallets,
  mezoMainnet as _mezoMainnet,
  mezoTestnet as _mezoTestnet,
  PassportProvider
} from "@mezo-org/passport";
import { createConfig, http } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";

// Multicall3 is deployed at the canonical address on both Mezo networks.
// @mezo-org/orangekit doesn't include it in the chain definition, so wagmi
// falls back to 173 individual RPC calls for listings instead of 1 batched
// multicall. Adding it here restores batching and fixes listings not loading.
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

const mezoMainnet = {
  ..._mezoMainnet,
  contracts: {
    ..._mezoMainnet.contracts,
    multicall3: { address: MULTICALL3 },
  },
};

const mezoTestnet = {
  ..._mezoTestnet,
  contracts: {
    ..._mezoTestnet.contracts,
    multicall3: { address: MULTICALL3 },
  },
};
import {
  metaMaskWallet,
  okxWallet,
  injectedWallet,
  rainbowWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

export { mezoMainnet, mezoTestnet, PassportProvider };

// WalletConnect Project ID is required for RainbowKit v2.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "your_walletconnect_project_id";

// ── Why we use createConfig directly instead of passport's getConfig ──────────
// passport's getConfig() hardcodes:
//   - chains: [mezoMainnet] OR [mezoTestnet] — cannot include both
//   - transports: uses the internal RPC from the chain definition
//   - any `chains` or `transports` params passed in are silently ignored
//     because they are Omit'd from the type and spread after the hardcoded values
// This caused mainnet listings to fail loading: the internal transport was
// used instead of the validationcloud endpoint, and network switching was broken.
// Solution: build connectors ourselves and call wagmi's createConfig directly.

function buildConnectors() {
  const btcWallets = getDefaultWallets("mainnet");
  const walletList = [
    ...btcWallets,
    {
      groupName: "EVM Wallets",
      wallets: [
        metaMaskWallet,
        okxWallet,        // EVM OKX — connects via EVM, not BTC side
        coinbaseWallet,
        rainbowWallet,
        injectedWallet,
      ],
    },
  ];
  return connectorsForWallets(walletList, {
    appName: "Vezo Exchange",
    projectId,
  });
}

export const config = typeof window !== "undefined"
  ? createConfig({
      chains: [mezoMainnet, mezoTestnet],
      connectors: buildConnectors(),
      transports: {
        // validationcloud supports larger eth_getLogs ranges than rpc-internal
        [mezoMainnet.id]: http(
          process.env.NEXT_PUBLIC_RPC_MAINNET ||
            "https://mainnet.mezo.public.validationcloud.io"
        ),
        [mezoTestnet.id]: http(
          process.env.NEXT_PUBLIC_RPC_TESTNET || "https://rpc.test.mezo.org"
        ),
      },
      ssr: false,
    })
  : null;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
