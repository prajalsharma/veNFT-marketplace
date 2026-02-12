"use client";

import { useCallback, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  mezoTestnet,
  mezoMainnet,
  MEZO_TESTNET_PARAMS,
  MEZO_MAINNET_PARAMS,
} from "@/lib/chains";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

interface AddNetworkResult {
  success: boolean;
  error?: string;
}

export function useAddNetwork() {
  const { connector, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isAdding, setIsAdding] = useState(false);

  const addNetwork = useCallback(
    async (network: "testnet" | "mainnet"): Promise<AddNetworkResult> => {
      setIsAdding(true);
      const params = network === "testnet" ? MEZO_TESTNET_PARAMS : MEZO_MAINNET_PARAMS;
      const chain = network === "testnet" ? mezoTestnet : mezoMainnet;

      // Try using wagmi's switchChain first if connected
      if (isConnected && switchChain) {
        try {
          switchChain({ chainId: chain.id });
          setIsAdding(false);
          return { success: true };
        } catch {
          // Fall through to manual method
        }
      }

      // Fall back to direct window.ethereum if available
      if (!window.ethereum) {
        setIsAdding(false);
        return { success: false, error: "No wallet detected" };
      }

      try {
        // First try to switch to the chain (in case it already exists)
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: params.chainId }],
          });
          setIsAdding(false);
          return { success: true };
        } catch (switchError: any) {
          // Chain doesn't exist (error 4902), need to add it
          if (switchError?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [params],
            });
            setIsAdding(false);
            return { success: true };
          }
          throw switchError;
        }
      } catch (error: any) {
        setIsAdding(false);

        // User rejected the request
        if (error?.code === 4001) {
          return { success: false, error: "User rejected the request" };
        }

        return {
          success: false,
          error: error?.message || "Failed to add network",
        };
      }
    },
    [isConnected, switchChain]
  );

  const switchToMezo = useCallback(
    async (network: "testnet" | "mainnet"): Promise<AddNetworkResult> => {
      const params = network === "testnet" ? MEZO_TESTNET_PARAMS : MEZO_MAINNET_PARAMS;

      if (!window.ethereum) {
        return { success: false, error: "No wallet detected" };
      }

      try {
        // First try to switch
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: params.chainId }],
          });
          return { success: true };
        } catch (switchError: any) {
          // If chain doesn't exist (error 4902), add it
          if (switchError?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [params],
            });
            return { success: true };
          }
          throw switchError;
        }
      } catch (error: any) {
        if (error?.code === 4001) {
          return { success: false, error: "User rejected the request" };
        }
        return {
          success: false,
          error: error?.message || "Failed to switch network",
        };
      }
    },
    []
  );

  // Legacy methods for backwards compatibility
  const addMezoTestnet = useCallback(() => addNetwork("testnet"), [addNetwork]);
  const addMezoMainnet = useCallback(() => addNetwork("mainnet"), [addNetwork]);

  return {
    addNetwork,
    switchToMezo,
    addMezoTestnet,
    addMezoMainnet,
    isAdding,
  };
}
