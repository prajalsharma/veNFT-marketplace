"use client";

import { useState, useCallback, useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { mezoTestnet, mezoMainnet } from "@/lib/wagmi";
import { getContracts, NetworkType } from "@/lib/contracts";

const STORAGE_KEY = "vezo-selected-network";

// Read the persisted network preference. Defaults to mainnet so the
// marketplace always shows live listings even when the wallet is on testnet.
function getStoredNetwork(): NetworkType {
  if (typeof window === "undefined") return "mainnet";
  return (localStorage.getItem(STORAGE_KEY) as NetworkType) ?? "mainnet";
}

export function useNetwork() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isTestnet = chainId === mezoTestnet.id;
  const isMainnet = chainId === mezoMainnet.id;
  const isMezoNetwork = isTestnet || isMainnet;

  // selectedNetwork is independent of the wallet's chainId.
  // Mainnet is the default — users see live listings even if their wallet
  // is on testnet. The header toggle updates both this state and the wallet chain.
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>(getStoredNetwork);

  // Keep state in sync if localStorage was changed in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "mainnet" || e.newValue === "testnet")) {
        setSelectedNetwork(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const network: NetworkType = selectedNetwork;
  const contracts = getContracts(network);

  const switchToTestnet = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "testnet");
    setSelectedNetwork("testnet");
    switchChain?.({ chainId: mezoTestnet.id });
  }, [switchChain]);

  const switchToMainnet = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "mainnet");
    setSelectedNetwork("mainnet");
    switchChain?.({ chainId: mezoMainnet.id });
  }, [switchChain]);

  const toggleNetwork = useCallback(() => {
    if (selectedNetwork === "testnet") {
      switchToMainnet();
    } else {
      switchToTestnet();
    }
  }, [selectedNetwork, switchToMainnet, switchToTestnet]);

  return {
    chainId,
    network,
    isTestnet: selectedNetwork === "testnet",
    isMainnet: selectedNetwork === "mainnet",
    isMezoNetwork,
    contracts,
    switchToTestnet,
    switchToMainnet,
    toggleNetwork,
  };
}
