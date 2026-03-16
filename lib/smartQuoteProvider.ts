/**
 * Smart Quote Provider mit Waterfall-Strategie
 * 
 * Strategie: Probiert Provider nacheinander (nicht parallel!)
 * 1. Prüfe Cache
 * 2. Wähle besten Provider basierend auf Symbol
 * 3. Probiere Provider nacheinander (Waterfall)
 * 4. Fallback auf stale cache bei totalem Fehler
 */

import type { Quote, ApiError, MarketIndex } from '@/types';
import { getCached, setCache, checkRateLimit, getStaleCache, type SearchResult, deduplicateResults } from './smartCache';
import { fetchYahooBatch, fetchYahooIndices, shouldTryYahoo } from './yahooQuoteProvider';
import { fetchCoingeckoBatch, isCryptoSymbol } from './cryptoQuoteProvider';
import { fetchINGInstrumentHeader, extractINGPrice, shouldTryING } from './ingQuoteProvider';
import { getQuoteProvider } from './quoteProvider';

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

interface ProviderConfig {
  name: string;
  priority: number; // Niedrigere Zahl = höhere Priorität
  supports: (symbol: string) => boolean;
  fetchQuote: (symbol: string) => Promise<Quote | null>;
  fetchBatch: (symbols: string[]) => Promise<Map<string, Quote>>;
}

const providers: ProviderConfig[] = [
  // 1. Yahoo Finance - Beste Abdeckung, kostenlos, reliable
  {
    name: 'yahoo',
    priority: 1,
    supports: (symbol) => shouldTryYahoo(symbol) && !isCryptoSymbol(symbol),
    fetchQuote: async (symbol) => {
      const batch = await fetchYahooBatch([symbol]);
      const quote = batch.get(symbol);
      if (quote) {
        return { ...quote, provider: 'yahoo' };
      }
      return null;
    },
    fetchBatch: async (symbols) => {
      const batch = await fetchYahooBatch(symbols);
      const results = new Map<string, Quote>();
      batch.forEach((quote, key) => {
        results.set(key, { ...quote, provider: 'yahoo' });
      });
      return results;
    },
  },
  
  // 2. ING - Deutsche ISINs, kostenlos
  {
    name: 'ing',
    priority: 2,
    supports: (symbol) => shouldTryING(symbol),
    fetchQuote: async (symbol) => {
      const data = await fetchINGInstrumentHeader(symbol);
      if (!data) return null;
      
      const price = extractINGPrice(data);
      if (!price || price <= 0) return null;
      
      return {
        isin: symbol,
        ticker: data.wkn || symbol,
        price: Math.round(price * 100) / 100,
        currency: 'EUR',
        timestamp: Date.now(),
        provider: 'ing',
      };
    },
    fetchBatch: async (symbols) => {
      const results = new Map<string, Quote>();
      // ING hat kein Batch-API, einzeln fetchen
      for (const symbol of symbols.slice(0, 5)) { // Max 5 parallel
        const quote = await providers[1].fetchQuote(symbol);
        if (quote) results.set(symbol, quote);
      }
      return results;
    },
  },
  
  // 3. Finnhub - Fallback für Aktien, API-Key required
  {
    name: 'finnhub',
    priority: 3,
    supports: (symbol) => {
      // Finnhub unterstützt nicht: Indische (.IN), Saudi (.SR), Chinesische Börsen
      return !symbol.includes('.IN') && 
             !symbol.includes('.SR') && 
             !symbol.includes('.SZ') && 
             !symbol.includes('.SS') &&
             !isCryptoSymbol(symbol);
    },
    fetchQuote: async (symbol) => {
      const provider = getQuoteProvider();
      const quote = await provider.fetchQuote(symbol);
      if (quote) {
        return { ...quote, provider: 'finnhub' };
      }
      return null;
    },
    fetchBatch: async (symbols) => {
      const provider = getQuoteProvider();
      const results = new Map<string, Quote>();
      
      for (const symbol of symbols) {
        const quote = await provider.fetchQuote(symbol);
        if (quote) {
          results.set(symbol, { ...quote, provider: 'finnhub' });
        }
      }
      return results;
    },
  },
  
  // 4. Coingecko - Nur Krypto (niedrigste Priorität wegen Rate Limits)
  {
    name: 'coingecko',
    priority: 4,
    supports: (symbol) => isCryptoSymbol(symbol),
    fetchQuote: async (symbol) => {
      const batch = await fetchCoingeckoBatch([symbol]);
      const quote = batch.get(symbol);
      if (quote) {
        return { ...quote, provider: 'coingecko' };
      }
      return null;
    },
    fetchBatch: async (symbols) => {
      const batch = await fetchCoingeckoBatch(symbols);
      const results = new Map<string, Quote>();
      batch.forEach((quote, key) => {
        results.set(key, { ...quote, provider: 'coingecko' });
      });
      return results;
    },
  },
];

// ============================================================================
// WATERFALL STRATEGY
// ============================================================================

/**
 * Holt Quote mit Waterfall-Strategie (Provider nacheinander, nicht parallel)
 */
export async function fetchQuoteWithWaterfall(symbol: string): Promise<Quote | null> {
  const cacheKey = `quote:${symbol}`;
  
  // 1. Prüfe Cache (5 Minuten)
  const cached = getCached<Quote>(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit: ${symbol}`);
    return cached;
  }
  
  // 2. Finde unterstützte Provider, sortiert nach Priorität
  const supportedProviders = providers
    .filter(p => p.supports(symbol))
    .sort((a, b) => a.priority - b.priority);
  
  if (supportedProviders.length === 0) {
    console.warn(`⚠️ No provider supports ${symbol}`);
    return getStaleCache<Quote>(cacheKey);
  }
  
  // 3. Probiere Provider NACHEINANDER (Waterfall!)
  for (const provider of supportedProviders) {
    // Prüfe Rate Limit
    if (!checkRateLimit(provider.name)) {
      console.warn(`⏭️ Skipping ${provider.name} for ${symbol} (rate limit)`);
      continue;
    }
    
    try {
      console.log(`🔄 Trying ${provider.name} for ${symbol}...`);
      const quote = await provider.fetchQuote(symbol);
      
      if (quote && quote.price > 0) {
        console.log(`✅ ${provider.name} succeeded for ${symbol}`);
        setCache(cacheKey, quote, provider.name);
        return quote;
      }
      
      console.log(`⚠️ ${provider.name} returned no data for ${symbol}`);
    } catch (error) {
      console.warn(`❌ ${provider.name} failed for ${symbol}:`, error);
      // Nächsten Provider probieren
      continue;
    }
  }
  
  // 4. Alle Provider fehlgeschlagen → Stale Cache verwenden
  const stale = getStaleCache<Quote>(cacheKey);
  if (stale) return stale;
  
  console.error(`❌ All providers failed for ${symbol}`);
  return null;
}

export interface BatchFetchResult {
  quotes: Map<string, Quote>;
  errors: ApiError[];
}

/**
 * Batch-Fetch mit intelligenter Provider-Auswahl
 */
export async function fetchBatchWithWaterfall(
  symbols: string[],
  force: boolean = false,
  preferredProviders?: Map<string, string> // symbol -> provider mapping
): Promise<BatchFetchResult> {
  const results = new Map<string, Quote>();
  const errors: ApiError[] = [];
  const failedSymbols = new Set<string>(); // Track failed symbols for retry
  const providerErrors = new Map<string, { message: string; symbols: string[] }>(); // provider -> error + symbols
  
  // Gruppiere Symbole nach Provider
  const symbolsByProvider = new Map<string, string[]>();
  
  for (const symbol of symbols) {
    // Prüfe Cache (außer bei force=true)
    if (!force) {
      const cached = getCached<Quote>(`quote:${symbol}`);
      if (cached) {
        results.set(symbol, cached);
        continue;
      }
    }
    
    // Prüfe ob es einen bevorzugten Provider gibt
    const preferredProviderName = preferredProviders?.get(symbol);
    let bestProvider;
    
    if (preferredProviderName) {
      // Verwende bevorzugten Provider wenn er das Symbol unterstützt
      bestProvider = providers.find(p => 
        p.name === preferredProviderName && p.supports(symbol)
      );
      if (bestProvider) {
        console.log(`📌 Using preferred provider ${preferredProviderName} for ${symbol}`);
      }
    }
    
    // Fallback: Finde besten Provider basierend auf Priorität
    if (!bestProvider) {
      bestProvider = providers
        .filter(p => p.supports(symbol))
        .sort((a, b) => a.priority - b.priority)[0];
    }
    
    if (!bestProvider) continue;
    
    if (!symbolsByProvider.has(bestProvider.name)) {
      symbolsByProvider.set(bestProvider.name, []);
    }
    symbolsByProvider.get(bestProvider.name)!.push(symbol);
  }
  
  // Fetch von jedem Provider
  for (const [providerName, providerSymbols] of symbolsByProvider) {
    const provider = providers.find(p => p.name === providerName);
    if (!provider || !checkRateLimit(providerName)) continue;
    
    try {
      console.log(`🔄 Batch fetching ${providerSymbols.length} symbols from ${providerName}${force ? ' (forced)' : ''}`);
      const quotes = await provider.fetchBatch(providerSymbols);
      
      quotes.forEach((quote, symbol) => {
        if (quote && quote.price > 0) {
          results.set(symbol, quote);
          setCache(`quote:${symbol}`, quote, providerName);
          console.log(`✅ Got price for ${symbol} from ${providerName}: ${quote.price}`);
        }
      });
      
      // Track symbols that didn't get a quote
      providerSymbols.forEach(symbol => {
        if (!results.has(symbol)) {
          failedSymbols.add(symbol);
          console.warn(`⚠️ No price from ${providerName} for ${symbol}, will try fallback`);
        }
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Batch fetch failed for ${providerName}:`, error);
      providerErrors.set(providerName, { message: errMsg, symbols: [...providerSymbols] });
      // Bei Fehler alle Symbole als fehlgeschlagen markieren
      providerSymbols.forEach(symbol => failedSymbols.add(symbol));
    }
  }
  
  // 🔥 FALLBACK: Probiere andere Provider für fehlgeschlagene Symbole
  if (failedSymbols.size > 0) {
    console.log(`🔄 Trying fallback providers for ${failedSymbols.size} failed symbols`);
    
    for (const symbol of failedSymbols) {
      // Finde alle unterstützenden Provider (sortiert nach Priorität)
      const supportingProviders = providers
        .filter(p => p.supports(symbol))
        .sort((a, b) => a.priority - b.priority);
      
      // Probiere jeden Provider nacheinander
      for (const provider of supportingProviders) {
        // Skip if already tried
        const alreadyTried = symbolsByProvider.get(provider.name)?.includes(symbol);
        if (alreadyTried) continue;
        
        // Skip if rate limited
        if (!checkRateLimit(provider.name)) continue;
        
        try {
          console.log(`🔄 Fallback: Trying ${provider.name} for ${symbol}`);
          const quote = await provider.fetchQuote(symbol);
          
          if (quote && quote.price > 0) {
            results.set(symbol, quote);
            setCache(`quote:${symbol}`, quote, provider.name);
            console.log(`✅ Got price for ${symbol} from ${provider.name} (fallback): ${quote.price}`);
            break; // Erfolgreich, nächstes Symbol
          }
        } catch (error) {
          console.error(`❌ Fallback fetch failed for ${provider.name} (${symbol}):`, error);
          continue; // Probiere nächsten Provider
        }
      }
      
      // Wenn auch nach Fallback kein Ergebnis
      if (!results.has(symbol)) {
        console.error(`❌ All providers failed for ${symbol}`);
      }
    }
  }

  // Sammle Provider-Fehler als strukturierte Errors
  for (const [providerName, { message: errMsg, symbols: provSymbols }] of providerErrors) {
    // Nur Symbole melden die diesem Provider zugeordnet waren UND nicht durch Fallback kompensiert wurden
    const stillFailed = provSymbols.filter(s => !results.has(s));
    if (stillFailed.length > 0) {
      errors.push({
        category: 'provider',
        message: `${providerName.toUpperCase()} ist nicht erreichbar`,
        details: `${stillFailed.length} Symbol(e) betroffen: ${stillFailed.slice(0, 5).join(', ')}${stillFailed.length > 5 ? '...' : ''}`,
      });
    }
  }

  // Symbole die nach allen Versuchen keinen Kurs haben
  const totalFailed = symbols.filter(s => !results.has(s));
  if (totalFailed.length > 0 && providerErrors.size === 0) {
    errors.push({
      category: 'provider',
      message: `Keine Kursdaten für ${totalFailed.length} Symbol(e)`,
      details: `Betroffene Symbole: ${totalFailed.slice(0, 5).join(', ')}${totalFailed.length > 5 ? '...' : ''}`,
    });
  }

  return { quotes: results, errors };
}

// ============================================================================
// INDICES MIT WATERFALL
// ============================================================================

export interface IndicesFetchResult {
  indices: MarketIndex[];
  errors: ApiError[];
}

export async function fetchIndicesWithWaterfall(force: boolean = false): Promise<IndicesFetchResult> {
  const cacheKey = 'indices:all';
  const errors: ApiError[] = [];

  // Prüfe Cache (5 Minuten) - außer bei force=true
  if (!force) {
    const cached = getCached<MarketIndex[]>(cacheKey);
    if (cached) {
      console.log('✅ Indices cache hit');
      return { indices: cached, errors };
    }
  }

  try {
    // Yahoo ist die beste Quelle für Indizes
    if (checkRateLimit('yahoo')) {
      console.log(`🔄 Fetching indices from yahoo${force ? ' (forced)' : ''}`);
      const indices = await fetchYahooIndices();
      setCache(cacheKey, indices, 'yahoo');
      return { indices, errors };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch indices:', error);
    errors.push({
      category: 'provider',
      message: 'Yahoo Finance ist nicht erreichbar',
      details: 'Marktindizes konnten nicht geladen werden.',
    });
  }

  // Fallback auf stale cache
  return { indices: getStaleCache<MarketIndex[]>(cacheKey) || [], errors };
}
