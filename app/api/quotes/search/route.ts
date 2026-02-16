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

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        results: [],
        message: 'API key not configured',
      });
    }

    // Nutze Finnhub Symbol Search API
    const searchResponse = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`
    );

    if (!searchResponse.ok) {
      return NextResponse.json({
        results: [],
        message: 'Search API error',
      });
    }

    const searchData = await searchResponse.json();

    if (!searchData.result || searchData.result.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'Keine Ergebnisse gefunden',
      });
    }

    // Filtere und konvertiere Ergebnisse
    const results: SearchResult[] = [];
    const isISIN = query.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(query);
    
    for (const item of searchData.result.slice(0, 10)) { // Max 10 Ergebnisse
      // Überspringe wenn kein Symbol
      if (!item.symbol) continue;
      
      // Bevorzuge Common Stocks, aber erlaube auch andere Typen
      const result: SearchResult = {
        isin: isISIN ? query : undefined, // Behalte die ISIN wenn Query eine ISIN ist
        ticker: item.symbol,
        name: item.description || item.symbol,
        exchange: item.type || 'Unknown',
      };
      
      // Versuche aktuellen Kurs zu holen (optional, nicht blockierend)
      try {
        const provider = getQuoteProvider();
        const quote = await provider.fetchQuote(item.symbol);
        
        if (quote && quote.price > 0) {
          result.currentPrice = quote.price; // Bereits in EUR
          result.currency = 'EUR';
        }
      } catch (error) {
        // Ignoriere Fehler beim Quote-Abruf
        console.log(`Could not fetch quote for ${item.symbol}`);
      }
      
      results.push(result);
    }

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'Keine verwertbaren Ergebnisse gefunden',
      });
    }
    
    return NextResponse.json({
      results,
      fromFinnhub: true,
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
