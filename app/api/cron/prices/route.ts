/**
 * Price Snapshot Cron Job API Route
 * 
 * Schedule: Every 15 minutes (configured in vercel.json)
 * 
 * POST /api/cron/prices
 * 
 * Features:
 * - Loads instruments from portfolios (positions + trades)
 * - Fetches quotes with concurrency control (max 10 parallel)
 * - Writes snapshots to database
 * - Returns comprehensive metrics
 * 
 * Security:
 * - Vercel Cron Secret (automatic in production)
 * - Custom CRON_SECRET environment variable
 * - Bearer token authentication for manual triggers
 * 
 * Metrics Logged:
 * - Total instruments processed
 * - Success/error counts
 * - Cache hit rate
 * - API call count
 * - Latency stats (avg, min, max)
 * - Job duration
 * - Batch count
 * - Throttle count
 */

import { executePriceSnapshotCron } from '@/lib/prices/cronJob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel maximum for cron jobs

// ============================================================================
// Authentication Helper
// ============================================================================

/**
 * Verify cron job authentication
 * 
 * In production:
 * - Vercel automatically sends x-vercel-cron-secret header
 * - OR accept custom CRON_SECRET via Authorization header
 * 
 * In development:
 * - Allow unauthenticated requests for testing
 */
function verifyCronAuth(request: NextRequest): {
  authorized: boolean;
  reason?: string;
} {
  // Development mode: Allow all requests
  if (process.env.NODE_ENV === 'development') {
    return { authorized: true };
  }

  // Production: Require authentication
  const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Check Vercel's automatic cron secret
  if (vercelCronSecret) {
    return { authorized: true };
  }

  // Check custom CRON_SECRET
  if (cronSecret) {
    if (!authHeader) {
      return {
        authorized: false,
        reason: 'Missing Authorization header',
      };
    }

    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return {
        authorized: false,
        reason: 'Invalid credentials',
      };
    }

    return { authorized: true };
  }

  // No authentication configured
  return {
    authorized: false,
    reason: 'No authentication method configured',
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /api/cron/prices
 * 
 * Main cron job endpoint - triggered by Vercel Cron
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Verify authentication
    const auth = verifyCronAuth(request);
    if (!auth.authorized) {
      console.warn(`[Cron:Prices:${requestId}] Unauthorized request: ${auth.reason}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: auth.reason || 'Authentication required',
        },
        { status: 401 }
      );
    }

    console.log(`[Cron:Prices:${requestId}] Starting cron job (POST)`);

    // Execute the job
    const metrics = await executePriceSnapshotCron();

    console.log(`[Cron:Prices:${requestId}] Job completed:`, {
      success: metrics.success,
      processed: metrics.processedInstruments,
      duration: `${metrics.duration}ms`,
    });

    // Return response based on success
    if (metrics.success) {
      return NextResponse.json({
        success: true,
        requestId,
        message: 'Price snapshots completed successfully',
        metrics: {
          // Instrument stats
          totalInstruments: metrics.totalInstruments,
          processedInstruments: metrics.processedInstruments,
          skippedInstruments: metrics.skippedInstruments,

          // Results
          successCount: metrics.successCount,
          errorCount: metrics.errorCount,

          // Performance
          cacheHitCount: metrics.cacheHitCount,
          apiCallCount: metrics.apiCallCount,
          cacheHitRate: metrics.processedInstruments > 0
            ? Math.round((metrics.cacheHitCount / metrics.processedInstruments) * 100)
            : 0,

          // Timing
          duration: metrics.duration,
          avgLatency: Math.round(metrics.avgLatency),
          maxLatency: metrics.maxLatency,
          minLatency: metrics.minLatency === Infinity ? 0 : metrics.minLatency,

          // Batching
          batchCount: metrics.batchCount,
          throttleCount: metrics.throttleCount,

          // Timestamps
          startTime: metrics.startTime,
          endTime: metrics.endTime,
        },
      });
    } else {
      // Partial success with errors
      return NextResponse.json({
        success: false,
        requestId,
        message: 'Price snapshots completed with errors',
        metrics: {
          totalInstruments: metrics.totalInstruments,
          processedInstruments: metrics.processedInstruments,
          successCount: metrics.successCount,
          errorCount: metrics.errorCount,
          cacheHitCount: metrics.cacheHitCount,
          apiCallCount: metrics.apiCallCount,
          duration: metrics.duration,
          avgLatency: Math.round(metrics.avgLatency),
        },
        errors: metrics.errors.slice(0, 20), // Return first 20 errors
      }, { status: 207 }); // 207 Multi-Status
    }
  } catch (error) {
    console.error(`[Cron:Prices:${requestId}] Fatal error:`, error);

    return NextResponse.json({
      success: false,
      requestId,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/prices
 * 
 * Manual trigger for testing/debugging
 * Requires authentication in production
 */
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Verify authentication
    const auth = verifyCronAuth(request);
    if (!auth.authorized) {
      console.warn(`[Cron:Prices:${requestId}] Unauthorized GET request: ${auth.reason}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: auth.reason || 'Authentication required',
        },
        { status: 401 }
      );
    }

    console.log(`[Cron:Prices:${requestId}] Starting cron job (GET - manual trigger)`);

    // Execute the job
    const metrics = await executePriceSnapshotCron();

    // Return detailed metrics (for debugging)
    return NextResponse.json({
      success: metrics.success,
      requestId,
      metrics: {
        // All metrics
        totalInstruments: metrics.totalInstruments,
        processedInstruments: metrics.processedInstruments,
        skippedInstruments: metrics.skippedInstruments,
        successCount: metrics.successCount,
        errorCount: metrics.errorCount,
        cacheHitCount: metrics.cacheHitCount,
        apiCallCount: metrics.apiCallCount,
        cacheHitRate: metrics.processedInstruments > 0
          ? Math.round((metrics.cacheHitCount / metrics.processedInstruments) * 100)
          : 0,
        duration: metrics.duration,
        avgLatency: Math.round(metrics.avgLatency),
        maxLatency: metrics.maxLatency,
        minLatency: metrics.minLatency === Infinity ? 0 : metrics.minLatency,
        batchCount: metrics.batchCount,
        throttleCount: metrics.throttleCount,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
      },
      errors: metrics.errors, // All errors for debugging
    });
  } catch (error) {
    console.error(`[Cron:Prices:${requestId}] Fatal error:`, error);

    return NextResponse.json({
      success: false,
      requestId,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
