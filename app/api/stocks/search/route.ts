/**
 * Stock Search API Route
 * 
 * GET /api/stocks/search?q=Apple
 * 
 * Search for stocks by name or symbol.
 */

import { withRateLimit } from '@/lib/security/rate-limit-middleware';
import { createFinnhubProvider } from '@/lib/services/finnhub-provider';
import { PriceProviderError } from '@/lib/services/price-provider.interface';
import { NextRequest, NextResponse } from 'next/server';

async function handleSearchStocks(request: NextRequest) {
  try {
    // 1. Get search query
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Search query must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    // 2. Initialize price provider
    const provider = createFinnhubProvider();

    // 3. Search stocks
    const results = await provider.searchStocks(query);

    // 4. Return results
    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });

  } catch (error) {
    console.error('Stock search error:', error);

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

// Apply rate limiting (search is expensive)
export const GET = withRateLimit(handleSearchStocks, {
  type: 'SEARCH',
});
