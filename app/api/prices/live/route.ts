/**
 * Live Prices API Route
 * 
 * GET /api/prices/live?instrumentIds=id1,id2,id3
 * 
 * Returns current prices from KV cache (fast, no DB writes)
 * Used for dashboard real-time updates
 * 
 * Features:
 * - Batch fetch (multiple instruments)
 * - KV cache only (60s TTL)
 * - No database writes
 * - Fast response (<50ms typical)
 * - Includes timestamp for "Stand: hh:mm" display
 */

import { getPrices } from '@/lib/prices/getPrice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const livePricesSchema = z.object({
  instrumentIds: z
    .string()
    .transform((val) => val.split(',').filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1).max(100)),
});

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate input
    const validation = livePricesSchema.safeParse({
      instrumentIds: searchParams.get('instrumentIds'),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { instrumentIds } = validation.data;

    // Fetch prices (uses KV cache, no DB writes)
    const pricesMap = await getPrices(instrumentIds, {
      skipDb: true, // Don't fallback to DB for live updates
      maxAge: 60,   // Accept 60s old cache (matching UI refresh)
    });

    // Transform to response format
    const prices = Array.from(pricesMap.entries()).map(([id, data]) => ({
      instrumentId: id,
      price: data.price,
      currency: data.currency,
      asOf: data.asOf,
      source: data.source,
      cacheLevel: data.cacheLevel,
    }));

    // Calculate freshness
    const now = Date.now();
    const oldestPrice = prices.reduce((oldest, p) => {
      const age = now - new Date(p.asOf).getTime();
      return age > oldest ? age : oldest;
    }, 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: prices.length,
      prices,
      meta: {
        oldestAgeSeconds: Math.round(oldestPrice / 1000),
        cacheHitRate: Math.round(
          (prices.filter((p) => p.cacheLevel === 'kv').length / prices.length) * 100
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching live prices:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
