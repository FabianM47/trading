/**
 * Price Snapshot Job - Background task to persist prices
 * 
 * Purpose:
 * - Create periodic snapshots of instrument prices
 * - Store in Postgres for historical records
 * - Enable price charts, performance tracking, tax reporting
 * 
 * Execution:
 * - Via Vercel Cron Jobs (Production): /api/cron/price-snapshots
 * - Via manual trigger (Development): Call savePriceSnapshots()
 * 
 * Strategy:
 * - Runs every 5-15 minutes (configurable)
 * - Fetches prices for all active instruments
 * - Uses rate limiting from provider (60 calls/min for Finnhub)
 * - Batches requests to avoid timeout
 * - Stores unique snapshots (instrumentId + timestamp)
 * 
 * Setup:
 * 1. Add to vercel.json:
 *    Cron config: path=/api/cron/price-snapshots, schedule=every 5 minutes
 * 
 * 2. Protect with CRON_SECRET in production
 */

import { db } from '@/db';
import { instruments, priceSnapshots, trades } from '@/db/schema';
import { isNotNull, sql } from 'drizzle-orm';
import { getPrice } from './getPrice';

// ============================================================================
// Configuration
// ============================================================================

const JOB_CONFIG = {
  /** Batch size for processing (prevent timeouts) */
  BATCH_SIZE: 50,

  /** Delay between batches in ms (rate limiting) */
  BATCH_DELAY: 1000,

  /** Maximum instruments to process per job run */
  MAX_INSTRUMENTS: 200,

  /** Timeout for entire job in ms */
  JOB_TIMEOUT: 50000, // 50 seconds (Vercel has 60s limit)
} as const;

// ============================================================================
// Types
// ============================================================================

export interface SnapshotJobResult {
  success: boolean;
  totalInstruments: number;
  successCount: number;
  errorCount: number;
  duration: number;
  errors: Array<{ instrumentId: string; error: string }>;
}

// ============================================================================
// Main Job Function
// ============================================================================

/**
 * Save price snapshots for all active instruments
 * 
 * Active = instruments that have trades or positions
 * 
 * @returns Job execution result
 */
export async function savePriceSnapshots(): Promise<SnapshotJobResult> {
  const startTime = Date.now();
  const errors: Array<{ instrumentId: string; error: string }> = [];
  let successCount = 0;
  let errorCount = 0;

  try {
    // Step 1: Get active instruments (those with trades)
    const activeInstruments = await getActiveInstruments();

    console.log(`[PriceSnapshot] Found ${activeInstruments.length} active instruments`);

    if (activeInstruments.length === 0) {
      return {
        success: true,
        totalInstruments: 0,
        successCount: 0,
        errorCount: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    }

    // Step 2: Process in batches (prevent timeout + respect rate limits)
    const batches = chunkArray(
      activeInstruments.slice(0, JOB_CONFIG.MAX_INSTRUMENTS),
      JOB_CONFIG.BATCH_SIZE
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      console.log(
        `[PriceSnapshot] Processing batch ${i + 1}/${batches.length} (${batch.length} instruments)`
      );

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map((instrumentId) => saveSingleSnapshot(instrumentId))
      );

      // Count results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          errors.push({
            instrumentId: batch[idx],
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Delay between batches (respect rate limits)
      if (i < batches.length - 1) {
        await sleep(JOB_CONFIG.BATCH_DELAY);
      }

      // Check timeout
      if (Date.now() - startTime > JOB_CONFIG.JOB_TIMEOUT) {
        console.warn('[PriceSnapshot] Job timeout approaching, stopping early');
        break;
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[PriceSnapshot] Completed: ${successCount} success, ${errorCount} errors in ${duration}ms`
    );

    return {
      success: errorCount === 0,
      totalInstruments: activeInstruments.length,
      successCount,
      errorCount,
      duration,
      errors,
    };
  } catch (error) {
    console.error('[PriceSnapshot] Fatal error:', error);

    return {
      success: false,
      totalInstruments: 0,
      successCount,
      errorCount,
      duration: Date.now() - startTime,
      errors: [
        {
          instrumentId: 'N/A',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Save snapshot for a single instrument
 */
async function saveSingleSnapshot(instrumentId: string): Promise<void> {
  try {
    // Get price (KV cache first, then API, then DB fallback)
    const priceData = await getPrice(instrumentId, {
      maxAge: 300, // 5 minutes is acceptable for snapshots
    });

    // Insert into database (unique constraint prevents duplicates)
    await db.insert(priceSnapshots).values({
      instrumentId,
      price: priceData.price.toString(),
      currency: priceData.currency,
      source: priceData.source,
      snapshotAt: priceData.asOf,
    }).onConflictDoNothing();

  } catch (error) {
    console.error(`[PriceSnapshot] Error for instrument ${instrumentId}:`, error);
    throw error;
  }
}

// ============================================================================
// Instrument Selection
// ============================================================================

/**
 * Get list of active instruments (those with trades or positions)
 * 
 * Strategy:
 * - Instruments that have at least one trade
 * - Instruments that have open positions
 * - Sort by most recent activity
 */
async function getActiveInstruments(): Promise<string[]> {
  try {
    // Query instruments with trades
    const result = await db
      .select({ id: instruments.id })
      .from(instruments)
      .innerJoin(trades, sql`${trades.instrumentId} = ${instruments.id}`)
      .groupBy(instruments.id)
      .orderBy(sql`MAX(${trades.executedAt}) DESC`);

    return result.map((r) => r.id);
  } catch (error) {
    console.error('[PriceSnapshot] Error fetching active instruments:', error);

    // Fallback: Get all instruments with ISIN (assuming they're tradeable)
    const result = await db
      .select({ id: instruments.id })
      .from(instruments)
      .where(isNotNull(instruments.isin))
      .limit(JOB_CONFIG.MAX_INSTRUMENTS);

    return result.map((r) => r.id);
  }
}

// ============================================================================
// Manual Snapshot Functions
// ============================================================================

/**
 * Save snapshot for specific instruments (manual trigger)
 * 
 * Use cases:
 * - Testing
 * - On-demand updates
 * - Initial seeding
 */
export async function saveSnapshotsForInstruments(
  instrumentIds: string[]
): Promise<SnapshotJobResult> {
  const startTime = Date.now();
  const errors: Array<{ instrumentId: string; error: string }> = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`[PriceSnapshot] Manual job for ${instrumentIds.length} instruments`);

  const results = await Promise.allSettled(
    instrumentIds.map((id) => saveSingleSnapshot(id))
  );

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      errorCount++;
      errors.push({
        instrumentId: instrumentIds[idx],
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  return {
    success: errorCount === 0,
    totalInstruments: instrumentIds.length,
    successCount,
    errorCount,
    duration: Date.now() - startTime,
    errors,
  };
}

/**
 * Get snapshot statistics (for monitoring/debugging)
 */
export async function getSnapshotStats(): Promise<{
  totalSnapshots: number;
  uniqueInstruments: number;
  oldestSnapshot: Date | null;
  newestSnapshot: Date | null;
  avgSnapshotsPerInstrument: number;
}> {
  try {
    const stats = await db
      .select({
        totalSnapshots: sql<number>`COUNT(*)::int`,
        uniqueInstruments: sql<number>`COUNT(DISTINCT ${priceSnapshots.instrumentId})::int`,
        oldestSnapshot: sql<Date | null>`MIN(${priceSnapshots.snapshotAt})`,
        newestSnapshot: sql<Date | null>`MAX(${priceSnapshots.snapshotAt})`,
      })
      .from(priceSnapshots);

    const result = stats[0];

    return {
      totalSnapshots: result.totalSnapshots,
      uniqueInstruments: result.uniqueInstruments,
      oldestSnapshot: result.oldestSnapshot,
      newestSnapshot: result.newestSnapshot,
      avgSnapshotsPerInstrument:
        result.uniqueInstruments > 0
          ? result.totalSnapshots / result.uniqueInstruments
          : 0,
    };
  } catch (error) {
    console.error('[PriceSnapshot] Error fetching stats:', error);
    throw error;
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
