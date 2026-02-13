/**
 * Live Prices API Route (Client-Polling Architecture)
 * 
 * GET /api/prices?instrumentIds=id1,id2,id3
 * 
 * Features:
 * - Auth-protected (requires login)
 * - Batch fetching (up to 100 instruments)
 * - KV cache with 60s TTL
 * - NO database writes (pure client-triggered polling)
 * - Concurrency control (max 10 parallel API calls)
 * - Returns prices with change indicators for UI
 * 
 * Used by: Dashboard components with SWR polling
 */

import { db } from '@/db';
import { instruments } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import {
  fetchPricesBatch,
  validateInstruments,
  type InstrumentInput,
} from '@/lib/prices/fetchBatch';
import { inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

const pricesQuerySchema = z.object({
  instrumentIds: z
    .string()
    .transform((val) => val.split(',').filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1).max(100)),
});

// ============================================================================
// Response Types
// ============================================================================

interface PriceResponse {
  instrumentId: string;
  isin: string;
  symbol: string;
  price: number;
  currency: string;
  asOf: string;
  source: string;

  // Change indicators
  change?: number;
  changePercent?: number;
  isPositive?: boolean; // For UI color coding

  // Day range (optional)
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Validate query params
    const { searchParams } = new URL(request.url);

    const validation = pricesQuerySchema.safeParse({
      instrumentIds: searchParams.get('instrumentIds'),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'instrumentIds parameter is required (comma-separated UUIDs)',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { instrumentIds } = validation.data;

    // Step 3: Load instruments from database
    const instrumentRecords = await db
      .select({
        id: instruments.id,
        isin: instruments.isin,
        symbol: instruments.symbol,
        currency: instruments.currency,
        name: instruments.name,
      })
      .from(instruments)
      .where(inArray(instruments.id, instrumentIds));

    if (instrumentRecords.length === 0) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'No instruments found for provided IDs',
        },
        { status: 404 }
      );
    }

    // Step 4: Validate and prepare for batch fetch
    const instrumentInputs: InstrumentInput[] = instrumentRecords.map((inst) => ({
      id: inst.id,
      isin: inst.isin,
      symbol: inst.symbol,
      currency: inst.currency || undefined,
    }));

    const validInstruments = validateInstruments(instrumentInputs);

    if (validInstruments.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          message: 'No valid instruments to fetch prices for',
        },
        { status: 400 }
      );
    }

    // Step 5: Fetch prices (with cache)
    const result = await fetchPricesBatch(validInstruments, {
      maxAge: 60, // Accept 60s old cache (matches UI refresh)
    });

    // Step 6: Transform to response format
    const prices: PriceResponse[] = [];
    const errors: Array<{ instrumentId: string; error: string }> = [];

    result.prices.forEach((priceResult, instrumentId) => {
      if (priceResult.price) {
        const inst = instrumentRecords.find((i) => i.id === instrumentId);

        prices.push({
          instrumentId,
          isin: priceResult.isin,
          symbol: inst?.symbol || '',
          price: priceResult.price.price,
          currency: priceResult.price.currency,
          asOf: priceResult.price.asOf.toISOString(),
          source: priceResult.price.source,
          change: priceResult.price.change,
          changePercent: priceResult.price.changePercent,
          isPositive: (priceResult.price.change ?? 0) >= 0,
          high: priceResult.price.high,
          low: priceResult.price.low,
          open: priceResult.price.open,
          previousClose: priceResult.price.previousClose,
        });
      } else if (priceResult.error) {
        errors.push({
          instrumentId,
          error: priceResult.error,
        });
      }
    });

    // Step 7: Return response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: prices.length,
      prices,
      errors: errors.length > 0 ? errors : undefined,
      metrics: {
        total: result.metrics.total,
        success: result.metrics.success,
        failed: result.metrics.failed,
        cacheHits: result.metrics.cacheHits,
        apiCalls: result.metrics.apiCalls,
        cacheHitRate: Math.round(result.metrics.cacheHitRate),
        durationMs: result.metrics.durationMs,
      },
    });
  } catch (error) {
    console.error('Error in /api/prices:', error);

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
