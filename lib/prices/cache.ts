/**
 * KV Cache Layer for Live Prices
 * 
 * Two-tier cache strategy:
 * 1. KV (Redis) - Hot cache for live quotes (TTL 60-120s)
 * 2. Provider API - On cache miss
 * 
 * NO database writes - purely in-memory caching
 * Database snapshots are REMOVED (no background persistence)
 */

import { kv } from '@/lib/kv';
import { getPriceProvider } from './provider';

// ============================================================================
// Configuration
// ============================================================================

const CACHE_CONFIG = {
  /** KV cache TTL in seconds */
  TTL: 60,

  /** KV key prefix */
  PREFIX: 'price:live:',

  /** Maximum age for considering cache "fresh" (seconds) */
  FRESH_THRESHOLD: 60,

  /** Provider API timeout (milliseconds) */
  PROVIDER_TIMEOUT: 10000,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface CachedPrice {
  /** Current price */
  price: number;

  /** Currency code */
  currency: string;

  /** Timestamp when captured */
  asOf: Date;

  /** Data source identifier */
  source: string;

  /** Optional: change data */
  change?: number;
  changePercent?: number;

  /** Optional: day range */
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface GetPriceFromCacheOptions {
  /** Force fetch from provider (skip cache) */
  forceFresh?: boolean;

  /** Maximum age for cached data (seconds) */
  maxAge?: number;
}

// ============================================================================
// KV Key Helpers
// ============================================================================

function getKVKey(isin: string): string {
  return `${CACHE_CONFIG.PREFIX}${isin}`;
}

// ============================================================================
// Read from Cache
// ============================================================================

/**
 * Get price from KV cache
 * Returns null if not found or expired
 */
export async function getPriceFromCache(
  isin: string,
  maxAge: number = CACHE_CONFIG.FRESH_THRESHOLD
): Promise<CachedPrice | null> {
  try {
    const key = getKVKey(isin);
    const cached = await kv.get<CachedPrice>(key);

    if (!cached) {
      return null;
    }

    // Check age
    const age = Date.now() - new Date(cached.asOf).getTime();
    if (age > maxAge * 1000) {
      // Expired, return null
      return null;
    }

    return cached;
  } catch (error) {
    console.error(`Error reading from KV cache for ${isin}:`, error);
    return null;
  }
}

/**
 * Get multiple prices from KV cache
 * Returns Map with found prices (missing ISINs are omitted)
 */
export async function getPricesFromCache(
  isins: string[],
  maxAge: number = CACHE_CONFIG.FRESH_THRESHOLD
): Promise<Map<string, CachedPrice>> {
  const results = new Map<string, CachedPrice>();

  // Batch get from KV
  const keys = isins.map(getKVKey);

  try {
    // KV doesn't have native batch get, so we use Promise.all
    const cached = await Promise.all(
      keys.map(key => kv.get<CachedPrice>(key))
    );

    // Filter and check age
    const now = Date.now();
    cached.forEach((price, index) => {
      if (price) {
        const age = now - new Date(price.asOf).getTime();
        if (age <= maxAge * 1000) {
          results.set(isins[index], price);
        }
      }
    });
  } catch (error) {
    console.error('Error batch reading from KV cache:', error);
  }

  return results;
}

// ============================================================================
// Write to Cache
// ============================================================================

/**
 * Store price in KV cache with TTL
 */
export async function setPriceInCache(
  isin: string,
  price: CachedPrice
): Promise<void> {
  try {
    const key = getKVKey(isin);
    await kv.set(key, price, {
      ex: CACHE_CONFIG.TTL, // Expire in 60 seconds
    });
  } catch (error) {
    console.error(`Error writing to KV cache for ${isin}:`, error);
    // Don't throw - cache write failure shouldn't break the app
  }
}

/**
 * Store multiple prices in KV cache
 */
export async function setPricesInCache(
  prices: Map<string, CachedPrice>
): Promise<void> {
  try {
    // Batch set
    await Promise.all(
      Array.from(prices.entries()).map(([isin, price]) =>
        setPriceInCache(isin, price)
      )
    );
  } catch (error) {
    console.error('Error batch writing to KV cache:', error);
  }
}

// ============================================================================
// Fetch from Provider (with cache)
// ============================================================================

/**
 * Get price with cache-aside pattern:
 * 1. Check KV cache
 * 2. On miss: fetch from provider
 * 3. Store in cache
 * 4. Return to caller
 */
export async function getPrice(
  isin: string,
  symbol: string,
  options: GetPriceFromCacheOptions = {}
): Promise<CachedPrice> {
  const {
    forceFresh = false,
    maxAge = CACHE_CONFIG.FRESH_THRESHOLD,
  } = options;

  // Step 1: Try cache (unless force fresh)
  if (!forceFresh) {
    const cached = await getPriceFromCache(isin, maxAge);
    if (cached) {
      return cached;
    }
  }

  // Step 2: Fetch from provider
  const provider = getPriceProvider();

  try {
    const quote = await provider.getQuote({ isin, symbol });

    // Transform to cached format
    const cachedPrice: CachedPrice = {
      price: quote.price,
      currency: quote.currency,
      asOf: quote.asOf,
      source: provider.name,
      change: quote.change,
      changePercent: quote.changePercent,
      high: quote.high,
      low: quote.low,
      open: quote.open,
      previousClose: quote.previousClose,
    };

    // Step 3: Store in cache (fire and forget)
    setPriceInCache(isin, cachedPrice).catch(err => {
      console.error('Failed to cache price:', err);
    });

    return cachedPrice;
  } catch (error) {
    throw new Error(
      `Failed to fetch price for ${symbol} (${isin}): ${error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get multiple prices with cache-aside pattern
 * Efficiently handles batch fetching with partial cache hits
 */
export async function getPrices(
  instruments: Array<{ isin: string; symbol: string }>,
  options: GetPriceFromCacheOptions = {}
): Promise<Map<string, CachedPrice>> {
  const results = new Map<string, CachedPrice>();

  if (instruments.length === 0) {
    return results;
  }

  const { forceFresh = false, maxAge = CACHE_CONFIG.FRESH_THRESHOLD } = options;

  // Step 1: Try cache (unless force fresh)
  let missingInstruments = instruments;

  if (!forceFresh) {
    const isins = instruments.map(i => i.isin);
    const cached = await getPricesFromCache(isins, maxAge);

    // Add cached results
    cached.forEach((price, isin) => {
      results.set(isin, price);
    });

    // Filter to only missing instruments
    missingInstruments = instruments.filter(i => !cached.has(i.isin));
  }

  // Step 2: Fetch missing from provider
  if (missingInstruments.length > 0) {
    const provider = getPriceProvider();

    try {
      // Use provider's batch method if available
      if (provider.getQuotes) {
        const quotes = await provider.getQuotes(missingInstruments);

        // Transform and cache
        const toCache = new Map<string, CachedPrice>();

        quotes.forEach((quote, isin) => {
          const cachedPrice: CachedPrice = {
            price: quote.price,
            currency: quote.currency,
            asOf: quote.asOf,
            source: provider.name,
            change: quote.change,
            changePercent: quote.changePercent,
            high: quote.high,
            low: quote.low,
            open: quote.open,
            previousClose: quote.previousClose,
          };

          results.set(isin, cachedPrice);
          toCache.set(isin, cachedPrice);
        });

        // Cache results (fire and forget)
        setPricesInCache(toCache).catch(err => {
          console.error('Failed to cache batch prices:', err);
        });
      } else {
        // Fallback: sequential fetch
        for (const instrument of missingInstruments) {
          try {
            const price = await getPrice(instrument.isin, instrument.symbol, {
              forceFresh: true, // Already checked cache
            });
            results.set(instrument.isin, price);
          } catch (error) {
            console.error(
              `Failed to fetch price for ${instrument.symbol}:`,
              error
            );
            // Continue with other instruments
          }
        }
      }
    } catch (error) {
      console.error('Error fetching batch prices from provider:', error);
    }
  }

  return results;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear price from cache
 */
export async function clearPriceCache(isin: string): Promise<void> {
  try {
    const key = getKVKey(isin);
    await kv.del(key);
  } catch (error) {
    console.error(`Error clearing cache for ${isin}:`, error);
  }
}

/**
 * Clear all prices from cache (use with caution!)
 */
export async function clearAllPriceCache(): Promise<void> {
  try {
    // Get all keys with prefix
    const keys = await kv.keys(`${CACHE_CONFIG.PREFIX}*`);

    if (keys.length > 0) {
      await Promise.all(keys.map(key => kv.del(key)));
      console.log(`Cleared ${keys.length} price cache entries`);
    }
  } catch (error) {
    console.error('Error clearing all price cache:', error);
  }
}
