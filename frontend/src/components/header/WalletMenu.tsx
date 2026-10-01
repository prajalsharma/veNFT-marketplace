"use client";

// Wallet button + account menu.
//
// The button reports the wallet's state at a glance (connecting, connected,
// wrong network). The menu is a compact account surface: who you are, which
// network you're on, what you hold, and what you have on Vezo. Every number
// is read live, and each row has its own loading / error / zero state:
// nothing shows "0" until a read has actually returned zero.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Copy, Loader2, LogOut, RefreshCw, Repeat, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useDisconnect, useReadContracts } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useNetwork } from "@/hooks/useNetwork";
import { useAddNetwork } from "@/hooks/useAddNetwork";
import { usePriceTicker } from "@/hooks/usePriceTicker";
import { useLiveMarket } from "@/hooks/useMarketData";

const BALANCE_OF = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function fmtToken(v: bigint, sym: string) {
  const n = Number(formatUnits(v, 18));
  if (n === 0) return "0";
  const max = sym === "BTC" ? (n < 1 ? 6 : 4) : n < 1 ? 4 : 2;
  if (n > 0 && n < 10 ** -max) return `<${(10 ** -max).toFixed(max)}`;
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}

// ─── Account data ────────────────────────────────────────────────────────────

function useAccountData(address?: `0x${string}`) {
  const { chainId, contracts } = useNetwork();
  const prices = usePriceTicker();
  const live = useLiveMarket();
  const enabled = !!address;

  const btc = useBalance({ address, chainId, query: { enabled, refetchInterval: 30_000 } });
  const reads = useReadContracts({
    allowFailure: true,
    contracts: enabled
      ? ([
          { address: contracts.MEZO as `0x${string}`, abi: BALANCE_OF, functionName: "balanceOf", args: [address!], chainId },
          { address: contracts.MUSD as `0x${string}`, abi: BALANCE_OF, functionName: "balanceOf", args: [address!], chainId },
          { address: contracts.veBTC as `0x${string}`, abi: BALANCE_OF, functionName: "balanceOf", args: [address!], chainId },
          { address: contracts.veMEZO as `0x${string}`, abi: BALANCE_OF, functionName: "balanceOf", args: [address!], chainId },
        ] as const)
      : [],
    query: { enabled, refetchInterval: 30_000 },
  });

  const at = (i: number) => {
    const r = reads.data?.[i];
    if (!r) return { state: reads.isError ? "error" : "loading" } as const;
    return r.status === "success" ? ({ state: "ready", value: r.result as bigint } as const) : ({ state: "error" } as const);
  };

  const tokens = [
    { sym: "BTC", usd: prices.BTC, row: btc.data ? ({ state: "ready", value: btc.data.value } as const) : btc.isError ? ({ state: "error" } as const) : ({ state: "loading" } as const) },
    { sym: "MEZO", usd: prices.MEZO, row: at(0) },
    { sym: "MUSD", usd: prices.MUSD, row: at(1) },
  ];

  const ve = [at(2), at(3)];
  const heldState = ve.every((v) => v.state === "ready") ? "ready" : ve.some((v) => v.state === "error") ? "error" : "loading";
  const held = heldState === "ready" ? ve.reduce((s, v) => s + Number((v as { value: bigint }).value), 0) : null;
  const listed = live.status === "error" ? null : live.status === "loading" ? undefined : live.listings.filter((l) => l.active && l.seller.toLowerCase() === address?.toLowerCase()).length;

  const refetch = () => { btc.refetch(); reads.refetch(); live.refetch(); };
  return { tokens, held, heldState, listed, refetch, explorer: contracts.explorer };
}

// ─── Button ──────────────────────────────────────────────────────────────────

export function WalletMenu() {
  const { address, status, connector, chainId: walletChain } = useAccount();
  const { network, chainId } = useNetwork();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname, address]);

  const connected = status === "connected" && !!address;
  const wrongNetwork = connected && walletChain !== chainId;

  // Before hydration, or while wagmi restores a previous session, render a
  // placeholder of the right size instead of flashing "Connect wallet".
  if (!mounted || status === "reconnecting") {
    return <div className="h-11 w-[150px] rounded-lg skeleton" aria-hidden />;
  }

  if (!connected) {
    const busy = status === "connecting" || connectModalOpen;
    return (
      <button onClick={() => openConnectModal?.()} className="hdr-primary h-11 px-5 rounded-lg text-[15px] font-semibold inline-flex items-center gap-2 whitespace-nowrap" aria-busy={busy}>
        {busy && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
        {busy ? "Connecting…" : <>Connect<span className="hidden sm:inline">&nbsp;wallet</span></>}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`h-11 pl-2 pr-3 rounded-lg inline-flex items-center gap-2.5 whitespace-nowrap ${wrongNetwork ? "hdr-warn" : "hdr-outline"}`}
      >
        <WalletIcon icon={connector?.icon} size={28} />
        {wrongNetwork ? (
          <span className="text-[15px] font-semibold">Wrong network</span>
        ) : (
          <span className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{short(address)}</span>
        )}
        <ChevronDown style={{ width: 14, height: 14, color: "var(--text-3)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 160ms ease" }} />
      </button>
      <AccountPanel
        open={open}
        onClose={() => { setOpen(false); btnRef.current?.focus(); }}
        address={address}
        walletName={connector?.name}
        walletIcon={connector?.icon}
        wrongNetwork={wrongNetwork}
        network={network}
      />
    </div>
  );
}

function WalletIcon({ icon, size = 24 }: { icon?: string; size?: number }) {
  // Only data/https icons supplied by the connector; anything else falls back.
  const safe = icon && /^(data:image\/|https:\/\/)/.test(icon) ? icon : null;
  return safe ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={safe} alt="" width={size} height={size} className="rounded-md shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-md inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, background: "var(--bg-2)", color: "var(--text-2)" }}>
      <Wallet style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function AccountPanel({ open, onClose, address, walletName, walletIcon, wrongNetwork, network }: {
  open: boolean; onClose: () => void; address: `0x${string}`; walletName?: string; walletIcon?: string; wrongNetwork: boolean; network: "mainnet" | "testnet";
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const isSheet = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && !(t as HTMLElement).closest?.("[aria-haspopup='dialog']")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, a")?.focus());
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, onClose]);

  const tree = (
    <AnimatePresence>
      {open && (
        <>
          {isSheet && (
            <motion.div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.45)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          )}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Account"
            initial={reduce ? { opacity: 0 } : isSheet ? { y: "100%" } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : isSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : isSheet ? { y: "100%" } : { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: isSheet ? 0.3 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top right" }}
            className={
              isSheet
                ? "hdr-sheet fixed inset-x-0 bottom-0 z-[71] max-h-[88dvh] overflow-y-auto"
                : "hdr-pop absolute right-0 top-[calc(100%+8px)] w-[360px] z-[60]"
            }
          >
            {isSheet && <div className="flex justify-center pt-2.5" aria-hidden><span className="w-10 h-1 rounded-full" style={{ background: "var(--border-strong)" }} /></div>}
            <PanelBody address={address} walletName={walletName} walletIcon={walletIcon} wrongNetwork={wrongNetwork} network={network} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  // On phones the sheet must sit above the page and the tab bar, outside the
  // header's stacking context; on desktop it stays anchored to the button.
  return isSheet && typeof document !== "undefined" ? createPortal(tree, document.body) : tree;
}

function PanelBody({ address, walletName, walletIcon, wrongNetwork, network, onClose }: {
  address: `0x${string}`; walletName?: string; walletIcon?: string; wrongNetwork: boolean; network: "mainnet" | "testnet"; onClose: () => void;
}) {
  const data = useAccountData(address);
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { switchToMezo, isAdding } = useAddNetwork();
  const [copied, setCopied] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const netName = network === "testnet" ? "Mezo Testnet" : "Mezo Mainnet";

  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  const doSwitch = async () => {
    setSwitchError(null);
    const r = await switchToMezo(network);
    if (!r.success && r.error) setSwitchError(r.error);
  };

  const usdTotal = data.tokens.every((t) => t.row.state === "ready" && t.usd !== null)
    ? data.tokens.reduce((s, t) => s + Number(formatUnits((t.row as { value: bigint }).value, 18)) * (t.usd as number), 0)
    : null;
  const anyError = data.tokens.some((t) => t.row.state === "error") || data.heldState === "error";

  return (
    <div className="p-2">
      {/* Identity */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-3.5">
        <WalletIcon icon={walletIcon} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-3)" }}>{walletName ?? "Connected wallet"}</p>
          <p className="text-[16px] font-semibold tabular-nums truncate" style={{ color: "var(--text-1)" }} title={address}>{short(address)}</p>
        </div>
        <button onClick={copy} className="hdr-icon" aria-label={copied ? "Address copied" : "Copy address"} title={copied ? "Copied" : "Copy address"}>
          {copied ? <Check style={{ width: 15, height: 15, color: "var(--success)" }} /> : <Copy style={{ width: 15, height: 15 }} />}
        </button>
        <a href={`${data.explorer}/address/${address}`} target="_blank" rel="noopener noreferrer" className="hdr-icon" aria-label="View on Mezo explorer" title="View on explorer">
          <ArrowUpRight style={{ width: 16, height: 16 }} />
        </a>
      </div>

      {/* Network */}
      {wrongNetwork ? (
        <div className="mx-1 mb-2 p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.09)" }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#B45309" }}>
            <AlertTriangle style={{ width: 14, height: 14 }} /> Your wallet is on another network
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>Vezo is reading {netName}. Switch to trade.</p>
          <button onClick={doSwitch} disabled={isAdding} className="hdr-primary mt-2.5 h-9 w-full rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-2">
            {isAdding && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
            {isAdding ? "Check your wallet…" : `Switch to ${netName}`}
          </button>
          {switchError && <p className="text-[12px] mt-2" style={{ color: "#DC2626" }}>{switchError}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between mx-3 py-2 text-[13px]" style={{ borderTop: "1px solid var(--hairline)" }}>
          <span style={{ color: "var(--text-3)" }}>Network</span>
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--text-1)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: network === "testnet" ? "#D97706" : "var(--success)" }} />
            {netName}
          </span>
        </div>
      )}

      {/* Balances */}
      <div className="mx-1 mt-1 rounded-xl" style={{ background: "var(--bg-2)" }}>
        <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-3)" }}>In this wallet</span>
          <span className="text-[12px] tabular-nums" style={{ color: "var(--text-3)" }}>
            {usdTotal !== null ? `≈ $${usdTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}
          </span>
        </div>
        <ul className="px-3 pb-2">
          {data.tokens.map((t) => (
            <li key={t.sym} className="flex items-center justify-between py-1.5 text-[14px]">
              <span className="font-medium" style={{ color: "var(--text-2)" }}>{t.sym}</span>
              {t.row.state === "loading" ? (
                <span className="h-3.5 w-20 rounded skeleton" aria-label={`Loading ${t.sym} balance`} />
              ) : t.row.state === "error" ? (
                <span className="text-[13px]" style={{ color: "var(--text-3)" }}>Unavailable</span>
              ) : (
                <span className="font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{fmtToken(t.row.value, t.sym)}</span>
              )}
            </li>
          ))}
        </ul>
        {anyError && (
          <button onClick={data.refetch} className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold" style={{ color: "var(--text-2)", borderTop: "1px solid var(--hairline)" }}>
            <RefreshCw style={{ width: 12, height: 12 }} /> Couldn&apos;t load some balances. Retry
          </button>
        )}
      </div>

      {/* On Vezo */}
      <Link href="/my-listings" onClick={onClose} className="hdr-item flex items-center justify-between gap-3 mx-1 mt-2 px-3 py-3 rounded-xl">
        <span>
          <span className="block text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Portfolio</span>
          <span className="block text-[13px] tabular-nums" style={{ color: "var(--text-3)" }}>
            {data.heldState === "loading" ? "Loading positions…" : data.held === null ? "Positions unavailable" : `${data.held} veNFT${data.held === 1 ? "" : "s"} in wallet`}
            {typeof data.listed === "number" ? ` · ${data.listed} listed` : ""}
          </span>
        </span>
        <ArrowUpRight style={{ width: 16, height: 16, color: "var(--text-3)", transform: "rotate(45deg)" }} />
      </Link>

      {/* Session */}
      <div className="grid grid-cols-2 gap-1 mt-2 pt-2 mx-1" style={{ borderTop: "1px solid var(--hairline)" }}>
        <button onClick={() => { disconnect(); onClose(); setTimeout(() => openConnectModal?.(), 150); }} className="hdr-item h-10 rounded-lg inline-flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>
          <Repeat style={{ width: 14, height: 14 }} /> Switch wallet
        </button>
        <button onClick={() => { disconnect(); onClose(); }} className="hdr-item h-10 rounded-lg inline-flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>
          <LogOut style={{ width: 14, height: 14 }} /> Disconnect
        </button>
      </div>
    </div>
  );
}
