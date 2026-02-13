/**
 * Price History API Route
 * 
 * GET /api/prices/history?instrumentId=uuid&from=2024-01-01&to=2024-12-31
 * 
 * Returns historical price snapshots from Postgres
 * Used for: Charts, performance analysis, tax reporting
 */

import { db } from '@/db';
import { instruments, priceSnapshots } from '@/db/schema';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// Validation
// ============================================================================

const historyQuerySchema = z.object({
  instrumentId: z.string().uuid().optional(),
  isin: z.string().length(12).optional(),
  symbol: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
}).refine(
  (data) => data.instrumentId || data.isin || data.symbol,
  { message: 'Either instrumentId, isin, or symbol is required' }
);

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const validation = historyQuerySchema.safeParse({
      instrumentId: searchParams.get('instrumentId'),
      isin: searchParams.get('isin'),
      symbol: searchParams.get('symbol'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      limit: searchParams.get('limit'),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { instrumentId, isin, symbol, from, to, limit } = validation.data;

    // Resolve instrument ID if ISIN or symbol provided
    let resolvedInstrumentId = instrumentId;

    if (!resolvedInstrumentId) {
      const instrument = await db.query.instruments.findFirst({
        where: isin
          ? eq(instruments.isin, isin)
          : eq(instruments.symbol, symbol!),
      });

      if (!instrument) {
        return NextResponse.json(
          { error: `Instrument not found: ${isin || symbol}` },
          { status: 404 }
        );
      }

      resolvedInstrumentId = instrument.id;
    }

    // Build where conditions
    const conditions = [
      eq(priceSnapshots.instrumentId, resolvedInstrumentId),
    ];

    if (from) {
      conditions.push(gte(priceSnapshots.snapshotAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(priceSnapshots.snapshotAt, new Date(to)));
    }

    // Fetch snapshots
    const snapshots = await db.query.priceSnapshots.findMany({
      where: and(...conditions),
      orderBy: [desc(priceSnapshots.snapshotAt)],
      limit,
      with: {
        instrument: {
          columns: {
            symbol: true,
            name: true,
            isin: true,
          },
        },
      },
    });

    // Return response
    return NextResponse.json({
      instrumentId: resolvedInstrumentId,
      instrument: snapshots[0]?.instrument || null,
      count: snapshots.length,
      from: from || snapshots[snapshots.length - 1]?.snapshotAt,
      to: to || snapshots[0]?.snapshotAt,
      snapshots: snapshots.map((s) => ({
        price: parseFloat(s.price),
        currency: s.currency,
        source: s.source,
        timestamp: s.snapshotAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching price history:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
