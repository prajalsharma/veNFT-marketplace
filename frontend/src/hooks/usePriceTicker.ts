"use client";

/**
 * usePriceTicker — live USD prices for BTC, MEZO, and MUSD.
 *
 * Sources:
 *  - BTC:  CoinGecko (via /api/prices proxy — avoids CORS)
 *  - MEZO: CoinGecko (id: "mezo", ~$0.03)
 *  - MUSD: CoinGecko (id: "mezo-usd", pegged ~$1.00)
 *
 * Refreshes every 60 seconds. Proxy caches at edge for 60s.
 * All errors are silently swallowed — UI degrades to "—" gracefully.
 */

import { useState, useEffect, useCallback } from "react";

export interface TokenChanges {
  BTC: number | null;
  MEZO: number | null;
  MUSD: number | null;
}

export interface TokenPrices {
  BTC: number | null;
  MEZO: number | null;
  MUSD: number;   // always 1.00
  lastUpdated: number | null; // unix ms
  changes: TokenChanges; // 24h percent change per token (null when unavailable)
}

const REFRESH_INTERVAL_MS = 60_000;

const DEFAULT: TokenPrices = { BTC: null, MEZO: null, MUSD: 1.0, lastUpdated: null, changes: { BTC: null, MEZO: null, MUSD: null } };

// Uses a local Next.js API proxy (/api/prices) to avoid CoinGecko CORS blocks.
// The proxy fetches server-side and caches for 60s.
const PRICES_URL = "/api/prices";

export function usePriceTicker(): TokenPrices {
  const [prices, setPrices] = useState<TokenPrices>(DEFAULT);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(PRICES_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPrices({
        BTC:  data?.bitcoin?.usd     ?? null,
        MEZO: data?.mezo?.usd        ?? null,
        // mezo-usd is the on-chain stablecoin; fall back to 1.00 if not listed
        MUSD: data?.["mezo-usd"]?.usd ?? 1.0,
        lastUpdated: Date.now(),
        changes: {
          BTC:  data?.bitcoin?.usd_24h_change     ?? null,
          MEZO: data?.mezo?.usd_24h_change        ?? null,
          MUSD: data?.["mezo-usd"]?.usd_24h_change ?? null,
        },
      });
    } catch {
      // silently ignore — UI shows "—" when null
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return prices;
}

/** Format a USD price compactly: $105,234.50 or $0.0042 */
export function formatUSD(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 1)    return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}
