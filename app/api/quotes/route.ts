import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';
import { fetchINGInstrumentHeader, extractINGPrice, shouldTryING } from '@/lib/ingQuoteProvider';
import { isCryptoSymbol, fetchCoingeckoBatch } from '@/lib/cryptoQuoteProvider';
import { shouldTryYahoo, fetchYahooBatch, fetchYahooIndices } from '@/lib/yahooQuoteProvider';
import type { QuotesApiResponse, Quote, MarketIndex } from '@/types';
import { z } from 'zod';

// Validation Schema
const IsinSchema = z.string()
  .regex(/^[A-Z0-9]{1,20}$/, 'Invalid ISIN/Ticker format')
  .max(20);

const QuerySchema = z.object({
  isins: z.string()
    .transform(str => str.split(',').filter(Boolean))
    .pipe(z.array(IsinSchema).max(50)), // Max 50 ISINs pro Request
});

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
    const isinsParam = searchParams.get('isins') || '';
    
    // Input Validation
    const { isins } = QuerySchema.parse({ isins: isinsParam });

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
    
    // Intelligente Asset-Aufteilung nach Provider
    const cryptoAssets = isins.filter(isin => isCryptoSymbol(isin));
    const ingAssets = isins.filter(isin => !isCryptoSymbol(isin) && shouldTryING(isin));
    const yahooAssets = isins.filter(isin => 
      !isCryptoSymbol(isin) && 
      !shouldTryING(isin) && 
      shouldTryYahoo(isin)
    );
    const finnhubAssets = isins.filter(isin => 
      !isCryptoSymbol(isin) && 
      !shouldTryING(isin) && 
      !shouldTryYahoo(isin)
    );
    
    // Fetch parallel von allen Quellen (inkl. Indizes von beiden Providern)
    const [cryptoQuotes, ingQuotes, yahooQuotes, finnhubQuotesMap, finnhubIndices, yahooIndices] = await Promise.all([
      fetchCoingeckoBatch(cryptoAssets),
      fetchINGQuotes(ingAssets),
      fetchYahooBatch(yahooAssets),
      provider.fetchBatch(finnhubAssets),
      provider.fetchIndices(),
      fetchYahooIndices(),
    ]);

    // Kombiniere Quotes von allen Quellen
    const quotes: Record<string, Quote> = {};
    
    // Crypto Quotes (Coingecko)
    cryptoQuotes.forEach((quote: Quote, key: string) => {
      quotes[key] = quote;
    });
    
    // ING Quotes
    ingQuotes.forEach((quote: Quote, key: string) => {
      quotes[key] = quote;
    });
    
    // Yahoo Quotes
    yahooQuotes.forEach((quote: Quote, key: string) => {
      quotes[key] = quote;
    });
    
    // Finnhub Quotes
    // Finnhub Quotes
    finnhubQuotesMap.forEach((quote: Quote, key: string) => {
      quotes[key] = quote;
    });

    // Kombiniere Indizes: Finnhub hat Priorität, Yahoo als Fallback
    const indices = mergeIndices(finnhubIndices, yahooIndices);

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
    // Validation Error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    // Generic Error
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

/**
 * Kombiniert Indizes von Finnhub und Yahoo
 * Finnhub hat Priorität, Yahoo als Fallback
 */
function mergeIndices(
  finnhubIndices: MarketIndex[],
  yahooIndices: Array<{ name: string; ticker: string; price: number; change: number }>
): MarketIndex[] {
  const indexMap = new Map<string, MarketIndex>();
  
  // Zuerst Yahoo-Indizes hinzufügen (als Fallback)
  yahooIndices.forEach(index => {
    if (index.price > 0) {
      indexMap.set(index.name, {
        name: index.name,
        ticker: index.ticker,
        price: index.price,
        change: index.change,
      });
    }
  });
  
  // Dann Finnhub-Indizes (überschreiben Yahoo wenn vorhanden)
  finnhubIndices.forEach(index => {
    if (index.price > 0) {
      indexMap.set(index.name, index);
    }
  });
  
  // Konvertiere zu Array und sortiere nach festgelegter Reihenfolge
  const desiredOrder = [
    'S&P 500',
    'MSCI World',
    'Nasdaq 100',
    'Dow Jones',
    'DAX 40',
    'Euro Stoxx 50',
    'Hang Seng',
  ];
  
  const result: MarketIndex[] = [];
  desiredOrder.forEach(name => {
    const index = indexMap.get(name);
    if (index) {
      result.push(index);
    }
  });
  
  return result;
}

/**
 * Holt Quotes von ING für eine Liste von ISINs
 */
async function fetchINGQuotes(isins: string[]): Promise<Map<string, Quote>> {
  const quotesMap = new Map<string, Quote>();
  
  if (isins.length === 0) {
    return quotesMap;
  }

  // Parallel fetchen (max 5 gleichzeitig um Server nicht zu überlasten)
  const batchSize = 5;
  for (let i = 0; i < isins.length; i += batchSize) {
    const batch = isins.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async (isin) => {
        try {
          const ingData = await fetchINGInstrumentHeader(isin);
          if (!ingData) return null;
          
          const price = extractINGPrice(ingData);
          if (!price || price <= 0) return null;
          
          const quote: Quote = {
            isin: isin,
            ticker: ingData.wkn || isin,
            price: Math.round(price * 100) / 100,
            currency: 'EUR', // ING liefert meist EUR
            timestamp: Date.now(),
          };
          
          return { isin, quote };
        } catch (error) {
          console.error(`Error fetching ING quote for ${isin}:`, error);
          return null;
        }
      })
    );
    
    // Sammle erfolgreiche Ergebnisse
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        quotesMap.set(result.value.isin, result.value.quote);
      }
    });
  }
  
  return quotesMap;
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
