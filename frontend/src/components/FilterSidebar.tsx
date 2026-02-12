"use client";

import { motion } from "framer-motion";
import { Filter, X, ChevronDown } from "lucide-react";
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
  const [expandedSections, setExpandedSections] = useState({
    collection: true,
    sort: true,
    filters: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        className={`fixed lg:relative top-0 left-0 h-full lg:h-auto w-80 lg:w-64
          bg-mezo-secondary/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none
          border-r border-white/10 lg:border-0
          z-50 lg:z-auto
          overflow-y-auto
          ${isOpen ? "block" : "hidden lg:block"}`}
      >
        <div className="p-6 lg:p-0 pt-24 lg:pt-0 space-y-6">
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-6 right-6 p-2 rounded-xl bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collection Filter */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("collection")}
              className="w-full flex items-center justify-between p-4 text-white font-semibold"
            >
              <span>Collection</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  expandedSections.collection ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedSections.collection && (
              <div className="px-4 pb-4 space-y-2">
                {[
                  { value: "all", label: "All Collections" },
                  { value: "veBTC", label: "veBTC", color: "orange" },
                  { value: "veMEZO", label: "veMEZO", color: "purple" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setCollectionFilter(option.value as "all" | "veBTC" | "veMEZO")
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${
                        collectionFilter === option.value
                          ? option.color === "orange"
                            ? "bg-mezo-primary/20 text-mezo-primary border border-mezo-primary/30"
                            : option.color === "purple"
                            ? "bg-mezo-purple/20 text-mezo-purple border border-mezo-purple/30"
                            : "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/70 hover:bg-white/10 border border-transparent"
                      }`}
                  >
                    {option.color && (
                      <span
                        className={`w-3 h-3 rounded-full ${
                          option.color === "orange" ? "bg-mezo-primary" : "bg-mezo-purple"
                        }`}
                      />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("sort")}
              className="w-full flex items-center justify-between p-4 text-white font-semibold"
            >
              <span>Sort By</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  expandedSections.sort ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedSections.sort && (
              <div className="px-4 pb-4 space-y-2">
                {[
                  { value: "discount", label: "Highest Discount" },
                  { value: "price-asc", label: "Price: Low to High" },
                  { value: "price-desc", label: "Price: High to Low" },
                  { value: "expiry", label: "Expiring Soon" },
                  { value: "newest", label: "Recently Listed" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all
                      ${
                        sortBy === option.value
                          ? "bg-mezo-primary/20 text-mezo-primary border border-mezo-primary/30"
                          : "bg-white/5 text-white/70 hover:bg-white/10 border border-transparent"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("filters")}
              className="w-full flex items-center justify-between p-4 text-white font-semibold"
            >
              <span>Filters</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  expandedSections.filters ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedSections.filters && (
              <div className="px-4 pb-4 space-y-4">
                {/* Show Expired Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Show Expired</span>
                  <button
                    onClick={() => setShowExpired(!showExpired)}
                    className={`relative w-12 h-6 rounded-full transition-colors
                      ${showExpired ? "bg-mezo-primary" : "bg-white/20"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${showExpired ? "left-7" : "left-1"}`}
                    />
                  </button>
                </label>

                {/* Minimum Discount */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Minimum Discount: {minDiscount}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={minDiscount}
                    onChange={(e) => setMinDiscount(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-mezo-primary
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setCollectionFilter("all");
              setSortBy("discount");
              setShowExpired(false);
              setMinDiscount(0);
            }}
            className="w-full py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
          >
            Reset All Filters
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// Mobile filter button
export function FilterButton({ onClick, activeFilters }: { onClick: () => void; activeFilters: number }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium"
    >
      <Filter className="w-4 h-4" />
      Filters
      {activeFilters > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-mezo-primary text-black text-xs font-bold">
          {activeFilters}
        </span>
      )}
    </motion.button>
  );
}
