/**
 * Yahoo Finance Quote Provider
 * 
 * Kostenlose Aktienkurse von Yahoo Finance
 * - Keine API-Key erforderlich
 * - Weltweite Aktien, ETFs, Indizes
 * - Deutsche Aktien über XETRA (.DE)
 * - Realtime oder 15min delayed
 */

import type { Quote } from '@/types';

interface YahooQuoteResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice?: number;
        currency?: string;
        symbol?: string;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: number[];
        }>;
      };
    }>;
    error?: any;
  };
}

/**
 * Konvertiert ISIN zu Yahoo Finance Symbol
 */
export function isinToYahooSymbol(isin: string): string | null {
  if (!isin || isin.length !== 12) {
    return null;
  }
  
  const countryCode = isin.substring(0, 2);
  
  // Mapping bekannter ISINs zu Yahoo-Symbolen
  const knownMappings: Record<string, string> = {
    // Deutsche Aktien (Beispiele)
    'DE0007164600': 'SAP.DE',        // SAP
    'DE0008469008': 'BMW.DE',        // BMW
    'DE0005140008': 'DBK.DE',        // Deutsche Bank
    'DE000BASF111': 'BAS.DE',        // BASF
    'DE0005557508': 'DTE.DE',        // Deutsche Telekom
    'DE0008404005': 'ALV.DE',        // Allianz
    'DE0005785604': 'FME.DE',        // Fresenius Medical Care
    'DE0006048408': 'HEI.DE',        // HeidelbergCement
    // US-Aktien (Beispiele)
    'US0378331005': 'AAPL',          // Apple
    'US5949181045': 'MSFT',          // Microsoft
    'US88160R1014': 'TSLA',          // Tesla
    // Weitere können ergänzt werden
  };
  
  if (knownMappings[isin]) {
    return knownMappings[isin];
  }
  
  // Versuche heuristisches Mapping basierend auf Ländercode
  // Dies ist nicht 100% zuverlässig, aber ein guter Fallback
  switch (countryCode) {
    case 'DE': // Deutschland
      return `${isin}.DE`; // XETRA
    case 'US': // USA
      // US-ISINs: Keine Suffix nötig
      return null; // Lieber null zurückgeben als zu raten
    case 'GB': // UK
      return `${isin}.L`; // London Stock Exchange
    case 'FR': // Frankreich
      return `${isin}.PA`; // Paris
    case 'IT': // Italien
      return `${isin}.MI`; // Milano
    case 'ES': // Spanien
      return `${isin}.MC`; // Madrid
    case 'NL': // Niederlande
      return `${isin}.AS`; // Amsterdam
    case 'CH': // Schweiz
      return `${isin}.SW`; // Swiss Exchange
    case 'CA': // Kanada
      return `${isin}.TO`; // Toronto
    case 'AU': // Australien
      return `${isin}.AX`; // ASX
    case 'JP': // Japan
      return `${isin}.T`; // Tokyo
    default:
      return null;
  }
}

/**
 * Fügt Markt-Suffix zu Symbol hinzu falls nötig
 */
export function addMarketSuffix(symbol: string, market?: string): string {
  // Wenn schon ein Suffix vorhanden ist, belasse es
  if (symbol.includes('.')) {
    return symbol;
  }
  
  if (!market) {
    return symbol;
  }
  
  const marketSuffixes: Record<string, string> = {
    'XETRA': '.DE',
    'FRANKFURT': '.F',
    'LSE': '.L',
    'EURONEXT': '.PA',
    'MILAN': '.MI',
    'MADRID': '.MC',
    'AMSTERDAM': '.AS',
    'SWISS': '.SW',
    'TORONTO': '.TO',
    'ASX': '.AX',
    'TOKYO': '.T',
  };
  
  const suffix = marketSuffixes[market.toUpperCase()];
  return suffix ? `${symbol}${suffix}` : symbol;
}

/**
 * Holt Quote von Yahoo Finance
 */
export async function fetchYahooQuote(symbolOrIsin: string, market?: string): Promise<Quote | null> {
  try {
    let yahooSymbol: string;
    
    // Wenn es wie eine ISIN aussieht, konvertiere sie
    if (symbolOrIsin.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(symbolOrIsin)) {
      const converted = isinToYahooSymbol(symbolOrIsin);
      if (!converted) {
        console.log(`Cannot convert ISIN ${symbolOrIsin} to Yahoo symbol`);
        return null;
      }
      yahooSymbol = converted;
    } else {
      // Füge Markt-Suffix hinzu falls angegeben
      yahooSymbol = addMarketSuffix(symbolOrIsin, market);
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status} for ${yahooSymbol}`);
      return null;
    }
    
    const data: YahooQuoteResponse = await response.json();
    
    if (!data.chart.result || data.chart.result.length === 0) {
      console.log(`No data from Yahoo Finance for ${yahooSymbol}`);
      return null;
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    
    if (!meta.regularMarketPrice || meta.regularMarketPrice === 0) {
      console.log(`No price from Yahoo Finance for ${yahooSymbol}`);
      return null;
    }
    
    // Konvertiere zu EUR falls nötig
    let priceInEUR = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    
    if (currency !== 'EUR') {
      // Hier müsste eigentlich eine Währungsumrechnung stattfinden
      // Für jetzt: Verwende den Preis wie er ist und markiere Währung
      // TODO: Integration mit currencyService
    }
    
    return {
      isin: symbolOrIsin.length === 12 ? symbolOrIsin : undefined,
      ticker: yahooSymbol,
      price: Math.round(priceInEUR * 100) / 100,
      currency: currency === 'EUR' ? 'EUR' : currency,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching Yahoo quote for ${symbolOrIsin}:`, error);
    return null;
  }
}

/**
 * Sucht nach Aktien auf Yahoo Finance
 */
export async function searchYahooSymbol(query: string): Promise<Array<{
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}> | null> {
  try {
    // Yahoo Finance Search/Lookup API (weniger dokumentiert, kann instabil sein)
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.quotes || data.quotes.length === 0) {
      return null;
    }
    
    return data.quotes.map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol,
      exchange: quote.exchange,
      type: quote.quoteType,
    }));
  } catch (error) {
    console.error(`Error searching Yahoo for ${query}:`, error);
    return null;
  }
}

/**
 * Holt mehrere Yahoo-Quotes gleichzeitig
 */
export async function fetchYahooBatch(symbolsOrIsins: string[]): Promise<Map<string, Quote>> {
  const quotesMap = new Map<string, Quote>();
  
  if (symbolsOrIsins.length === 0) {
    return quotesMap;
  }
  
  // Yahoo unterstützt Batch-Requests, aber sequentiell ist zuverlässiger
  // Max 5 parallele Requests
  const batchSize = 5;
  
  for (let i = 0; i < symbolsOrIsins.length; i += batchSize) {
    const batch = symbolsOrIsins.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async (symbolOrIsin) => {
        const quote = await fetchYahooQuote(symbolOrIsin);
        return quote ? { key: symbolOrIsin, quote } : null;
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        quotesMap.set(result.value.key, result.value.quote);
      }
    });
  }
  
  return quotesMap;
}

/**
 * Holt Index-Daten von Yahoo Finance
 */
export async function fetchYahooIndices(): Promise<Array<{
  name: string;
  ticker: string;
  price: number;
  change: number;
}>> {
  const indices = [
    { name: 'S&P 500', symbol: '^GSPC' },           // S&P 500 Index direkt
    { name: 'MSCI World', symbol: 'URTH' },         // iShares MSCI World ETF
    { name: 'Nasdaq 100', symbol: '^NDX' },         // Nasdaq 100 Index direkt
    { name: 'Dow Jones', symbol: '^DJI' },          // Dow Jones Index direkt
    { name: 'DAX 40', symbol: '^GDAXI' },           // DAX Index direkt
    { name: 'Euro Stoxx 50', symbol: '^STOXX50E' }, // Euro Stoxx 50 Index direkt
    { name: 'FTSE 100', symbol: '^FTSE' },          // FTSE 100 Index (UK)
    { name: 'Nikkei 225', symbol: '^N225' },        // Nikkei 225 Index (Japan)
    { name: 'Hang Seng', symbol: '^HSI' },          // Hang Seng Index direkt
    { name: 'CAC 40', symbol: '^FCHI' },            // CAC 40 Index (Frankreich)
    { name: 'Swiss Market', symbol: '^SSMI' },      // SMI Index (Schweiz)
    { name: 'ASX 200', symbol: '^AXJO' },           // ASX 200 Index (Australien)
    { name: 'Shanghai Comp', symbol: '000001.SS' }, // Shanghai Composite
    { name: 'KOSPI', symbol: '^KS11' },             // KOSPI Index (Südkorea)
    { name: 'Russell 2000', symbol: '^RUT' },       // Russell 2000 (US Small Cap)
    { name: 'FTSE MIB', symbol: 'FTSEMIB.MI' },     // FTSE MIB Index (Italien)
    { name: 'TSX Composite', symbol: '^GSPTSE' },   // S&P/TSX Composite (Kanada)
  ];

  const results = await Promise.all(
    indices.map(async (index) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.symbol)}`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) {
          console.warn(`Yahoo Finance API error for ${index.name} (${index.symbol}): ${response.status}`);
          return {
            name: index.name,
            ticker: index.symbol,
            price: 0,
            change: 0,
          };
        }
        
        const data: YahooQuoteResponse = await response.json();
        
        if (!data.chart.result || data.chart.result.length === 0) {
          console.warn(`No data from Yahoo Finance for ${index.name} (${index.symbol})`);
          return {
            name: index.name,
            ticker: index.symbol,
            price: 0,
            change: 0,
          };
        }
        
        const result = data.chart.result[0];
        const meta = result.meta;
        
        if (!meta.regularMarketPrice || meta.regularMarketPrice === 0) {
          return {
            name: index.name,
            ticker: index.symbol,
            price: 0,
            change: 0,
          };
        }
        
        // Berechne prozentuale Änderung - Yahoo liefert verschiedene Felder
        const metaAny = meta as any;
        let changePercent = 0;
        
        // Versuche verschiedene Felder
        if (metaAny.regularMarketChangePercent !== undefined) {
          changePercent = metaAny.regularMarketChangePercent;
        } else if (metaAny.regularMarketChange !== undefined && metaAny.previousClose) {
          // Berechne Prozent aus absoluter Änderung
          changePercent = (metaAny.regularMarketChange / metaAny.previousClose) * 100;
        } else if (metaAny.chartPreviousClose) {
          // Fallback: Berechne aus aktuellem Preis und vorherigem Close
          changePercent = ((meta.regularMarketPrice - metaAny.chartPreviousClose) / metaAny.chartPreviousClose) * 100;
        }
        
        return {
          name: index.name,
          ticker: index.symbol,
          price: Math.round(meta.regularMarketPrice * 100) / 100,
          change: Math.round(changePercent * 100) / 100,
        };
      } catch (error) {
        console.error(`Error fetching Yahoo index ${index.name}:`, error);
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
}

/**
 * Prüft ob Symbol/ISIN wahrscheinlich bei Yahoo verfügbar ist
 */
export function shouldTryYahoo(symbolOrIsin: string): boolean {
  // ISINs von unterstützten Ländern
  if (symbolOrIsin.length === 12) {
    const countryCode = symbolOrIsin.substring(0, 2);
    const supportedCountries = ['DE', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'CH', 'CA', 'AU', 'JP'];
    return supportedCountries.includes(countryCode);
  }
  
  // Ticker-Symbole (nicht Crypto)
  if (symbolOrIsin.length <= 5 && /^[A-Z]+$/.test(symbolOrIsin)) {
    return true;
  }
  
  // Symbole mit Markt-Suffix (.DE, .F, etc.)
  if (symbolOrIsin.match(/^[A-Z]+\.[A-Z]{1,2}$/)) {
    return true;
  }
  
  return false;
}
