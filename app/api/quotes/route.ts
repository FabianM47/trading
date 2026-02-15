import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';
import type { QuotesApiResponse, Quote, MarketIndex } from '@/types';

// In-Memory Cache für MVP
// Limitierung: Cache wird bei Serverless-Restart geleert
// Für Produktion: Redis, Vercel KV, oder andere persistente Cache-Lösung
interface CacheEntry {
  data: QuotesApiResponse;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

/**
 * GET /api/quotes?isins=ISIN1,ISIN2,...
 * 
 * Holt aktuelle Kurse für die angegebenen ISINs/Tickers
 * sowie die Markt-Indizes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isinsParam = searchParams.get('isins');
    
    // Parse ISINs
    const isins = isinsParam
      ? isinsParam.split(',').filter(Boolean)
      : [];

    // Cache prüfen
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      // Filter nur die angeforderten ISINs
      const filteredQuotes: Record<string, Quote> = {};
      for (const isin of isins) {
        if (cache.data.quotes[isin]) {
          filteredQuotes[isin] = cache.data.quotes[isin];
        }
      }

      return NextResponse.json({
        quotes: filteredQuotes,
        indices: cache.data.indices,
        timestamp: cache.timestamp,
        cached: true,
      } as QuotesApiResponse & { cached: boolean });
    }

    // Quotes und Indizes parallel fetchen
    const provider = getQuoteProvider();
    
    const [quotesMap, indices] = await Promise.all([
      provider.fetchBatch(isins),
      provider.fetchIndices(),
    ]);

    // Map zu Object konvertieren
    const quotes: Record<string, Quote> = {};
    quotesMap.forEach((quote, key) => {
      quotes[key] = quote;
    });

    const response: QuotesApiResponse = {
      quotes,
      indices,
      timestamp: now,
    };

    // Cache aktualisieren
    cache = {
      data: response,
      timestamp: now,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes/refresh
 * 
 * Leert den Cache und forciert einen Refresh
 */
export async function POST() {
  cache = null;
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
