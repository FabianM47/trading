import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';
import { fetchINGInstrumentHeader, extractINGPrice } from '@/lib/ingQuoteProvider';
import { searchCoingeckoCrypto, fetchCoingeckoPriceById } from '@/lib/cryptoQuoteProvider';
import { searchYahooSymbol, fetchYahooQuote } from '@/lib/yahooQuoteProvider';

interface SearchResult {
  isin?: string;
  ticker: string;
  name: string;
  currentPrice?: number;
  currency?: string;
  exchange?: string;
  source: 'Coingecko' | 'ING' | 'Yahoo' | 'Finnhub';
  relevance: number; // Für Sortierung: 0-100
}

/**
 * GET /api/quotes/search?query=QUERY&provider=yahoo|ing|finnhub|coingecko
 * 
 * Durchsucht einen spezifischen Provider (statt alle parallel)
 * Funktioniert mit: ISIN, Ticker (AAPL), Namen (Apple), Crypto (Bitcoin)
 * 
 * Reihenfolge: Yahoo (1) → ING (2) → Finnhub (3) → Coingecko (4)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const provider = searchParams.get('provider'); // Optional: spezifischer Provider
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        message: 'Query too short',
      });
    }

    const isISIN = query.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(query);

    // Sammle alle erfolgreichen Ergebnisse
    const allResults: SearchResult[] = [];

    // 🎯 SCHRITTWEISE SUCHE: Nur einen Provider abfragen
    if (provider) {
      // Spezifischer Provider
      switch (provider.toLowerCase()) {
        case 'yahoo':
          const yahooResults = await searchYahoo(query, isISIN);
          allResults.push(...yahooResults);
          break;
        case 'ing':
          const ingResults = await searchING(query, isISIN);
          allResults.push(...ingResults);
          break;
        case 'finnhub':
          const finnhubResults = await searchFinnhub(query, isISIN);
          allResults.push(...finnhubResults);
          break;
        case 'coingecko':
          const cryptoResults = await searchCrypto(query);
          allResults.push(...cryptoResults);
          break;
        default:
          return NextResponse.json({
            results: [],
            message: 'Unknown provider',
          }, { status: 400 });
      }
    } else {
      // Kein Provider angegeben: Default = Yahoo (erster Provider)
      const yahooResults = await searchYahoo(query, isISIN);
      allResults.push(...yahooResults);
    }

    if (allResults.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'Keine Ergebnisse gefunden',
        provider: provider || 'yahoo',
      });
    }

    // Dedupliziere zuerst (verhindert doppelte Einträge)
    const uniqueResults = deduplicateResults(allResults);
    
    // 🎯 INTELLIGENTE SORTIERUNG (2-stufig):
    // 1. Priorität: Hat aktuellen Kurs? (Ja = sofort verwendbar)
    // 2. Priorität: Relevanz-Score (100 = beste Match)
    //
    // Beispiel:
    //   [{ relevance: 100, price: null }, { relevance: 70, price: 150 }]
    //   → Ergebnis mit price: 150 kommt ZUERST (auch wenn niedrigere Relevanz)
    const sortedResults = uniqueResults.sort((a, b) => {
      // Prüfe ob aktueller Kurs vorhanden
      const aHasPrice = a.currentPrice && a.currentPrice > 0 ? 1 : 0;
      const bHasPrice = b.currentPrice && b.currentPrice > 0 ? 1 : 0;
      
      // Stufe 1: Ergebnisse MIT Kurs kommen zuerst
      if (aHasPrice !== bHasPrice) {
        return bHasPrice - aHasPrice; // Mit Preis zuerst
      }
      
      // Stufe 2: Innerhalb gleicher Preis-Kategorie nach Relevanz sortieren
      return b.relevance - a.relevance;
    });

    // Limitiere auf Top 15 Ergebnisse
    const topResults = sortedResults.slice(0, 15);

    return NextResponse.json({
      results: topResults,
      provider: provider || 'yahoo',
      hasResults: allResults.length > 0,
      totalResults: allResults.length,
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

/**
 * Sucht nach Kryptowährungen (Coingecko)
 */
async function searchCrypto(query: string): Promise<SearchResult[]> {
  try {
    const cryptoResults = await searchCoingeckoCrypto(query);
    
    if (!cryptoResults || cryptoResults.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    
    // Hole Preise für Top 10 Ergebnisse
    for (const crypto of cryptoResults.slice(0, 10)) {
      const quote = await fetchCoingeckoPriceById(crypto.id, crypto.symbol);
      
      // Berechne Relevanz basierend auf Position in Suchergebnissen
      const relevance = 100 - (cryptoResults.indexOf(crypto) * 5);
      
      results.push({
        ticker: crypto.symbol,
        name: crypto.name,
        currentPrice: quote?.price,
        currency: 'EUR',
        exchange: 'Cryptocurrency',
        source: 'Coingecko',
        relevance,
      });
    }
    
    return results;
  } catch (error) {
    console.log('Coingecko search failed:', error);
    return [];
  }
}

/**
 * Sucht bei ING Wertpapiere (unterstützt ISIN und Freitext-Suche)
 */
async function searchING(query: string, isISIN: boolean): Promise<SearchResult[]> {
  try {
    // Wenn ISIN: direkter Lookup
    if (isISIN) {
      const ingData = await fetchINGInstrumentHeader(query);
      if (!ingData) {
        return [];
      }

      const price = extractINGPrice(ingData);
      
      if (!price || price <= 0) {
        return [];
      }

      return [{
        isin: query,
        ticker: ingData.wkn || query,
        name: ingData.name || 'Wertpapier',
        currentPrice: price,
        currency: ingData.currency || 'EUR',
        exchange: 'ING Wertpapiere',
        source: 'ING',
        relevance: 95, // Hohe Relevanz bei exakter ISIN-Suche
      }];
    }
    
    // Freitext-Suche über ING Search API
    const searchUrl = `https://component-api.wertpapiere.ing.de/api/v1/components/search/stocks?searchTerm=${encodeURIComponent(query)}&pageNumber=0&pageSize=20`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log('ING search API returned:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.resultList || data.resultList.length === 0) {
      return [];
    }

    // Konvertiere ING-Ergebnisse zu SearchResult Format
    return data.resultList.map((item: any, index: number) => ({
      isin: item.isin || '',
      ticker: item.wkn || item.isin || '',
      name: item.name || item.isin,
      currentPrice: item.price || undefined,
      currency: item.currency || 'EUR',
      exchange: 'ING Wertpapiere',
      source: 'ING' as const,
      relevance: 90 - (index * 3), // Erste Ergebnisse haben höhere Relevanz
    }));
  } catch (error) {
    console.log('ING search failed:', error);
    return [];
  }
}

/**
 * Sucht bei Yahoo Finance (Global)
 */
async function searchYahoo(query: string, isISIN: boolean): Promise<SearchResult[]> {
  try {
    const yahooResults = await searchYahooSymbol(query);
    
    if (!yahooResults || yahooResults.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    
    // Hole Preise für Top 10 Ergebnisse
    for (const yahooStock of yahooResults.slice(0, 10)) {
      const quote = await fetchYahooQuote(yahooStock.symbol);
      
      // Höhere Relevanz für exakte ISIN-Matches
      const relevance = isISIN ? 90 : 80 - (yahooResults.indexOf(yahooStock) * 3);
      
      results.push({
        isin: isISIN ? query : undefined,
        ticker: yahooStock.symbol,
        name: yahooStock.name,
        currentPrice: quote?.price,
        currency: quote?.currency || 'EUR',
        exchange: yahooStock.exchange || 'Yahoo',
        source: 'Yahoo',
        relevance,
      });
    }
    
    return results;
  } catch (error) {
    console.log('Yahoo search failed:', error);
    return [];
  }
}

/**
 * Sucht bei Finnhub (US-Aktien)
 */
async function searchFinnhub(query: string, isISIN: boolean): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return [];
    }

    const searchResponse = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!searchResponse.ok) {
      return [];
    }

    const searchData = await searchResponse.json();

    if (!searchData.result || searchData.result.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    
    for (const item of searchData.result.slice(0, 10)) {
      if (!item.symbol) continue;
      
      // Berechne Relevanz
      const relevance = 70 - (searchData.result.indexOf(item) * 2);
      
      const result: SearchResult = {
        isin: isISIN ? query : undefined,
        ticker: item.symbol,
        name: item.description || item.symbol,
        exchange: item.type || 'Stock',
        source: 'Finnhub',
        relevance,
        currency: 'EUR',
      };
      
      // Versuche Preis zu holen (nicht blockierend)
      try {
        const provider = getQuoteProvider();
        const quote = await provider.fetchQuote(item.symbol);
        
        if (quote && quote.price > 0) {
          result.currentPrice = quote.price;
        }
      } catch (error) {
        // Ignoriere Fehler
      }
      
      results.push(result);
    }

    return results;
  } catch (error) {
    console.log('Finnhub search failed:', error);
    return [];
  }
}

/**
 * Dedupliziert Ergebnisse basierend auf Ticker oder ISIN
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  
  for (const result of results) {
    // Verwende ISIN als primären Key, sonst Ticker
    const key = result.isin || result.ticker.toLowerCase();
    
    // Behalte das Ergebnis mit der höchsten Relevanz
    const existing = seen.get(key);
    if (!existing || result.relevance > existing.relevance) {
      seen.set(key, result);
    }
  }
  
  return Array.from(seen.values());
}
