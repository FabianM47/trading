import type { Quote, MarketIndex, QuoteProvider } from '@/types';

/**
 * Mock Quote Provider für Entwicklung und Demo
 * Generiert realistische, aber zufällige Kurse
 */
export class MockQuoteProvider implements QuoteProvider {
  private cache = new Map<string, Quote>();
  private baseIndices = [
    { name: 'S&P 500', ticker: '^GSPC', basePrice: 5800 },
    { name: 'Nasdaq 100', ticker: '^NDX', basePrice: 20500 },
    { name: 'DAX', ticker: '^GDAXI', basePrice: 21000 },
    { name: 'Euro Stoxx 50', ticker: '^STOXX50E', basePrice: 5200 },
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
   * Konvertiert ISIN oder Ticker zu Finnhub-Symbol
   * Finnhub verwendet z.B. "AAPL" für US-Aktien, "SAP.DE" für deutsche Aktien
   */
  private toFinnhubSymbol(isinOrTicker: string): string {
    // Mapping für bekannte ISINs zu Finnhub-Symbolen
    const isinToSymbol: Record<string, string> = {
      // US Aktien
      'US0378331005': 'AAPL',
      'US5949181045': 'MSFT',
      'US88160R1014': 'TSLA',
      'US0231351067': 'AMZN',
      'US02079K3059': 'GOOGL',
      'US67066G1040': 'NVDA',
      'US30303M1027': 'META',
      // Deutsche Aktien (mit .DE Suffix für Xetra)
      'DE0007164600': 'SAP',
      'DE0007236101': 'SIE.DE',
      'DE0008404005': 'ALV.DE',
      'DE0005140008': 'DTE.DE',
      'DE0008469008': 'VOW3.DE',
      'DE0005557508': 'DPW.DE',
    };

    // Wenn ISIN bekannt ist, verwende Mapping
    if (isinToSymbol[isinOrTicker]) {
      return isinToSymbol[isinOrTicker];
    }

    // Ansonsten: Falls es schon ein Ticker ist, verwende direkt
    // Für deutsche Tickers könnte man automatisch .DE anfügen
    return isinOrTicker;
  }

  async fetchQuote(isinOrTicker: string): Promise<Quote | null> {
    try {
      const symbol = this.toFinnhubSymbol(isinOrTicker);
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

      return {
        isin: isinOrTicker.length === 12 ? isinOrTicker : undefined,
        ticker: symbol,
        price: data.c, // current price
        currency: symbol.endsWith('.DE') ? 'EUR' : 'USD',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching quote for ${isinOrTicker}:`, error);
      return null;
    }
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
      const indices = [
        { name: 'S&P 500', symbol: '^GSPC' },
        { name: 'Nasdaq 100', symbol: '^NDX' },
        { name: 'DAX', symbol: '^GDAXI' },
        { name: 'Euro Stoxx 50', symbol: '^STOXX50E' },
      ];

      const results = await Promise.all(
        indices.map(async (index) => {
          try {
            const url = `${this.baseUrl}/quote?symbol=${index.symbol}&token=${this.apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.c && data.c !== 0) {
                return {
                  name: index.name,
                  ticker: index.symbol,
                  price: data.c,
                  change: data.dp || 0, // percent change
                };
              }
            }
            
            // Keine Daten verfügbar
            console.warn(`No data available for ${index.name}`);
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
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  // Simuliere Netzwerk-Delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const mockDatabase: StockSearchResult[] = [
    { isin: 'US0378331005', ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
    { isin: 'US5949181045', ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
    { isin: 'US88160R1014', ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
    { isin: 'US0231351067', ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
    { isin: 'US02079K3059', ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
    { isin: 'US67066G1040', ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
    { isin: 'US30303M1027', ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
    { isin: 'DE0007164600', ticker: 'SAP', name: 'SAP SE', exchange: 'XETRA' },
    { isin: 'DE0007236101', ticker: 'SIE', name: 'Siemens AG', exchange: 'XETRA' },
    { isin: 'DE0008404005', ticker: 'ALV', name: 'Allianz SE', exchange: 'XETRA' },
    { isin: 'DE0005140008', ticker: 'DTE', name: 'Deutsche Telekom AG', exchange: 'XETRA' },
    { isin: 'DE0008469008', ticker: 'VOW3', name: 'Volkswagen AG', exchange: 'XETRA' },
    { isin: 'DE0005557508', ticker: 'DPW', name: 'Deutsche Post AG', exchange: 'XETRA' },
  ];

  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  return mockDatabase.filter(
    (stock) =>
      stock.name.toLowerCase().includes(lowerQuery) ||
      stock.ticker.toLowerCase().includes(lowerQuery) ||
      stock.isin.toLowerCase().includes(lowerQuery)
  );
}
