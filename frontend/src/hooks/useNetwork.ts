"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { mezoTestnet, mezoMainnet } from "@/lib/wagmi";
import { getContracts, NetworkType } from "@/lib/contracts";

const STORAGE_KEY = "vezo-selected-network";

// ── Shared, app-wide network store ────────────────────────────────────────────
// Every useNetwork() consumer must read the SAME selected network and re-render
// together when it is toggled. A per-component useState does NOT do this: a
// same-tab change never propagates (the `storage` event only fires in OTHER
// tabs), so toggling the NetworkSwitcher updated only its own instance while the
// marketplace kept its old value — and kept showing mainnet listings on testnet.
//
// A tiny external store + useSyncExternalStore fixes it: one source of truth, all
// subscribers update on toggle (and across tabs).

let initialized = false;
let currentNetwork: NetworkType = "mainnet";
const listeners = new Set<() => void>();

function readStored(): NetworkType {
  if (typeof window === "undefined") return "mainnet";
  const s = localStorage.getItem(STORAGE_KEY);
  return s === "testnet" || s === "mainnet" ? s : "mainnet";
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  currentNetwork = readStored();
  // Cross-tab sync.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && (e.newValue === "mainnet" || e.newValue === "testnet")) {
      currentNetwork = e.newValue;
      listeners.forEach((l) => l());
    }
  });
}

function setNetwork(n: NetworkType) {
  ensureInit();
  if (n === currentNetwork) return;
  currentNetwork = n;
  try { localStorage.setItem(STORAGE_KEY, n); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  ensureInit();
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot(): NetworkType { ensureInit(); return currentNetwork; }
function getServerSnapshot(): NetworkType { return "mainnet"; }

export function useNetwork() {
  const walletChainId = useChainId();
  const { switchChain } = useSwitchChain();

  // selectedNetwork drives ALL data reads and is independent of wallet chain.
  const selectedNetwork = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isMezoNetwork =
    walletChainId === mezoTestnet.id || walletChainId === mezoMainnet.id;

  const network: NetworkType = selectedNetwork;
  const contracts = getContracts(network);

  // chainId for RPC reads — must match selectedNetwork, NOT the wallet chain.
  const chainId =
    selectedNetwork === "mainnet" ? mezoMainnet.id : mezoTestnet.id;

  const switchToTestnet = useCallback(() => {
    setNetwork("testnet");
    switchChain?.({ chainId: mezoTestnet.id });
  }, [switchChain]);

  const switchToMainnet = useCallback(() => {
    setNetwork("mainnet");
    switchChain?.({ chainId: mezoMainnet.id });
  }, [switchChain]);

  const toggleNetwork = useCallback(() => {
    if (selectedNetwork === "testnet") {
      setNetwork("mainnet");
      switchChain?.({ chainId: mezoMainnet.id });
    } else {
      setNetwork("testnet");
      switchChain?.({ chainId: mezoTestnet.id });
    }
  }, [selectedNetwork, switchChain]);

  return {
    chainId,           // read chain — matches selectedNetwork
    walletChainId,     // actual wallet chain — for transaction/switch logic
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
