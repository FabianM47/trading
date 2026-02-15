import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';
import { getCachedExchangeRates, convertToEUR } from '@/lib/currencyService';

interface SearchResult {
  isin?: string;
  ticker: string;
  name: string;
  currentPrice?: number;
  currency?: string;
  exchange?: string;
}

/**
 * GET /api/quotes/search?query=QUERY
 * 
 * Sucht nach Aktien über ISIN oder Ticker und liefert Details + aktuellen Kurs in EUR
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        message: 'Query too short',
      });
    }

    const provider = getQuoteProvider();
    
    // Versuche direkt als ISIN/Ticker zu suchen
    const quote = await provider.fetchQuote(query);
    
    if (quote && quote.price > 0) {
      // Erfolgreiche Suche - Quote ist bereits in EUR konvertiert
      const result: SearchResult = {
        isin: query.length === 12 ? query : undefined,
        ticker: quote.ticker || query,
        name: await getStockNameFromAPI(quote.ticker || query),
        currentPrice: quote.price, // Bereits in EUR
        currency: 'EUR', // Immer EUR
      };
      
      return NextResponse.json({
        results: [result],
        fromFinnhub: true,
      });
    }
    
    // Keine Daten von Finnhub - leeres Ergebnis
    return NextResponse.json({
      results: [],
      message: 'Keine Aktie mit dieser ISIN/Ticker gefunden',
    });
    
  } catch (error) {
    console.error('Error searching quotes:', error);
    return NextResponse.json(
      { 
        results: [],
        error: 'Fehler bei der Suche' 
      },
      { status: 500 }
    );
  }
}

/**
 * Holt den Aktiennamen über Finnhub Profile API
 */
async function getStockNameFromAPI(symbol: string): Promise<string> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return getFallbackStockName(symbol);
    }

    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.name) {
        return data.name;
      }
    }
  } catch (error) {
    console.error(`Error fetching stock name for ${symbol}:`, error);
  }
  
  return getFallbackStockName(symbol);
}

/**
 * Fallback für bekannte Aktiennamen
 */
function getFallbackStockName(symbol: string): string {
  const knownNames: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'TSLA': 'Tesla Inc.',
    'AMZN': 'Amazon.com Inc.',
    'GOOGL': 'Alphabet Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.',
    'CAT': 'Caterpillar Inc.',
  };
  
  return knownNames[symbol] || symbol;
}
