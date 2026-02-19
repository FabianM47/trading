import { NextRequest, NextResponse } from 'next/server';
import { fetchBatchWithWaterfall, fetchIndicesWithWaterfall } from '@/lib/smartQuoteProvider';
import type { QuotesApiResponse, Quote } from '@/types';
import { z } from 'zod';

// Validation Schema
// Erlaubt ISINs, Tickers und Crypto-Symbole mit diversen Formaten
// z.B.: DE000FD96Y64, AAPL, BTC-USD, PPFD.SG:1, ^GDAXI
const IsinSchema = z.string()
  .regex(/^[A-Z0-9\.\-\^:_]+$/, 'Invalid ISIN/Ticker format')
  .min(1)
  .max(30); // Erhöht für längere Crypto-Symbole

const QuerySchema = z.object({
  isins: z.string()
    .default('')
    .transform(str => str.split(',').filter(Boolean))
    .pipe(z.array(IsinSchema).max(50).default([])), // Max 50 ISINs pro Request
  force: z.string()
    .optional()
    .default('false')
    .transform(val => val === 'true'),
});

/**
 * GET /api/quotes?isins=ISIN1,ISIN2,...
 * 
 * Holt aktuelle Kurse für die angegebenen ISINs/Tickers
 * sowie die Markt-Indizes
 * 
 * Nutzt Smart Provider mit:
 * - LRU Cache (5 Minuten)
 * - Rate Limiting
 * - Waterfall Strategy (Provider nacheinander)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isinsParam = searchParams.get('isins') || '';
    const forceParam = searchParams.get('force') || undefined;
    
    // Input Validation
    const { isins, force } = QuerySchema.parse({ isins: isinsParam, force: forceParam });

    // Fetch Quotes mit Smart Provider (Waterfall + Caching)
    const quotesMap = await fetchBatchWithWaterfall(isins, force);
    
    // Konvertiere Map zu Object
    const quotes: Record<string, Quote> = {};
    quotesMap.forEach((quote, key) => {
      quotes[key] = quote;
    });

    // Fetch Indizes (gecached)
    const indicesList = await fetchIndicesWithWaterfall(force);

    const response: QuotesApiResponse = {
      quotes,
      indices: indicesList,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    // Validation Error
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorMessage = firstError 
        ? `${firstError.path.join('.')}: ${firstError.message}`
        : 'Invalid input';
      
      console.error('Validation error in /api/quotes:', errorMessage, error.errors);
      
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: errorMessage,
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    // Generic Error
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes', message: String(error) },
      { status: 500 }
    );
  }
}