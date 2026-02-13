/**
 * Price Service - Two-tier caching strategy
 * 
 * Strategy:
 * 1. Vercel KV - Hot cache for live quotes (TTL 60s)
 *    → Fast, frequently accessed data
 *    → Used for: Trade forms, portfolio valuation, real-time displays
 * 
 * 2. Postgres PriceSnapshot - Cold storage for history (persistent)
 *    → Historical data for charts, reporting, audits
 *    → Used for: Price history, performance analysis, tax reporting
 * 
 * Flow:
 * 1. Check KV cache (if fresh, return immediately)
 * 2. If KV miss, fetch from provider API
 * 3. Store in KV + async persist to Postgres
 * 4. Return to client
 * 
 * Background Job:
 * - Periodic snapshots (e.g., every 5 minutes)
 * - Save to Postgres for historical records
 */

import { db } from '@/db';
import { instruments, priceSnapshots } from '@/db/schema';
import { createFinnhubProvider } from '@/lib/services/finnhub-provider';
import type { StockQuote } from '@/lib/services/price-provider.interface';
import { kv } from '@vercel/kv';
import { desc, eq } from 'drizzle-orm';

// ============================================================================
// Configuration
// ============================================================================

const CACHE_CONFIG = {
  /** KV cache TTL in seconds - Short for real-time data */
  KV_TTL: 60,

  /** How long a KV cached price is considered "fresh" for live display */
  FRESH_THRESHOLD: 60,

  /** Maximum age for a DB snapshot to be considered recent */
  DB_RECENT_THRESHOLD: 300, // 5 minutes

  /** KV key prefix for price caches */
  KV_PREFIX: 'price:live:',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface PriceData {
  /** Current price */
  price: number;

  /** Currency (EUR, USD, etc.) */
  currency: string;

  /** When this price was captured */
  asOf: Date;

  /** Data source (Finnhub, TwelveData, etc.) */
  source: string;

  /** Additional quote data (optional) */
  quote?: StockQuote;

  /** Where this data came from */
  cacheLevel: 'kv' | 'db' | 'api';
}

export interface GetPriceOptions {
  /** Force fetch from API (skip cache) */
  forceFresh?: boolean;

  /** Skip database fallback (KV + API only) */
  skipDb?: boolean;

  /** Maximum age in seconds for cached data */
  maxAge?: number;
}

// ============================================================================
// Main Price Fetching Function
// ============================================================================

/**
 * Get current price for an instrument
 * 
 * Priority:
 * 1. Vercel KV cache (if fresh)
 * 2. Provider API (Finnhub)
 * 3. Postgres latest snapshot (fallback)
 * 
 * @param instrumentId - UUID of instrument
 * @param options - Fetching options
 * @returns Price data with cache level indicator
 */
export async function getPrice(
  instrumentId: string,
  options: GetPriceOptions = {}
): Promise<PriceData> {
  const {
    forceFresh = false,
    skipDb = false,
    maxAge = CACHE_CONFIG.FRESH_THRESHOLD,
  } = options;

  // Step 1: Try KV cache (unless force fresh)
  if (!forceFresh) {
    const cachedPrice = await getPriceFromKV(instrumentId, maxAge);
    if (cachedPrice) {
      return cachedPrice;
    }
  }

  // Step 2: Fetch from API provider
  try {
    const apiPrice = await fetchPriceFromAPI(instrumentId);

    // Store in both KV (hot) and DB (cold) asynchronously
    Promise.all([
      storePriceInKV(instrumentId, apiPrice),
      persistPriceSnapshot(instrumentId, apiPrice),
    ]).catch((err) => {
      console.error('Error storing price in caches:', err);
    });

    return {
      ...apiPrice,
      cacheLevel: 'api',
    };
  } catch (error) {
    console.error('Error fetching price from API:', error);

    // Step 3: Fallback to latest DB snapshot
    if (!skipDb) {
      const dbPrice = await getPriceFromDB(instrumentId);
      if (dbPrice) {
        console.warn(`Using DB fallback for instrument ${instrumentId}`);
        return dbPrice;
      }
    }

    // No data available
    throw new Error(
      `Failed to fetch price for instrument ${instrumentId}: ${error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get prices for multiple instruments (batch)
 * 
 * Optimized for portfolio valuation:
 * - Fetches all from KV first
 * - API calls only for missing/stale data
 * - Parallel API requests with rate limiting
 */
export async function getPrices(
  instrumentIds: string[],
  options: GetPriceOptions = {}
): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>();

  // Fetch all from cache in parallel
  const cachePromises = instrumentIds.map(async (id) => {
    try {
      const price = await getPriceFromKV(
        id,
        options.maxAge ?? CACHE_CONFIG.FRESH_THRESHOLD
      );
      if (price) {
        results.set(id, price);
      }
      return { id, found: !!price };
    } catch (error) {
      console.error(`Error fetching from KV for ${id}:`, error);
      return { id, found: false };
    }
  });

  const cacheResults = await Promise.all(cachePromises);
  const missingIds = cacheResults
    .filter((r) => !r.found)
    .map((r) => r.id);

  // Fetch missing from API (with rate limiting via provider)
  if (missingIds.length > 0) {
    const apiPromises = missingIds.map(async (id) => {
      try {
        const price = await getPrice(id, options);
        results.set(id, price);
      } catch (error) {
        console.error(`Error fetching price for ${id}:`, error);
      }
    });

    await Promise.all(apiPromises);
  }

  return results;
}

// ============================================================================
// KV Cache Functions
// ============================================================================

/**
 * Get price from Vercel KV cache
 */
async function getPriceFromKV(
  instrumentId: string,
  maxAge: number
): Promise<PriceData | null> {
  try {
    const key = `${CACHE_CONFIG.KV_PREFIX}${instrumentId}`;
    const cached = await kv.get<{
      price: number;
      currency: string;
      asOf: string;
      source: string;
      quote?: StockQuote;
    }>(key);

    if (!cached) {
      return null;
    }

    const asOf = new Date(cached.asOf);
    const ageSeconds = (Date.now() - asOf.getTime()) / 1000;

    // Check if cache is still fresh
    if (ageSeconds > maxAge) {
      return null;
    }

    return {
      price: cached.price,
      currency: cached.currency,
      asOf,
      source: cached.source,
      quote: cached.quote,
      cacheLevel: 'kv',
    };
  } catch (error) {
    console.error('Error reading from KV cache:', error);
    return null;
  }
}

/**
 * Store price in Vercel KV cache
 */
async function storePriceInKV(
  instrumentId: string,
  price: Omit<PriceData, 'cacheLevel'>
): Promise<void> {
  try {
    const key = `${CACHE_CONFIG.KV_PREFIX}${instrumentId}`;
    await kv.set(
      key,
      {
        price: price.price,
        currency: price.currency,
        asOf: price.asOf.toISOString(),
        source: price.source,
        quote: price.quote,
      },
      { ex: CACHE_CONFIG.KV_TTL }
    );
  } catch (error) {
    console.error('Error storing in KV cache:', error);
    // Don't throw - cache failures shouldn't break the flow
  }
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Get latest price from Postgres price_snapshots
 */
async function getPriceFromDB(instrumentId: string): Promise<PriceData | null> {
  try {
    const snapshot = await db.query.priceSnapshots.findFirst({
      where: eq(priceSnapshots.instrumentId, instrumentId),
      orderBy: [desc(priceSnapshots.snapshotAt)],
    });

    if (!snapshot) {
      return null;
    }

    return {
      price: parseFloat(snapshot.price),
      currency: snapshot.currency,
      asOf: snapshot.snapshotAt,
      source: snapshot.source,
      cacheLevel: 'db',
    };
  } catch (error) {
    console.error('Error reading from database:', error);
    return null;
  }
}

/**
 * Persist price snapshot to Postgres
 * This creates a historical record for charts, reporting, etc.
 */
async function persistPriceSnapshot(
  instrumentId: string,
  price: Omit<PriceData, 'cacheLevel'>
): Promise<void> {
  try {
    await db.insert(priceSnapshots).values({
      instrumentId,
      price: price.price.toString(),
      currency: price.currency,
      source: price.source,
      snapshotAt: price.asOf,
    }).onConflictDoNothing(); // Unique index on (instrumentId, snapshotAt)
  } catch (error) {
    console.error('Error persisting price snapshot:', error);
    // Don't throw - snapshot failures shouldn't break the flow
  }
}

// ============================================================================
// API Provider Functions
// ============================================================================

/**
 * Fetch price from external API provider (Finnhub)
 */
async function fetchPriceFromAPI(
  instrumentId: string
): Promise<Omit<PriceData, 'cacheLevel'>> {
  // Get instrument details (ISIN, symbol)
  const instrument = await db.query.instruments.findFirst({
    where: eq(instruments.id, instrumentId),
  });

  if (!instrument) {
    throw new Error(`Instrument not found: ${instrumentId}`);
  }

  // Initialize provider
  const provider = createFinnhubProvider();

  // Fetch quote (provider has retry logic + rate limiting)
  const quote = await provider.getQuote(instrument.isin || instrument.symbol);

  return {
    price: quote.price,
    currency: quote.currency,
    asOf: quote.asOf,
    source: provider.name,
    quote,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get price by ISIN (convenience wrapper)
 */
export async function getPriceByISIN(
  isin: string,
  options?: GetPriceOptions
): Promise<PriceData> {
  const instrument = await db.query.instruments.findFirst({
    where: eq(instruments.isin, isin),
  });

  if (!instrument) {
    throw new Error(`Instrument not found with ISIN: ${isin}`);
  }

  return getPrice(instrument.id, options);
}

/**
 * Get price by symbol (convenience wrapper)
 */
export async function getPriceBySymbol(
  symbol: string,
  options?: GetPriceOptions
): Promise<PriceData> {
  const instrument = await db.query.instruments.findFirst({
    where: eq(instruments.symbol, symbol),
  });

  if (!instrument) {
    throw new Error(`Instrument not found with symbol: ${symbol}`);
  }

  return getPrice(instrument.id, options);
}

/**
 * Clear KV cache for an instrument (useful for testing/debugging)
 */
export async function clearPriceCache(instrumentId: string): Promise<void> {
  const key = `${CACHE_CONFIG.KV_PREFIX}${instrumentId}`;
  await kv.del(key);
}
