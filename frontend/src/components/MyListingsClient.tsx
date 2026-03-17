"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, Tag, History, ShieldCheck, Zap, XCircle, ArrowRight, LayoutGrid } from "lucide-react";
import { useMarketplace, useListing, useUserVeNFTs } from "@/hooks/useMarketplace";
import { ListingModal } from "@/components/ListingModal";
import { getPaymentTokenSymbol } from "@/lib/tokens";

function UserListingItem({
  listingId, onActiveChange,
}: { listingId: number; onActiveChange?: (id: number, active: boolean) => void }) {
  const { listing, isLoading } = useListing(listingId);
  const { cancelListing, isPending, isConfirming } = useMarketplace();
  const active = listing?.active ?? false;

  useEffect(() => {
    if (!isLoading) onActiveChange?.(listingId, active);
  }, [isLoading, active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="h-[72px] rounded-xl shimmer" />;
  if (!listing || !listing.active) return null;

  const isVeBTC = listing.collection === "veBTC";
  const accentColor = isVeBTC ? "#F7931A" : "#4A90E2";
  const accentBg    = isVeBTC ? "rgba(247,147,26,0.1)"  : "rgba(74,144,226,0.1)";
  const accentBord  = isVeBTC ? "rgba(247,147,26,0.2)"  : "rgba(74,144,226,0.2)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-all group"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, border: `1px solid ${accentBord}` }}
        >
          <Zap className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-none mb-1">
            {listing.collection}{" "}
            <span style={{ color: accentColor }}>#{listing.tokenId.toString()}</span>
          </p>
          <p className="text-[12px] text-white/35 tabular-nums">
            {Number(formatEther(listing.price)).toFixed(5)}{" "}
            <span className="text-white/20">{getPaymentTokenSymbol(listing.paymentToken)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          Active
        </span>
        <button
          onClick={() => cancelListing(listingId)}
          disabled={isPending || isConfirming}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-red-500/10 text-red-400 border border-red-500/15 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-40"
        >
          <XCircle className="w-3.5 h-3.5" />
          {isPending || isConfirming ? "Canceling…" : "Cancel"}
        </button>
      </div>
    </motion.div>
  );
}

export default function MyListingsClient() {
  const { isConnected } = useAccount();
  const { userListingIds, refetchUserListings } = useMarketplace();
  const { veNFTs: walletVeNFTs, isLoading: veNFTsLoading, refetchVeNFTs } = useUserVeNFTs();
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedVeNFT, setSelectedVeNFT] = useState<any>(null);
  const [activeListingCount, setActiveListingCount] = useState(0);
  const activeMapRef = useRef<Map<number, boolean>>(new Map());

  useEffect(() => {
    const onFocus = () => { refetchVeNFTs(); refetchUserListings(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActiveChange = useCallback((id: number, active: boolean) => {
    const prev = activeMapRef.current.get(id);
    if (prev !== active) {
      activeMapRef.current.set(id, active);
      let count = 0;
      activeMapRef.current.forEach((v) => { if (v) count++; });
      setActiveListingCount(count);
    }
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 pt-[68px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#F7931A]/10 border border-[#F7931A]/20 flex items-center justify-center mx-auto mb-8">
            <Wallet className="w-8 h-8 text-[#F7931A]" />
          </div>
          <h1 className="text-[2rem] font-bold mb-4 tracking-tight">Connect Wallet</h1>
          <p className="text-[15px] text-white/40 leading-relaxed mb-10">
            Connect your wallet to manage your listed veNFTs and view your portfolio.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[88px] pb-24 px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ── */}
        <div className="pt-10 pb-10 border-b border-white/[0.055] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-3.5 h-3.5 text-[#4A90E2]" />
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#4A90E2]">My Positions</span>
            </div>
            <h1 className="text-[2.4rem] md:text-[3rem] font-bold tracking-tight mb-2">
              My <span className="gradient-text">Portfolio</span>
            </h1>
            <p className="text-[15px] text-white/40">Monitor and manage your active sell orders.</p>
          </div>
          <Link
            href="/activity"
            className="btn-outline flex items-center gap-2 self-start md:self-auto"
          >
            <History className="w-4 h-4" />
            Trade History
          </Link>
        </div>

        {/* ── Main layout ── */}
        <div className="pt-10 grid lg:grid-cols-[1fr_300px] gap-10">

          {/* Left — listings + wallet */}
          <div className="space-y-12">

            {/* Active listings */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Tag className="w-3.5 h-3.5 text-[#F7931A]" />
                <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#F7931A]">Active Sell Orders</h2>
                {activeListingCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F7931A] text-black text-[10px] font-black">
                    {activeListingCount}
                  </span>
                )}
              </div>
              {userListingIds && userListingIds.length > 0 ? (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {userListingIds.map((id) => (
                      <UserListingItem
                        key={id.toString()}
                        listingId={Number(id)}
                        onActiveChange={handleActiveChange}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl border border-dashed border-white/[0.08]">
                  <Tag className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-[14px] text-white/30">No active listings on the market.</p>
                </div>
              )}
            </section>

            {/* Wallet positions */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Wallet className="w-3.5 h-3.5 text-[#4A90E2]" />
                <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#4A90E2]">In Your Wallet</h2>
              </div>

              {veNFTsLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[0, 1].map((i) => <div key={i} className="h-28 rounded-xl shimmer" />)}
                </div>
              ) : walletVeNFTs.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-white/[0.08]">
                  <Wallet className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-[14px] text-white/30">No veBTC or veMEZO positions in your wallet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {walletVeNFTs.map((nft) => {
                    const isVeBTC = nft.collection === "veBTC";
                    const ac = isVeBTC ? "#F7931A" : "#4A90E2";
                    const ab = isVeBTC ? "rgba(247,147,26,0.1)" : "rgba(74,144,226,0.1)";
                    const ab2 = isVeBTC ? "rgba(247,147,26,0.2)" : "rgba(74,144,226,0.2)";
                    return (
                      <div
                        key={`${nft.collection}-${nft.tokenId.toString()}`}
                        className="flex flex-col gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: ab, border: `1px solid ${ab2}` }}
                          >
                            <Zap className="w-4 h-4" style={{ color: ac }} />
                          </div>
                          <div>
                            <p className="text-[14px] font-bold leading-none mb-1">
                              {nft.collection}{" "}
                              <span style={{ color: ac }}>#{nft.tokenId.toString()}</span>
                            </p>
                            <p className="text-[11px] text-white/30">Ready to list</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedVeNFT(nft); setIsListingModalOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-[13px] font-bold hover:bg-[#F7931A] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          List for Sale
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5">
            {/* Seller info card */}
            <div className="rounded-2xl border border-[#F7931A]/20 bg-[#F7931A]/[0.04] p-6">
              <h3 className="text-[13px] font-bold mb-4">Seller Dashboard</h3>
              <ul className="space-y-3.5">
                {[
                  "NFTs never leave your wallet while listed.",
                  "You continue receiving fee claims and voting power.",
                  "Atomic settlement — get paid instantly on purchase.",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-[13px] text-white/40 leading-snug">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick stats */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="text-[13px] font-bold mb-5">Quick Stats</h3>
              <div className="space-y-4">
                {[
                  { label: "Active Listings",     value: activeListingCount.toString() },
                  { label: "Total Sales",          value: "12.4 BTC" },
                  { label: "Protocol Fees Saved",  value: "0.45 BTC", color: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[13px] text-white/35">{s.label}</span>
                    <span className={`text-[13px] font-bold tabular-nums ${s.color ?? ""}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        veNFT={selectedVeNFT}
      />
    </div>
  );
}
