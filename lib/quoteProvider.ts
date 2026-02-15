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
 * Real Quote Provider - kann später mit echtem API implementiert werden
 * Beispiel: Stooq, Yahoo Finance, Alpha Vantage, etc.
 */
export class RealQuoteProvider implements QuoteProvider {
  async fetchQuote(isinOrTicker: string): Promise<Quote | null> {
    // TODO: Implementierung mit echtem API
    // Beispiel: Stooq API
    // https://stooq.com/q/l/?s=${ticker}&f=sd2t2ohlcv&h&e=json
    
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
    // TODO: Implementierung mit echtem API
    const mockProvider = new MockQuoteProvider();
    return mockProvider.fetchIndices();
  }
}

/**
 * Singleton Instance - einfach austauschbar
 */
let providerInstance: QuoteProvider;

export function getQuoteProvider(): QuoteProvider {
  if (!providerInstance) {
    // Hier kann zwischen Mock und Real gewechselt werden
    providerInstance = new MockQuoteProvider();
    // providerInstance = new RealQuoteProvider();
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
