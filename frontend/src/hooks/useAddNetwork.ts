"use client";

import { useCallback } from "react";
import { MEZO_TESTNET_PARAMS, MEZO_MAINNET_PARAMS } from "@/lib/chains";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export function useAddNetwork() {
  const addMezoTestnet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("No wallet detected");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MEZO_TESTNET_PARAMS.chainId }],
      });
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      // Chain not added yet
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [MEZO_TESTNET_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  const addMezoMainnet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("No wallet detected");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MEZO_MAINNET_PARAMS.chainId }],
      });
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [MEZO_MAINNET_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  const addNetwork = useCallback(
    async (network: "testnet" | "mainnet") => {
      if (network === "testnet") {
        return addMezoTestnet();
      }
      return addMezoMainnet();
    },
    [addMezoTestnet, addMezoMainnet]
  );

  return { addMezoTestnet, addMezoMainnet, addNetwork };
}
