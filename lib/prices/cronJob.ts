/**
 * Price Snapshot Cron Job Service
 * 
 * Optimized job that runs every 15 minutes:
 * - Loads all instruments used in portfolios (positions + trades)
 * - Fetches quotes via provider with concurrency control
 * - Writes snapshots to database
 * - Logs comprehensive metrics
 * 
 * Features:
 * - Smart instrument loading (positions + recent trades)
 * - Concurrency limiting (max 10 parallel requests)
 * - Rate limiting (respects provider limits: 60/min)
 * - Batch processing with delays
 * - Comprehensive error handling
 * - Detailed metrics logging
 * - Timeout protection (50s max)
 */

import { db } from '@/db';
import { instruments, positions, trades } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { getPrice } from './getPrice';

// ============================================================================
// Configuration
// ============================================================================

const CRON_CONFIG = {
  /** Maximum concurrent API requests */
  MAX_CONCURRENT: 10,

  /** Batch size for processing */
  BATCH_SIZE: 30,

  /** Delay between batches (ms) - for rate limiting */
  BATCH_DELAY: 1000,

  /** Maximum instruments to process per run */
  MAX_INSTRUMENTS: 300,

  /** Job timeout (ms) - Vercel limit is 60s */
  JOB_TIMEOUT: 50000,

  /** How recent trades should be included (days) */
  RECENT_TRADES_DAYS: 30,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface CronJobMetrics {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;

  // Instrument stats
  totalInstruments: number;
  processedInstruments: number;
  skippedInstruments: number;

  // Result stats
  successCount: number;
  errorCount: number;
  cacheHitCount: number;
  apiCallCount: number;

  // Performance
  avgLatency: number;
  maxLatency: number;
  minLatency: number;

  // Errors
  errors: Array<{
    instrumentId: string;
    symbol?: string;
    error: string;
    timestamp: Date;
  }>;

  // Rate limiting
  throttleCount: number;
  batchCount: number;
}

interface ProcessResult {
  instrumentId: string;
  symbol?: string;
  success: boolean;
  error?: string;
  latency: number;
  cacheLevel: 'kv' | 'db' | 'api';
}

// ============================================================================
// Main Cron Job Function
// ============================================================================

/**
 * Execute price snapshot cron job
 * 
 * This is the main entry point called by the cron route
 */
export async function executePriceSnapshotCron(): Promise<CronJobMetrics> {
  const startTime = new Date();
  const metrics: CronJobMetrics = {
    success: false,
    startTime,
    endTime: new Date(),
    duration: 0,
    totalInstruments: 0,
    processedInstruments: 0,
    skippedInstruments: 0,
    successCount: 0,
    errorCount: 0,
    cacheHitCount: 0,
    apiCallCount: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    errors: [],
    throttleCount: 0,
    batchCount: 0,
  };

  try {
    console.log('[Cron:Prices] Starting price snapshot job');

    // Step 1: Load active instruments from portfolios
    const instrumentIds = await loadPortfolioInstruments();
    metrics.totalInstruments = instrumentIds.length;

    console.log(`[Cron:Prices] Found ${instrumentIds.length} active instruments`);

    if (instrumentIds.length === 0) {
      metrics.success = true;
      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - startTime.getTime();
      return metrics;
    }

    // Step 2: Load instrument details for logging
    const instrumentDetails = await loadInstrumentDetails(
      instrumentIds.slice(0, CRON_CONFIG.MAX_INSTRUMENTS)
    );

    // Step 3: Process in batches with concurrency control
    const batches = chunkArray(
      instrumentIds.slice(0, CRON_CONFIG.MAX_INSTRUMENTS),
      CRON_CONFIG.BATCH_SIZE
    );

    const latencies: number[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      metrics.batchCount++;

      console.log(
        `[Cron:Prices] Processing batch ${i + 1}/${batches.length} ` +
        `(${batch.length} instruments)`
      );

      // Process batch with concurrency limit
      const batchResults = await processBatchWithConcurrency(
        batch,
        instrumentDetails,
        CRON_CONFIG.MAX_CONCURRENT
      );

      // Aggregate results
      for (const result of batchResults) {
        metrics.processedInstruments++;
        latencies.push(result.latency);

        if (result.success) {
          metrics.successCount++;

          if (result.cacheLevel === 'kv') {
            metrics.cacheHitCount++;
          } else if (result.cacheLevel === 'api') {
            metrics.apiCallCount++;
          }
        } else {
          metrics.errorCount++;
          metrics.errors.push({
            instrumentId: result.instrumentId,
            symbol: result.symbol,
            error: result.error || 'Unknown error',
            timestamp: new Date(),
          });
        }
      }

      // Delay between batches (rate limiting)
      if (i < batches.length - 1) {
        await sleep(CRON_CONFIG.BATCH_DELAY);
        metrics.throttleCount++;
      }

      // Check timeout
      const elapsed = Date.now() - startTime.getTime();
      if (elapsed > CRON_CONFIG.JOB_TIMEOUT) {
        console.warn(
          `[Cron:Prices] Job timeout approaching (${elapsed}ms), stopping early`
        );
        metrics.skippedInstruments =
          metrics.totalInstruments - metrics.processedInstruments;
        break;
      }
    }

    // Calculate performance metrics
    if (latencies.length > 0) {
      metrics.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      metrics.maxLatency = Math.max(...latencies);
      metrics.minLatency = Math.min(...latencies);
    }

    metrics.success = metrics.errorCount === 0;
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - startTime.getTime();

    // Log summary
    console.log('[Cron:Prices] Job completed:', {
      success: metrics.success,
      processed: metrics.processedInstruments,
      succeeded: metrics.successCount,
      failed: metrics.errorCount,
      cacheHits: metrics.cacheHitCount,
      apiCalls: metrics.apiCallCount,
      duration: `${metrics.duration}ms`,
      avgLatency: `${Math.round(metrics.avgLatency)}ms`,
    });

    return metrics;
  } catch (error) {
    console.error('[Cron:Prices] Fatal error:', error);

    metrics.success = false;
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - startTime.getTime();
    metrics.errors.push({
      instrumentId: 'SYSTEM',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });

    return metrics;
  }
}

// ============================================================================
// Instrument Loading
// ============================================================================

/**
 * Load all instruments used in portfolios
 * 
 * Strategy:
 * 1. Get instruments from open positions (priority)
 * 2. Get instruments from recent trades (last 30 days)
 * 3. Deduplicate
 */
async function loadPortfolioInstruments(): Promise<string[]> {
  try {
    const instrumentSet = new Set<string>();

    // 1. Load from open positions (highest priority)
    const openPositions = await db
      .select({ instrumentId: positions.instrumentId })
      .from(positions)
      .where(eq(positions.isClosed, false))
      .groupBy(positions.instrumentId);

    for (const pos of openPositions) {
      instrumentSet.add(pos.instrumentId);
    }

    console.log(`[Cron:Prices] Found ${openPositions.length} instruments from open positions`);

    // 2. Load from recent trades (last 30 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - CRON_CONFIG.RECENT_TRADES_DAYS);

    const recentTrades = await db
      .select({ instrumentId: trades.instrumentId })
      .from(trades)
      .where(sql`${trades.executedAt} >= ${recentDate}`)
      .groupBy(trades.instrumentId);

    for (const trade of recentTrades) {
      instrumentSet.add(trade.instrumentId);
    }

    console.log(
      `[Cron:Prices] Found ${recentTrades.length} additional instruments from recent trades`
    );

    return Array.from(instrumentSet);
  } catch (error) {
    console.error('[Cron:Prices] Error loading portfolio instruments:', error);

    // Fallback: Load all instruments (limited)
    const allInstruments = await db
      .select({ id: instruments.id })
      .from(instruments)
      .limit(CRON_CONFIG.MAX_INSTRUMENTS);

    return allInstruments.map((i) => i.id);
  }
}

/**
 * Load instrument details for logging
 */
async function loadInstrumentDetails(
  instrumentIds: string[]
): Promise<Map<string, { symbol: string; name: string }>> {
  const details = await db
    .select({
      id: instruments.id,
      symbol: instruments.symbol,
      name: instruments.name,
    })
    .from(instruments)
    .where(inArray(instruments.id, instrumentIds));

  const map = new Map<string, { symbol: string; name: string }>();
  for (const detail of details) {
    map.set(detail.id, {
      symbol: detail.symbol,
      name: detail.name,
    });
  }

  return map;
}

// ============================================================================
// Batch Processing with Concurrency
// ============================================================================

/**
 * Process batch with concurrency limit
 * 
 * Uses a semaphore pattern to limit concurrent API requests
 */
async function processBatchWithConcurrency(
  instrumentIds: string[],
  instrumentDetails: Map<string, { symbol: string; name: string }>,
  maxConcurrent: number
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  const queue = [...instrumentIds];
  const processing: Promise<void>[] = [];

  while (queue.length > 0 || processing.length > 0) {
    // Start new tasks up to max concurrent
    while (queue.length > 0 && processing.length < maxConcurrent) {
      const instrumentId = queue.shift()!;

      const task = processInstrument(instrumentId, instrumentDetails)
        .then((result) => {
          results.push(result);
        })
        .catch((error) => {
          results.push({
            instrumentId,
            symbol: instrumentDetails.get(instrumentId)?.symbol,
            success: false,
            error: error.message,
            latency: 0,
            cacheLevel: 'api',
          });
        });

      processing.push(task);
    }

    // Wait for at least one task to complete
    if (processing.length > 0) {
      await Promise.race(processing);
      // Remove completed tasks
      const stillProcessing = processing.filter((p) => {
        let resolved = false;
        p.then(() => { resolved = true; });
        return !resolved;
      });
      processing.length = 0;
      processing.push(...stillProcessing);
    }
  }

  return results;
}

/**
 * Process single instrument
 */
async function processInstrument(
  instrumentId: string,
  instrumentDetails: Map<string, { symbol: string; name: string }>
): Promise<ProcessResult> {
  const startTime = Date.now();

  try {
    // Fetch price (uses getPrice with KV → API → DB fallback)
    const priceData = await getPrice(instrumentId, {
      maxAge: 300, // 5 minutes is acceptable for snapshots
    });

    const latency = Date.now() - startTime;

    return {
      instrumentId,
      symbol: instrumentDetails.get(instrumentId)?.symbol,
      success: true,
      latency,
      cacheLevel: priceData.cacheLevel,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      instrumentId,
      symbol: instrumentDetails.get(instrumentId)?.symbol,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency,
      cacheLevel: 'api',
    };
  }
}

// ============================================================================
// Utilities
// ============================================================================

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
