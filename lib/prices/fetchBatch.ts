/**
 * Batch Price Fetching with Concurrency Control
 * 
 * Fetches prices for multiple instruments efficiently:
 * - Parallel processing with concurrency limit
 * - Cache-aware (uses cache.ts layer)
 * - Error handling per instrument
 * - Metrics tracking
 * 
 * Used by: /app/api/prices/route.ts
 */

import pLimit from 'p-limit';
import { getPrice, type CachedPrice, type GetPriceFromCacheOptions } from './cache';

// ============================================================================
// Configuration
// ============================================================================

const BATCH_CONFIG = {
  /** Max concurrent API calls */
  MAX_CONCURRENT: 10,

  /** Max instruments per request */
  MAX_INSTRUMENTS: 100,

  /** Delay between batches (ms) - for rate limiting */
  BATCH_DELAY: 100,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface InstrumentInput {
  /** Instrument UUID */
  id: string;

  /** ISIN code */
  isin: string;

  /** Trading symbol */
  symbol: string;

  /** Currency (for reference) */
  currency?: string;
}

export interface PriceResult {
  /** Instrument UUID */
  instrumentId: string;

  /** ISIN code */
  isin: string;

  /** Price data (if successful) */
  price?: CachedPrice;

  /** Error message (if failed) */
  error?: string;

  /** Whether this was a cache hit */
  cached: boolean;
}

export interface BatchFetchMetrics {
  /** Total instruments requested */
  total: number;

  /** Successfully fetched */
  success: number;

  /** Failed to fetch */
  failed: number;

  /** Cache hits */
  cacheHits: number;

  /** API calls made */
  apiCalls: number;

  /** Duration in milliseconds */
  durationMs: number;

  /** Cache hit rate (%) */
  cacheHitRate: number;
}

export interface BatchFetchResult {
  /** Price results per instrument */
  prices: Map<string, PriceResult>;

  /** Metrics */
  metrics: BatchFetchMetrics;
}

// ============================================================================
// Main Batch Fetch Function
// ============================================================================

/**
 * Fetch prices for multiple instruments with concurrency control
 * 
 * Features:
 * - Concurrent fetching (max 10 parallel)
 * - Per-instrument error handling (one failure doesn't break batch)
 * - Cache awareness
 * - Metrics tracking
 * 
 * @param instruments - Array of instruments to fetch
 * @param options - Cache options
 * @returns Batch results with metrics
 */
export async function fetchPricesBatch(
  instruments: InstrumentInput[],
  options: GetPriceFromCacheOptions = {}
): Promise<BatchFetchResult> {
  const startTime = Date.now();
  const prices = new Map<string, PriceResult>();

  let cacheHits = 0;
  let apiCalls = 0;
  let success = 0;
  let failed = 0;

  // Validate input
  if (instruments.length === 0) {
    return {
      prices,
      metrics: {
        total: 0,
        success: 0,
        failed: 0,
        cacheHits: 0,
        apiCalls: 0,
        durationMs: 0,
        cacheHitRate: 0,
      },
    };
  }

  // Limit to max instruments
  const limitedInstruments = instruments.slice(0, BATCH_CONFIG.MAX_INSTRUMENTS);

  if (instruments.length > BATCH_CONFIG.MAX_INSTRUMENTS) {
    console.warn(
      `Batch fetch limited to ${BATCH_CONFIG.MAX_INSTRUMENTS} instruments ` +
      `(${instruments.length} requested)`
    );
  }

  // Create concurrency limiter
  const limit = pLimit(BATCH_CONFIG.MAX_CONCURRENT);

  // Fetch all prices concurrently (with limit)
  const fetchPromises = limitedInstruments.map((instrument) =>
    limit(async () => {
      try {
        // Track if this will be a cache hit by pre-checking
        // (This is optional optimization - cache layer will handle it)
        const price = await getPrice(instrument.isin, instrument.symbol, options);

        const result: PriceResult = {
          instrumentId: instrument.id,
          isin: instrument.isin,
          price,
          cached: true, // Assume cached if fast (<50ms would indicate cache)
        };

        prices.set(instrument.id, result);
        success++;

        // Track cache vs API (heuristic: if asOf is very recent, likely from API)
        const age = Date.now() - new Date(price.asOf).getTime();
        if (age < 5000) {
          // Fresh data (<5s old) - likely from API
          apiCalls++;
        } else {
          cacheHits++;
        }

        return result;
      } catch (error) {
        const result: PriceResult = {
          instrumentId: instrument.id,
          isin: instrument.isin,
          error: error instanceof Error ? error.message : 'Unknown error',
          cached: false,
        };

        prices.set(instrument.id, result);
        failed++;

        console.error(
          `Failed to fetch price for ${instrument.symbol} (${instrument.isin}):`,
          error
        );

        return result;
      }
    })
  );

  // Wait for all fetches
  await Promise.all(fetchPromises);

  const durationMs = Date.now() - startTime;
  const cacheHitRate = limitedInstruments.length > 0
    ? (cacheHits / limitedInstruments.length) * 100
    : 0;

  return {
    prices,
    metrics: {
      total: limitedInstruments.length,
      success,
      failed,
      cacheHits,
      apiCalls,
      durationMs,
      cacheHitRate,
    },
  };
}

// ============================================================================
// Simplified Single Fetch
// ============================================================================

/**
 * Fetch single instrument price (convenience wrapper)
 */
export async function fetchPrice(
  instrument: InstrumentInput,
  options: GetPriceFromCacheOptions = {}
): Promise<PriceResult> {
  try {
    const price = await getPrice(instrument.isin, instrument.symbol, options);

    return {
      instrumentId: instrument.id,
      isin: instrument.isin,
      price,
      cached: true,
    };
  } catch (error) {
    return {
      instrumentId: instrument.id,
      isin: instrument.isin,
      error: error instanceof Error ? error.message : 'Unknown error',
      cached: false,
    };
  }
}

// ============================================================================
// Helper: Filter Valid Instruments
// ============================================================================

/**
 * Validate and filter instruments for batch fetch
 * Removes duplicates and invalid entries
 */
export function validateInstruments(
  instruments: InstrumentInput[]
): InstrumentInput[] {
  const seen = new Set<string>();
  const valid: InstrumentInput[] = [];

  for (const instrument of instruments) {
    // Check required fields
    if (!instrument.id || !instrument.isin || !instrument.symbol) {
      console.warn('Skipping invalid instrument:', instrument);
      continue;
    }

    // Check duplicates (by ISIN)
    if (seen.has(instrument.isin)) {
      console.warn(`Duplicate ISIN detected: ${instrument.isin}`);
      continue;
    }

    seen.add(instrument.isin);
    valid.push(instrument);
  }

  return valid;
}
