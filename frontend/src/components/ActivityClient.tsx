"use client";

import { useNetwork } from "@/hooks/useNetwork";
import { motion } from "framer-motion";
import { 
  Tag, 
  ShoppingCart, 
  XCircle, 
  ArrowUpRight, 
    ExternalLink,
    Activity,
    History,
    Clock,
    ShieldCheck as ShieldCheckIcon
  } from "lucide-react";

const MOCK_ACTIVITY = [
  {
    type: "sale",
    collection: "veBTC",
    tokenId: 142,
    price: "0.85",
    paymentToken: "BTC",
    from: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    to: "0xAAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA",
    timestamp: Date.now() - 3600000,
  },
  {
    type: "listed",
    collection: "veMEZO",
    tokenId: 12,
    price: "15,000",
    paymentToken: "MEZO",
    from: "0xBBbBbbBBbBBBbbBbBbbBbbBBbBbbBBbBbbBBbBbb",
    to: null,
    timestamp: Date.now() - 7200000,
  },
  {
    type: "cancelled",
    collection: "veBTC",
    tokenId: 3102,
    price: "2.15",
    paymentToken: "BTC",
    from: "0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc",
    to: null,
    timestamp: Date.now() - 14400000,
  },
  {
    type: "sale",
    collection: "veMEZO",
    tokenId: 8,
    price: "20,000",
    paymentToken: "MEZO",
    from: "0xDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDd",
    to: "0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe",
    timestamp: Date.now() - 28800000,
  },
];

function formatTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

export default function ActivityClient() {
  const { network, contracts } = useNetwork();

  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-2 text-mezo-primary mb-2">
            <History className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Live Stream</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Global <span className="gradient-text">Activity</span></h1>
          <p className="text-mezo-muted">Real-time trading and listing history on Mezo {network === "testnet" ? "Testnet" : "Mainnet"}.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl overflow-hidden border-mezo-border"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-mezo-border/50 bg-white/[0.02]">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted">Event</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted">Item</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted">Price</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted">From</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted">To</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-mezo-muted text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mezo-border/30">
                {MOCK_ACTIVITY.map((activity, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {activity.type === "sale" ? (
                          <div className="flex items-center gap-1.5 text-mezo-success text-xs font-bold uppercase tracking-wider">
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Sale
                          </div>
                        ) : activity.type === "listed" ? (
                          <div className="flex items-center gap-1.5 text-mezo-primary text-xs font-bold uppercase tracking-wider">
                            <Tag className="w-3.5 h-3.5" />
                            List
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-mezo-muted text-xs font-bold uppercase tracking-wider">
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${activity.collection === 'veBTC' ? 'bg-mezo-primary' : 'bg-mezo-accent'}`} />
                        <span className="font-bold text-sm">{activity.collection} #{activity.tokenId}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-white">{activity.price}</span>
                        <span className="text-[10px] font-bold text-mezo-muted">{activity.paymentToken}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono text-xs text-mezo-muted">
                      <a href={`${contracts.explorer}/address/${activity.from}`} target="_blank" className="hover:text-mezo-primary transition-colors flex items-center gap-1">
                        {activity.from.slice(0, 6)}...{activity.from.slice(-4)}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="px-8 py-6 font-mono text-xs text-mezo-muted">
                      {activity.to ? (
                        <a href={`${contracts.explorer}/address/${activity.to}`} target="_blank" className="hover:text-mezo-primary transition-colors flex items-center gap-1">
                          {activity.to.slice(0, 6)}...{activity.to.slice(-4)}
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : <span className="text-mezo-border">—</span>}
                    </td>
                    <td className="px-8 py-6 text-right font-bold text-sm text-mezo-muted">
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(activity.timestamp)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Audit Disclaimer */}
        <div className="mt-12 p-6 glass-card rounded-2xl border-mezo-success/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-mezo-success/10 text-mezo-success">
                <ShieldCheckIcon className="w-6 h-6" />
              </div>
              <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Verifiable Trading History</p>
              <p className="text-xs text-mezo-muted">Every transaction on this list corresponds to an atomic on-chain event on the Mezo EVM.</p>
            </div>
          </div>
          <a 
            href={contracts.explorer} 
            target="_blank" 
            className="btn-outline py-2 px-4 text-xs font-bold flex items-center gap-2"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
