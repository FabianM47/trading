/**
 * Stock Price API Route
 * 
 * GET /api/stocks/quote?symbol=AAPL
 * GET /api/stocks/quote?isin=US0378331005
 * 
 * Returns real-time stock price data.
 */

import { withRateLimit } from '@/lib/security/rate-limit-middleware';
import { createFinnhubProvider } from '@/lib/services/finnhub-provider';
import { PriceProviderError } from '@/lib/services/price-provider.interface';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// Request Validation
// ============================================================================

const quoteQuerySchema = z.object({
  symbol: z.string().optional(),
  isin: z.string().optional(),
}).refine((data) => data.symbol || data.isin, {
  message: 'Either symbol or isin must be provided',
});

// ============================================================================
// Route Handler
// ============================================================================

async function handleGetQuote(request: NextRequest) {
  try {
    // 1. Parse and validate query parameters
    const { searchParams } = request.nextUrl;
    const query = {
      symbol: searchParams.get('symbol') || undefined,
      isin: searchParams.get('isin') || undefined,
    };

    const validation = quoteQuerySchema.safeParse(query);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    // 2. Initialize price provider
    const provider = createFinnhubProvider();

    // 3. Fetch quote
    const identifier = query.symbol || query.isin!;
    const quote = await provider.getQuote(identifier);

    // 4. Return success response
    return NextResponse.json({
      success: true,
      data: quote,
    });

  } catch (error) {
    console.error('Quote fetch error:', error);

    // Handle PriceProviderError
    if (error instanceof PriceProviderError) {
      return NextResponse.json(
        {
          success: false,
          error: error.name,
          message: error.message,
          code: error.code,
          provider: error.provider,
        },
        { status: error.statusCode || 500 }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting (external API calls)
export const GET = withRateLimit(handleGetQuote, {
  type: 'EXTERNAL_API',
});
