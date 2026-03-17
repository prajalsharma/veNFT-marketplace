"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface FilterSidebarProps {
  collectionFilter: "all" | "veBTC" | "veMEZO";
  setCollectionFilter: (filter: "all" | "veBTC" | "veMEZO") => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  showExpired: boolean;
  setShowExpired: (show: boolean) => void;
  minDiscount: number;
  setMinDiscount: (discount: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FilterSidebar({
  collectionFilter,
  setCollectionFilter,
  sortBy,
  setSortBy,
  showExpired,
  setShowExpired,
  minDiscount,
  setMinDiscount,
  isOpen,
  onClose,
}: FilterSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#030303]/80 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0a0a] border-l border-white/[0.07] z-[70] p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#F7931A]" />
                <h3 className="text-xl font-bold">Market Filters</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-12">
              {/* Collection Section */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Asset Type</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'all', label: 'All Collections' },
                    { id: 'veBTC', label: 'veBTC (Bitcoin)' },
                    { id: 'veMEZO', label: 'veMEZO (Governance)' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCollectionFilter(item.id as any)}
                      className={`flex items-center justify-between px-4 py-4 rounded-2xl border transition-all text-sm font-bold
                        ${collectionFilter === item.id
                          ? 'bg-[#F7931A]/10 border-[#F7931A]/40 text-white shadow-[0_0_20px_rgba(247,147,26,0.1)]'
                          : 'bg-white/[0.03] border-transparent text-white/40 hover:border-white/[0.1] hover:text-white'
                        }`}
                    >
                      {item.label}
                      {collectionFilter === item.id && <CheckCircle2 className="w-4 h-4 text-[#F7931A]" />}
                    </button>
                  ))}
                </div>
              </section>

              {/* Discount Section */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Min. Discount</h4>
                  <span className="text-sm font-bold text-[#F7931A]">{minDiscount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={minDiscount}
                  onChange={(e) => setMinDiscount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-white/30">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </section>

              {/* Options Section */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Market Options</h4>
                <label className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-transparent hover:border-white/[0.1] transition-all cursor-pointer">
                  <span className="text-sm font-bold">Active Listings Only</span>
                  <input
                    type="checkbox"
                    checked={showExpired}
                    onChange={(e) => setShowExpired(e.target.checked)}
                    className="w-5 h-5 accent-[#F7931A] rounded-lg"
                  />
                </label>
              </section>
            </div>

            <div className="mt-20 pt-8 border-t border-white/[0.07] flex flex-col gap-3">
              <button 
                onClick={onClose}
                className="btn-primary w-full"
              >
                Apply Filters
              </button>
              <button 
                onClick={() => {
                  setCollectionFilter("all");
                  setMinDiscount(0);
                  setShowExpired(true);
                }}
                className="w-full py-4 text-sm font-bold text-mezo-muted hover:text-white transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function FilterButton({ onClick, activeFilters }: { onClick: () => void; activeFilters: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-6 py-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl text-sm font-bold hover:bg-white/[0.05] transition-all"
    >
      <Filter className="w-4 h-4" />
      Filters
      {activeFilters > 0 && (
        <span className="w-5 h-5 rounded-full bg-[#F7931A] text-black text-[10px] font-black flex items-center justify-center">
          {activeFilters}
        </span>
      )}
    </button>
  );
}
