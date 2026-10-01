"use client";

import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import { mezoTestnet, mezoMainnet } from "@/lib/wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { useState } from "react";

export function NetworkSwitcher() {
  // useAccount().chainId is the wallet's real chain; useChainId() keeps
  // reporting the last *supported* chain, so it never noticed e.g. Ethereum.
  const { isConnected, chainId } = useAccount();
  const { network } = useNetwork();
  const { switchToMezo, isAdding } = useAddNetwork();
  const [error, setError] = useState<string | null>(null);

  const expectedChainId = network === "testnet" ? mezoTestnet.id : mezoMainnet.id;
  const isWrongNetwork = isConnected && chainId !== expectedChainId;

  const handleSwitch = async () => {
    setError(null);
    const result = await switchToMezo(network);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <AnimatePresence>
      {isWrongNetwork && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 right-0 z-40"
          style={{ top: "var(--header-h)", background: "var(--bg-1)", borderBottom: "1px solid rgba(217,119,6,0.35)" }}
          role="status"
        >
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <span className="inline-flex items-center gap-2 font-semibold" style={{ color: "#B45309" }}>
              <AlertTriangle style={{ width: 14, height: 14 }} /> Wrong network
            </span>
            <span style={{ color: "var(--text-2)" }}>
              Your wallet is on another network. Switch to Mezo {network === "testnet" ? "Testnet" : "Mainnet"} to trade.
            </span>
            {error && <span style={{ color: "#DC2626" }}>{error}</span>}
            <button
              onClick={handleSwitch}
              disabled={isAdding}
              className="hdr-primary ml-auto h-8 px-3.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-2"
            >
              {isAdding ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <ArrowRight style={{ width: 13, height: 13 }} />}
              {isAdding ? "Check your wallet…" : "Switch network"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
