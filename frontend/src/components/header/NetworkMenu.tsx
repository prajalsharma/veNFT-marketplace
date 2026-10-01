"use client";

// Which Mezo network the app reads from. A quiet status control, not a
// toggle: mainnet is the normal state; testnet is shown in amber so nobody
// mistakes test positions for real ones.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";

const OPTIONS = [
  { id: "mainnet", label: "Mezo Mainnet", note: "Real positions and funds" },
  { id: "testnet", label: "Mezo Testnet", note: "Test tokens, for trying things out" },
] as const;

export function NetworkMenu({ variant = "compact" }: { variant?: "compact" | "list" }) {
  const { network } = useNetwork();
  const { isConnected } = useAccount();
  const { addNetwork } = useAddNetwork();
  const { switchToMainnet, switchToTestnet } = useNetwork();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = async (id: "mainnet" | "testnet") => {
    setError(null);
    if (id === network) { setOpen(false); return; }
    // Make sure the wallet knows the chain before we flip reads over to it.
    if (isConnected) {
      const r = await addNetwork(id);
      if (!r.success && r.error) { setError(r.error); return; }
    }
    id === "mainnet" ? switchToMainnet() : switchToTestnet();
    setOpen(false);
  };

  const tone = network === "testnet" ? "#D97706" : "var(--success)";

  if (variant === "list") {
    return (
      <div role="radiogroup" aria-label="Network" className="grid gap-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={network === o.id}
            onClick={() => choose(o.id)}
            className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left transition-colors"
            style={{ background: network === o.id ? "var(--bg-2)" : "transparent" }}
          >
            <span>
              <span className="block text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{o.label}</span>
              <span className="block text-[13px]" style={{ color: "var(--text-3)" }}>{o.note}</span>
            </span>
            {network === o.id && <Check style={{ width: 16, height: 16, color: "var(--text-1)" }} />}
          </button>
        ))}
        {error && <p className="text-[13px] px-1" style={{ color: "#DC2626" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="hdr-ghost h-9 px-2.5 rounded-lg inline-flex items-center gap-2 text-[13px] font-semibold"
        title="Network Vezo reads from"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} aria-hidden />
        <span style={{ color: network === "testnet" ? "#B45309" : "var(--text-2)" }}>{network === "testnet" ? "Testnet" : "Mainnet"}</span>
        <ChevronDown style={{ width: 14, height: 14, color: "var(--text-3)" }} />
      </button>
      {open && (
        <div role="menu" className="hdr-pop absolute right-0 top-[calc(100%+8px)] w-[260px] p-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              role="menuitemradio"
              aria-checked={network === o.id}
              onClick={() => choose(o.id)}
              className="hdr-item w-full flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg text-left"
            >
              <span>
                <span className="block text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{o.label}</span>
                <span className="block text-[12px]" style={{ color: "var(--text-3)" }}>{o.note}</span>
              </span>
              {network === o.id && <Check style={{ width: 15, height: 15, marginTop: 3, color: "var(--text-1)" }} />}
            </button>
          ))}
          {error && <p className="text-[12px] px-3 pb-2" style={{ color: "#DC2626" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
