/**
 * Price Cache System
 * Stores last known good prices in localStorage so when API/edge functions fail,
 * the app displays cached prices with a "Last updated X minutes ago" indicator
 * instead of showing $0.00 or crashing.
 */

const CACHE_KEY = 'digiwell_price_cache';
const CACHE_TIMESTAMP_KEY = 'digiwell_price_cache_timestamp';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max cache age

export interface CachedPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: string;
  source: string;
  timestamp: number;
}

export interface PriceCacheData {
  prices: Record<string, CachedPrice>;
  lastUpdated: number;
}

/**
 * Save prices to localStorage cache
 */
export function cachePrices(prices: Record<string, any>): void {
  try {
    const cacheData: PriceCacheData = {
      prices: {},
      lastUpdated: Date.now(),
    };

    Object.entries(prices).forEach(([key, data]) => {
      if (data && typeof data === 'object') {
        const price = safeNum(data.price);
        // Only cache if price is valid (> 0)
        if (price > 0) {
          cacheData.prices[key] = {
            symbol: data.symbol || key,
            name: data.name || key,
            price,
            change: safeNum(data.change),
            changePercent: safeNum(data.changePercent),
            category: data.category || 'other',
            source: data.source || 'Cached',
            timestamp: data.timestamp || Date.now(),
          };
        }
      }
    });

    if (Object.keys(cacheData.prices).length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData.prices));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, cacheData.lastUpdated.toString());
    }
  } catch (e) {
    console.warn('[PriceCache] Failed to cache prices:', e);
  }
}

/**
 * Get cached prices from localStorage
 */
export function getCachedPrices(): PriceCacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const lastUpdated = parseInt(timestamp, 10);
    const age = Date.now() - lastUpdated;

    // Don't use cache older than 24 hours
    if (age > CACHE_MAX_AGE_MS) {
      clearPriceCache();
      return null;
    }

    const prices = JSON.parse(cached);
    return { prices, lastUpdated };
  } catch (e) {
    console.warn('[PriceCache] Failed to read cache:', e);
    return null;
  }
}

/**
 * Get a single cached price by symbol
 */
export function getCachedPrice(symbol: string): CachedPrice | null {
  const cache = getCachedPrices();
  if (!cache) return null;
  return cache.prices[symbol] || cache.prices[symbol.toUpperCase()] || null;
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('[PriceCache] Failed to clear cache:', e);
  }
}

/**
 * Get cache age as human-readable string
 */
export function getCacheAge(): string | null {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;

    const lastUpdated = parseInt(timestamp, 10);
    const ageMs = Date.now() - lastUpdated;
    
    if (ageMs < 60000) return 'just now';
    if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)} min ago`;
    if (ageMs < 86400000) return `${Math.floor(ageMs / 3600000)} hours ago`;
    return `${Math.floor(ageMs / 86400000)} days ago`;
  } catch (e) {
    return null;
  }
}

/**
 * Check if cache is stale (older than 5 minutes)
 */
export function isCacheStale(): boolean {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return true;
    return Date.now() - parseInt(timestamp, 10) > 5 * 60 * 1000;
  } catch (e) {
    return true;
  }
}

/**
 * Safe number conversion helper
 */
function safeNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val);
}

/**
 * Default fallback prices when no cache exists and API fails
 */
export const FALLBACK_PRICES: Record<string, CachedPrice> = {
  BRENT: { symbol: 'BRENT', name: 'Brent Crude Oil', price: 82.50, change: 0.45, changePercent: 0.55, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  WTI: { symbol: 'WTI', name: 'WTI Crude Oil', price: 78.20, change: 0.32, changePercent: 0.41, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  NATGAS: { symbol: 'NATGAS', name: 'Natural Gas', price: 2.85, change: -0.03, changePercent: -1.04, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  GOLD: { symbol: 'GOLD', name: 'Gold (XAU)', price: 2650.00, change: 12.50, changePercent: 0.47, category: 'metals', source: 'Fallback', timestamp: Date.now() },
  SILVER: { symbol: 'SILVER', name: 'Silver (XAG)', price: 31.50, change: 0.25, changePercent: 0.80, category: 'metals', source: 'Fallback', timestamp: Date.now() },
  COPPER: { symbol: 'COPPER', name: 'Copper', price: 4.15, change: 0.02, changePercent: 0.48, category: 'metals', source: 'Fallback', timestamp: Date.now() },
  PLATINUM: { symbol: 'PLATINUM', name: 'Platinum', price: 1020.00, change: -5.00, changePercent: -0.49, category: 'metals', source: 'Fallback', timestamp: Date.now() },
  LITHIUM: { symbol: 'LITHIUM', name: 'Lithium Carbonate', price: 12500.00, change: 50.00, changePercent: 0.40, category: 'minerals', source: 'Fallback', timestamp: Date.now() },
  PMS: { symbol: 'PMS', name: 'Premium Motor Spirit', price: 0.92, change: 0.01, changePercent: 1.10, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  AGO: { symbol: 'AGO', name: 'Automotive Gas Oil', price: 0.88, change: -0.01, changePercent: -1.13, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  JET_FUEL: { symbol: 'JET_FUEL', name: 'Aviation Fuel (Jet A-1)', price: 2.45, change: 0.03, changePercent: 1.24, category: 'oil', source: 'Fallback', timestamp: Date.now() },
  LPG: { symbol: 'LPG', name: 'Liquefied Petroleum Gas', price: 0.65, change: 0.00, changePercent: 0.00, category: 'oil', source: 'Fallback', timestamp: Date.now() },
};
