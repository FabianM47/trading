import type { Quote, MarketIndex, QuoteProvider } from '@/types';
import { getCachedExchangeRates, convertToEUR, getCachedSymbolByISIN } from './currencyService';

/**
 * Mock Quote Provider für Entwicklung und Demo
 * Generiert realistische, aber zufällige Kurse
 */
export class MockQuoteProvider implements QuoteProvider {
  private cache = new Map<string, Quote>();
  private baseIndices = [
    { name: 'S&P 500', ticker: 'SPY', basePrice: 530 },
    { name: 'MSCI World', ticker: 'URTH', basePrice: 140 },
    { name: 'Nasdaq 100', ticker: 'QQQ', basePrice: 460 },
    { name: 'Dow Jones', ticker: 'DIA', basePrice: 380 },
    { name: 'DAX 40', ticker: 'EWG', basePrice: 18500 },
    { name: 'Euro Stoxx 50', ticker: 'FEZ', basePrice: 4800 },
    { name: 'FTSE 100', ticker: 'ISF', basePrice: 8200 },
    { name: 'Nikkei 225', ticker: 'EWJ', basePrice: 38000 },
    { name: 'Hang Seng', ticker: 'EWH', basePrice: 19500 },
    { name: 'CAC 40', ticker: 'EWQ', basePrice: 7500 },
    { name: 'Swiss Market', ticker: 'EWL', basePrice: 11800 },
    { name: 'ASX 200', ticker: 'EWA', basePrice: 7900 },
    { name: 'Shanghai Comp', ticker: 'MCHI', basePrice: 3100 },
    { name: 'KOSPI', ticker: 'EWY', basePrice: 2600 },
    { name: 'Russell 2000', ticker: 'IWM', basePrice: 210 },
    { name: 'FTSE MIB', ticker: 'EWI', basePrice: 33500 },
    { name: 'TSX Composite', ticker: 'EWC', basePrice: 22000 },
  ];

  async fetchQuote(isinOrTicker: string): Promise<Quote | null> {
    // Simuliere Netzwerk-Delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cache prüfen
    if (this.cache.has(isinOrTicker)) {
      return this.cache.get(isinOrTicker)!;
    }

    // Mock-Daten für bekannte Beispiel-Aktien
    const mockData = this.getMockStockData(isinOrTicker);
    if (mockData) {
      const quote: Quote = {
        isin: mockData.isin,
        ticker: mockData.ticker,
        price: this.getRandomPrice(mockData.basePrice),
        currency: 'EUR',
        timestamp: Date.now(),
      };
      this.cache.set(isinOrTicker, quote);
      return quote;
    }

    return null;
  }

  async fetchBatch(identifiers: string[]): Promise<Map<string, Quote>> {
    const results = new Map<string, Quote>();

    for (const id of identifiers) {
      const quote = await this.fetchQuote(id);
      if (quote) {
        results.set(id, quote);
      }
    }

    return results;
  }

  async fetchIndices(): Promise<MarketIndex[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return this.baseIndices.map((index) => ({
      name: index.name,
      ticker: index.ticker,
      price: this.getRandomPrice(index.basePrice),
      change: this.getRandomChange(),
    }));
  }

  private getRandomPrice(basePrice: number): number {
    // +/- 5% Variation
    const variation = basePrice * 0.05;
    return Math.round((basePrice + (Math.random() - 0.5) * variation) * 100) / 100;
  }

  private getRandomChange(): number {
    // +/- 3% Change
    return Math.round((Math.random() - 0.5) * 6 * 100) / 100;
  }

  private getMockStockData(
    isinOrTicker: string
  ): { isin: string; ticker: string; basePrice: number } | null {
    // Mock-Datensätze für gängige Aktien
    const mockStocks: Record<string, { isin: string; ticker: string; basePrice: number }> = {
      // Apple
      US0378331005: { isin: 'US0378331005', ticker: 'AAPL', basePrice: 180 },
      AAPL: { isin: 'US0378331005', ticker: 'AAPL', basePrice: 180 },
      
      // Microsoft
      US5949181045: { isin: 'US5949181045', ticker: 'MSFT', basePrice: 420 },
      MSFT: { isin: 'US5949181045', ticker: 'MSFT', basePrice: 420 },
      
      // Tesla
      US88160R1014: { isin: 'US88160R1014', ticker: 'TSLA', basePrice: 250 },
      TSLA: { isin: 'US88160R1014', ticker: 'TSLA', basePrice: 250 },
      
      // Amazon
      US0231351067: { isin: 'US0231351067', ticker: 'AMZN', basePrice: 180 },
      AMZN: { isin: 'US0231351067', ticker: 'AMZN', basePrice: 180 },
      
      // Alphabet (Google)
      US02079K3059: { isin: 'US02079K3059', ticker: 'GOOGL', basePrice: 165 },
      GOOGL: { isin: 'US02079K3059', ticker: 'GOOGL', basePrice: 165 },
      
      // Nvidia
      US67066G1040: { isin: 'US67066G1040', ticker: 'NVDA', basePrice: 130 },
      NVDA: { isin: 'US67066G1040', ticker: 'NVDA', basePrice: 130 },
      
      // Meta (Facebook)
      US30303M1027: { isin: 'US30303M1027', ticker: 'META', basePrice: 580 },
      META: { isin: 'US30303M1027', ticker: 'META', basePrice: 580 },
      
      // SAP
      DE0007164600: { isin: 'DE0007164600', ticker: 'SAP', basePrice: 220 },
      SAP: { isin: 'DE0007164600', ticker: 'SAP', basePrice: 220 },
      
      // Siemens
      DE0007236101: { isin: 'DE0007236101', ticker: 'SIE', basePrice: 180 },
      SIE: { isin: 'DE0007236101', ticker: 'SIE', basePrice: 180 },
      
      // Allianz
      DE0008404005: { isin: 'DE0008404005', ticker: 'ALV', basePrice: 280 },
      ALV: { isin: 'DE0008404005', ticker: 'ALV', basePrice: 280 },
    };

    return mockStocks[isinOrTicker] || null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Finnhub Quote Provider - echte Aktienkurse über Finnhub API
 * API Dokumentation: https://finnhub.io/docs/api
 */
export class FinnhubQuoteProvider implements QuoteProvider {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Konvertiert ISIN oder Ticker zu Finnhub-Symbol (dynamisch)
   */
  private async toFinnhubSymbol(isinOrTicker: string): Promise<string> {
    // Wenn es wie eine ISIN aussieht (12 Zeichen, alphanumerisch)
    if (isinOrTicker.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(isinOrTicker)) {
      // Versuche dynamische ISIN-Suche
      const symbol = await getCachedSymbolByISIN(isinOrTicker, this.apiKey);
      if (symbol) {
        return symbol;
      }
    }

    // Ansonsten: Verwende als Ticker
    return isinOrTicker;
  }

  async fetchQuote(isinOrTicker: string): Promise<Quote | null> {
    try {
      const symbol = await this.toFinnhubSymbol(isinOrTicker);
      const url = `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Finnhub API error for ${symbol}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Finnhub gibt 0 zurück wenn Symbol nicht gefunden
      if (!data.c || data.c === 0) {
        console.warn(`No data from Finnhub for ${symbol}`);
        return null;
      }

      // Hole Währung für das Symbol
      const currency = await this.getCurrencyForSymbol(symbol);
      
      // Hole Wechselkurse
      const exchangeRates = await getCachedExchangeRates();
      
      // Konvertiere zu EUR
      const priceInEUR = convertToEUR(data.c, currency, exchangeRates);

      return {
        isin: isinOrTicker.length === 12 ? isinOrTicker : undefined,
        ticker: symbol,
        price: Math.round(priceInEUR * 100) / 100, // Runde auf 2 Dezimalstellen
        currency: 'EUR',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching quote for ${isinOrTicker}:`, error);
      return null;
    }
  }

  /**
   * Ermittelt die Währung für ein Symbol
   */
  private async getCurrencyForSymbol(symbol: string): Promise<string> {
    // Heuristik basierend auf Symbol-Suffix
    if (symbol.endsWith('.DE') || symbol.endsWith('.F') || symbol.endsWith('.BE')) {
      return 'EUR'; // Deutsche/Europäische Börsen
    }
    if (symbol.endsWith('.L') || symbol.endsWith('.LON')) {
      return 'GBP'; // London Stock Exchange
    }
    if (symbol.endsWith('.SW') || symbol.endsWith('.VX')) {
      return 'CHF'; // Schweizer Börsen
    }
    if (symbol.endsWith('.T') || symbol.endsWith('.TYO')) {
      return 'JPY'; // Tokyo Stock Exchange
    }
    
    // Für US-Aktien oder unbekannte: Hole von Finnhub Profile API
    try {
      const url = `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.currency) {
          return data.currency;
        }
      }
    } catch (error) {
      console.error(`Error fetching currency for ${symbol}:`, error);
    }
    
    // Fallback: USD für US-Aktien
    return 'USD';
  }

  async fetchBatch(identifiers: string[]): Promise<Map<string, Quote>> {
    const results = new Map<string, Quote>();

    // Finnhub Free Tier hat Rate Limits (60 calls/minute)
    // Für viele Symbole: sequentiell mit kleiner Verzögerung
    for (const id of identifiers) {
      const quote = await this.fetchQuote(id);
      if (quote) {
        results.set(id, quote);
      }
      
      // Kleiner Delay um Rate Limits zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  async fetchIndices(): Promise<MarketIndex[]> {
    try {
      // Verwende ETFs für die wichtigsten globalen Indizes
      const indices = [
        { name: 'S&P 500', symbol: 'SPY', description: 'SPDR S&P 500 ETF' },
        { name: 'MSCI World', symbol: 'URTH', description: 'iShares MSCI World ETF' },
        { name: 'Nasdaq 100', symbol: 'QQQ', description: 'Invesco QQQ Trust' },
        { name: 'Dow Jones', symbol: 'DIA', description: 'SPDR Dow Jones ETF' },
        { name: 'DAX 40', symbol: 'EWG', description: 'iShares MSCI Germany ETF' },
        { name: 'Euro Stoxx 50', symbol: 'FEZ', description: 'SPDR Euro Stoxx 50 ETF' },
        { name: 'Hang Seng', symbol: 'EWH', description: 'iShares MSCI Hong Kong ETF' },
      ];

      // Hole Wechselkurse für Umrechnung
      const exchangeRates = await getCachedExchangeRates();

      const results = await Promise.all(
        indices.map(async (index) => {
          try {
            const url = `${this.baseUrl}/quote?symbol=${index.symbol}&token=${this.apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.c && data.c !== 0) {
                // Alle diese ETFs sind in USD gehandelt
                const currency = 'USD';
                
                // Konvertiere zu EUR wenn nötig
                const priceInEUR = convertToEUR(data.c, currency, exchangeRates);
                
                return {
                  name: index.name,
                  ticker: index.symbol,
                  price: Math.round(priceInEUR * 100) / 100,
                  change: data.dp || 0, // percent change
                };
              }
            }
            
            // Keine Daten verfügbar
            console.warn(`No data available for ${index.name} (${index.symbol})`);
            return {
              name: index.name,
              ticker: index.symbol,
              price: 0,
              change: 0,
            };
          } catch (error) {
            console.error(`Error fetching index ${index.name}:`, error);
            return {
              name: index.name,
              ticker: index.symbol,
              price: 0,
              change: 0,
            };
          }
        })
      );

      return results;
    } catch (error) {
      console.error('Error fetching indices:', error);
      return [];
    }
  }
}

/**
 * Real Quote Provider - Legacy Fallback
 */
export class RealQuoteProvider implements QuoteProvider {
  async fetchQuote(isinOrTicker: string): Promise<Quote | null> {
    console.warn('RealQuoteProvider not implemented yet, falling back to mock');
    const mockProvider = new MockQuoteProvider();
    return mockProvider.fetchQuote(isinOrTicker);
  }

  async fetchBatch(identifiers: string[]): Promise<Map<string, Quote>> {
    const results = new Map<string, Quote>();

    for (const id of identifiers) {
      const quote = await this.fetchQuote(id);
      if (quote) {
        results.set(id, quote);
      }
    }

    return results;
  }

  async fetchIndices(): Promise<MarketIndex[]> {
    const mockProvider = new MockQuoteProvider();
    return mockProvider.fetchIndices();
  }
}

/**
 * Singleton Instance - automatische Provider-Auswahl basierend auf Environment
 */
let providerInstance: QuoteProvider;

export function getQuoteProvider(): QuoteProvider {
  if (!providerInstance) {
    // Wenn FINNHUB_API_KEY vorhanden ist, verwende Finnhub
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    
    if (finnhubApiKey) {
      console.log('Using FinnhubQuoteProvider with API key');
      providerInstance = new FinnhubQuoteProvider(finnhubApiKey);
    } else {
      console.log('No FINNHUB_API_KEY found, using MockQuoteProvider');
      providerInstance = new MockQuoteProvider();
    }
  }
  return providerInstance;
}

/**
 * Mock-Suchfunktion für Aktien
 * In einer echten App würde dies eine API abfragen
 */
export interface StockSearchResult {
  isin: string;
  ticker: string;
  name: string;
  exchange?: string;
  price?: number;
  currency?: string;
  source?: 'yahoo' | 'ing' | 'finnhub';
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  console.log(`🔍 Searching for: ${query}`);
  
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Parallele Suche bei allen verfügbaren Providern
    const [yahooResults, ingResults] = await Promise.allSettled([
      searchYahooStocks(query),
      searchINGStocks(query),
    ]);

    // Ergebnisse sammeln (auch wenn einzelne Provider fehlschlagen)
    const allResults: StockSearchResult[] = [];
    
    if (yahooResults.status === 'fulfilled' && yahooResults.value) {
      console.log(`✅ Yahoo: ${yahooResults.value.length} results`);
      allResults.push(...yahooResults.value);
    } else {
      console.warn(`⚠️ Yahoo search failed:`, yahooResults.status === 'rejected' ? yahooResults.reason : 'no results');
    }
    
    if (ingResults.status === 'fulfilled' && ingResults.value) {
      console.log(`✅ ING: ${ingResults.value.length} results`);
      allResults.push(...ingResults.value);
    } else {
      console.warn(`⚠️ ING search failed:`, ingResults.status === 'rejected' ? ingResults.reason : 'no results');
    }

    // Deduplizierung basierend auf Symbol/ISIN
    const deduped = deduplicateResults(allResults);
    
    console.log(`📊 Total results after deduplication: ${deduped.length}`);
    
    // Sortierung: ING Ergebnisse (deutsche Derivate) zuerst, dann nach Name
    return deduped.sort((a, b) => {
      // ING Ergebnisse (deutsche Derivate) bevorzugen
      if (a.source === 'ing' && b.source !== 'ing') return -1;
      if (a.source !== 'ing' && b.source === 'ing') return 1;
      
      // Dann alphabetisch nach Name
      return a.name.localeCompare(b.name);
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    return [];
  }
}

function deduplicateResults(results: StockSearchResult[]): StockSearchResult[] {
  const seen = new Map<string, StockSearchResult>();
  
  for (const result of results) {
    // Deduplizierungs-Key: ISIN oder Symbol (ohne Exchange-Suffix)
    const key = result.isin || result.ticker.split('.')[0];
    
    // Wenn noch nicht vorhanden ODER wenn ING-Quelle (bevorzugt für deutsche Derivate)
    if (!seen.has(key) || result.source === 'ing') {
      seen.set(key, result);
    }
  }
  
  return Array.from(seen.values());
}

async function searchYahooStocks(query: string): Promise<StockSearchResult[]> {
  try {
    // Yahoo API über unsere API-Route (vermeidet CORS-Probleme)
    const response = await fetch(
      `/api/quotes/search?query=${encodeURIComponent(query)}&provider=yahoo`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((item: any) => ({
      isin: item.isin || '',
      ticker: item.ticker,
      name: item.name,
      exchange: item.exchange,
      price: item.currentPrice,
      currency: item.currency,
      source: 'yahoo' as const,
    }));
  } catch (error) {
    console.error('Yahoo search error:', error);
    return [];
  }
}

async function searchINGStocks(query: string): Promise<StockSearchResult[]> {
  try {
    // ING API über unsere API-Route (vermeidet CORS-Probleme)
    const response = await fetch(
      `/api/quotes/search?query=${encodeURIComponent(query)}&provider=ing`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((item: any) => ({
      isin: item.isin || '',
      ticker: item.ticker || item.wkn || item.isin || '',
      name: item.name || item.isin,
      exchange: item.exchange || 'ING',
      price: item.currentPrice || item.price,
      currency: item.currency || 'EUR',
      source: 'ing' as const,
    }));
  } catch (error) {
    console.error('ING search error:', error);
    return [];
  }
}
