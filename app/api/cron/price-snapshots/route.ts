/**
 * Cron Job API Route - Price Snapshots
 * 
 * Purpose: Periodic background job to save price snapshots
 * 
 * Vercel Cron Configuration (vercel.json):
 * Add cron config with path and schedule
 * 
 * Schedule options:
 * - Every hour (0 hour)
 * - Every 5 minutes
 * - Daily at 9am UTC
 * 
 * Security:
 * - Protected by Vercel cron secret header
 * - Or custom CRON_SECRET environment variable
 */

import { savePriceSnapshots } from '@/lib/prices/snapshotJob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel max for cron jobs

/**
 * POST /api/cron/price-snapshots
 * 
 * Triggered by Vercel Cron or manual POST request
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (Vercel cron secret or custom secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require authentication
    if (process.env.NODE_ENV === 'production') {
      const vercelCronSecret = request.headers.get('x-vercel-cron-secret');

      if (!vercelCronSecret && !authHeader) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing authentication' },
          { status: 401 }
        );
      }

      // Verify custom secret if provided
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid secret' },
          { status: 401 }
        );
      }
    }

    console.log('[Cron] Starting price snapshot job...');

    // Run the job
    const result = await savePriceSnapshots();

    console.log('[Cron] Price snapshot job completed:', {
      success: result.success,
      successCount: result.successCount,
      errorCount: result.errorCount,
      duration: `${result.duration}ms`,
    });

    // Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Price snapshots saved successfully',
        stats: {
          totalInstruments: result.totalInstruments,
          successCount: result.successCount,
          errorCount: result.errorCount,
          duration: result.duration,
        },
      });
    } else {
      // Partial success (some errors)
      return NextResponse.json({
        success: false,
        message: 'Price snapshots completed with errors',
        stats: {
          totalInstruments: result.totalInstruments,
          successCount: result.successCount,
          errorCount: result.errorCount,
          duration: result.duration,
        },
        errors: result.errors.slice(0, 10), // Return first 10 errors
      }, { status: 207 }); // 207 Multi-Status
    }
  } catch (error) {
    console.error('[Cron] Fatal error in price snapshot job:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/price-snapshots
 * 
 * Manual trigger (for testing/debugging)
 * Requires authentication in production
 */
export async function GET(request: NextRequest) {
  try {
    // In production, require authentication
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;

      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Run job
    const result = await savePriceSnapshots();

    return NextResponse.json({
      success: result.success,
      stats: {
        totalInstruments: result.totalInstruments,
        successCount: result.successCount,
        errorCount: result.errorCount,
        duration: result.duration,
      },
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
