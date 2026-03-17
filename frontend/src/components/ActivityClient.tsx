"use client";

import { useNetwork } from "@/hooks/useNetwork";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { motion } from "framer-motion";
import {
  Tag,
  ShoppingCart,
  XCircle,
  ArrowUpRight,
  ExternalLink,
  History,
  Clock,
  ShieldCheck as ShieldCheckIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";

function formatTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

export default function ActivityClient() {
  const { network, contracts } = useNetwork();
  const { events, isLoading, error, isDeployed } = useActivityFeed(100);

  return (
    <div className="min-h-screen pt-[88px] pb-24 px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ── */}
        <div className="pt-10 pb-10 border-b border-white/[0.055]">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-3.5 h-3.5 text-[#F7931A]" />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#F7931A]">Live Stream</span>
          </div>
          <h1 className="text-[2.4rem] md:text-[3rem] font-bold tracking-tight mb-2">
            Global <span className="gradient-text">Activity</span>
          </h1>
          <p className="text-[15px] text-white/40">
            Real-time trading and listing history on Mezo{" "}
            {network === "testnet" ? "Testnet" : "Mainnet"}.
          </p>
        </div>

        <div className="pt-8">
          {!isDeployed ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-6 h-6 text-white/25" />
              </div>
              <h3 className="text-[17px] font-bold mb-2">Not Deployed</h3>
              <p className="text-[14px] text-white/35 max-w-xs mx-auto leading-relaxed">
                Marketplace not yet deployed on this network. Deploy contracts and
                set environment variables to see activity.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-20 flex items-center justify-center gap-3 text-white/35 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[14px] font-medium">Loading on-chain events…</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                <History className="w-6 h-6 text-white/25" />
              </div>
              <h3 className="text-[17px] font-bold mb-2">No Activity Yet</h3>
              <p className="text-[14px] text-white/35 max-w-xs mx-auto leading-relaxed">
                Be the first to list a veNFT and provide liquidity.
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                <History className="w-6 h-6 text-white/25" />
              </div>
              <h3 className="text-[17px] font-bold mb-2">No Activity Yet</h3>
              <p className="text-[14px] text-white/35">Be the first to list a veNFT and provide liquidity.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.055] bg-white/[0.02]">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Event</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Item</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Price</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white/30">From</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white/30">To</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.035]">
                    {events.map((activity, index) => (
                      <tr
                        key={`${activity.transactionHash}-${index}`}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-6 py-5">
                          {activity.type === "sale" ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                              <ShoppingCart className="w-3.5 h-3.5" />Sale
                            </div>
                          ) : activity.type === "listed" ? (
                            <div className="flex items-center gap-1.5 text-[#F7931A] text-[11px] font-bold uppercase tracking-wider">
                              <Tag className="w-3.5 h-3.5" />List
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-white/35 text-[11px] font-bold uppercase tracking-wider">
                              <XCircle className="w-3.5 h-3.5" />Cancel
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                activity.collection === "veBTC" ? "bg-[#F7931A]" : "bg-[#4A90E2]"
                              }`}
                            />
                            <span className="font-bold text-[13px]">
                              {activity.collection} #{activity.tokenId.toString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[13px] text-white">{activity.price}</span>
                            <span className="text-[10px] font-bold text-white/30">{activity.paymentToken}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono text-[11px] text-white/35">
                          {activity.from ? (
                            <a
                              href={`${contracts.explorer}/address/${activity.from}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#F7931A] transition-colors flex items-center gap-1"
                            >
                              {activity.from.slice(0, 6)}…{activity.from.slice(-4)}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 font-mono text-[11px] text-white/35">
                          {activity.to ? (
                            <a
                              href={`${contracts.explorer}/address/${activity.to}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#F7931A] transition-colors flex items-center gap-1"
                            >
                              {activity.to.slice(0, 6)}…{activity.to.slice(-4)}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {activity.transactionHash ? (
                            <a
                              href={`${contracts.explorer}/tx/${activity.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-end gap-1.5 font-bold text-[12px] text-white/35 hover:text-[#F7931A] transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                              {formatTime(activity.timestamp)}
                            </a>
                          ) : (
                            <span className="flex items-center justify-end gap-1.5 font-bold text-[12px] text-white/35">
                              <Clock className="w-3 h-3" />
                              {formatTime(activity.timestamp)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Verifiable history band ── */}
        <div className="mt-10 p-5 rounded-2xl border border-emerald-500/[0.15] bg-emerald-500/[0.03] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold">Verifiable Trading History</p>
              <p className="text-[12px] text-white/35 mt-0.5">
                Every transaction corresponds to an atomic on-chain event on the Mezo EVM.
              </p>
            </div>
          </div>
          <a
            href={contracts.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline py-2.5 px-5 text-[12px] font-bold flex items-center gap-2 whitespace-nowrap"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
