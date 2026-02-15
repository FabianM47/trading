/**
 * Währungsumrechnung und ISIN-Lookup Service
 */

interface ExchangeRates {
  [currency: string]: number;
}

interface SymbolLookupResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

/**
 * Holt aktuelle Wechselkurse von der Exchange Rate API (kostenlos)
 * Alternative: Finnhub Forex API
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    // Verwende eine kostenlose Exchange Rate API
    // Alternative: https://api.exchangerate-api.com/v4/latest/EUR
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    
    if (!response.ok) {
      console.warn('Exchange rate API failed, using fallback rates');
      return getFallbackRates();
    }

    const data = await response.json();
    
    // Konvertiere zu EUR-Basis (Kehrwert, da API EUR als Basis hat)
    return {
      EUR: 1,
      USD: 1 / (data.rates.USD || 1.1),
      GBP: 1 / (data.rates.GBP || 0.85),
      CHF: 1 / (data.rates.CHF || 0.95),
      JPY: 1 / (data.rates.JPY || 160),
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return getFallbackRates();
  }
}

/**
 * Fallback Wechselkurse wenn API nicht verfügbar
 */
function getFallbackRates(): ExchangeRates {
  return {
    EUR: 1,
    USD: 0.92,   // 1 USD = 0.92 EUR (ungefähr)
    GBP: 1.17,   // 1 GBP = 1.17 EUR
    CHF: 1.05,   // 1 CHF = 1.05 EUR
    JPY: 0.0062, // 1 JPY = 0.0062 EUR
  };
}

/**
 * Konvertiert einen Preis in EUR
 */
export function convertToEUR(price: number, fromCurrency: string, exchangeRates: ExchangeRates): number {
  if (fromCurrency === 'EUR') return price;
  
  const rate = exchangeRates[fromCurrency];
  if (!rate) {
    console.warn(`No exchange rate for ${fromCurrency}, returning original price`);
    return price;
  }
  
  return price * rate;
}

/**
 * Cache für Exchange Rates (5 Minuten)
 */
let ratesCache: { rates: ExchangeRates; timestamp: number } | null = null;
const RATES_CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

export async function getCachedExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  if (ratesCache && (now - ratesCache.timestamp) < RATES_CACHE_DURATION) {
    return ratesCache.rates;
  }
  
  const rates = await getExchangeRates();
  ratesCache = { rates, timestamp: now };
  
  return rates;
}

/**
 * Sucht nach einem Symbol anhand der ISIN über Finnhub
 * Falls nicht gefunden, versuche andere Methoden
 */
export async function lookupSymbolByISIN(isin: string, apiKey: string): Promise<string | null> {
  try {
    // Methode 1: Finnhub Symbol Lookup
    // Leider unterstützt Finnhub Free Tier keine direkte ISIN-Suche
    // Wir verwenden eine Heuristik basierend auf dem ISIN-Ländercode
    
    const countryCode = isin.substring(0, 2);
    let symbol = await guessSymbolFromISIN(isin, countryCode, apiKey);
    
    if (symbol) {
      return symbol;
    }
    
    // Fallback: Verwende ISIN direkt (funktioniert manchmal)
    return isin;
  } catch (error) {
    console.error('Error looking up symbol:', error);
    return null;
  }
}

/**
 * Heuristik: Rate Symbol basierend auf ISIN und Ländercode
 */
async function guessSymbolFromISIN(isin: string, countryCode: string, apiKey: string): Promise<string | null> {
  // Für US-Aktien: Versuche bekannte Muster
  if (countryCode === 'US') {
    // Finnhub Symbol Search API
    try {
      const response = await fetch(`https://finnhub.io/api/v1/search?q=${isin}&token=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.length > 0) {
          // Nimm das erste Ergebnis das zur ISIN passt oder ein US-Symbol ist
          const match = data.result.find((r: any) => 
            r.symbol && !r.symbol.includes('.') && r.type === 'Common Stock'
          );
          if (match) {
            return match.symbol;
          }
        }
      }
    } catch (error) {
      console.error('Symbol search failed:', error);
    }
  }
  
  // Für deutsche Aktien: Füge .DE hinzu
  if (countryCode === 'DE') {
    try {
      const response = await fetch(`https://finnhub.io/api/v1/search?q=${isin}&token=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.length > 0) {
          const match = data.result.find((r: any) => 
            r.symbol && r.symbol.includes('.DE')
          );
          if (match) {
            return match.symbol;
          }
        }
      }
    } catch (error) {
      console.error('Symbol search failed:', error);
    }
  }
  
  return null;
}

/**
 * Cache für ISIN zu Symbol Mappings
 */
const isinToSymbolCache = new Map<string, string>();

export async function getCachedSymbolByISIN(isin: string, apiKey: string): Promise<string | null> {
  // Prüfe Cache
  if (isinToSymbolCache.has(isin)) {
    return isinToSymbolCache.get(isin)!;
  }
  
  // Lookup durchführen
  const symbol = await lookupSymbolByISIN(isin, apiKey);
  
  // Im Cache speichern
  if (symbol) {
    isinToSymbolCache.set(isin, symbol);
  }
  
  return symbol;
}
