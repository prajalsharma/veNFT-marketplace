// Hourly USD price history from CoinGecko, for valuing past events at the
// price they happened at (the way Dune values trades).
//
// CoinGecko returns hourly points for ranges up to 90 days, so history is
// fetched in fixed 85-day windows. Windows that have closed never change and
// go into Next's shared data cache (only 200 responses are cached), so every
// instance and deploy reuses them instead of spending CoinGecko's small free
// rate limit. The window touching "now" refreshes hourly.

export type CoinId = "mezo" | "bitcoin" | "mezo-usd";

const HOUR = 3_600_000;
const CHUNK_SEC = 85 * 86_400;

export type Series = [number, number][];

async function window(coin: CoinId, from: number, now: number): Promise<Series> {
  const to = from + CHUNK_SEC;
  const closed = to < now - 3600;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coin}/market_chart/range?vs_currency=usd&from=${from}&to=${Math.min(to, now)}`,
    {
      headers: { Accept: "application/json", "User-Agent": "Vezo-Exchange/1.0" },
      ...(closed ? { cache: "force-cache" as const } : { next: { revalidate: 3600 } }),
    }
  );
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  return ((await res.json()) as { prices?: Series }).prices ?? [];
}

/** Hourly prices covering every timestamp given (unix seconds), sorted.
 *  Only the windows that contain a timestamp are fetched. */
export async function priceSeries(coin: CoinId, timestampsSec: number[]): Promise<Series> {
  if (timestampsSec.length === 0) return [];
  const now = Math.floor(Date.now() / 1000);
  // Aligned windows keep the same cache key across requests.
  const starts = [...new Set(timestampsSec.map((t) => Math.floor(t / CHUNK_SEC) * CHUNK_SEC))].sort((a, b) => a - b);
  const all: Series = [];
  for (const f of starts) all.push(...(await window(coin, f, now)));
  return all.sort((a, b) => a[0] - b[0]);
}

/** Price nearest to `ms`, or null if no point lies within 3 hours. */
export function priceAt(series: Series, ms: number): number | null {
  let lo = 0, hi = series.length - 1;
  if (hi < 0) return null;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid][0] < ms) lo = mid + 1;
    else hi = mid;
  }
  const near = [lo - 1, lo]
    .filter((i) => i >= 0 && i < series.length)
    .reduce((a, b) => (Math.abs(series[a][0] - ms) <= Math.abs(series[b][0] - ms) ? a : b));
  return Math.abs(series[near][0] - ms) <= 3 * HOUR ? series[near][1] : null;
}
