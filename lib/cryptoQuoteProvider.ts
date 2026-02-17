/**
 * Coingecko Quote Provider
 * 
 * Kostenlose Krypto-Kursdaten von Coingecko API
 * - Keine API-Key erforderlich
 * - 10.000+ Kryptowährungen
 * - 50 Requests/Minute (Free Tier)
 */

import type { Quote } from '@/types';

interface CoingeckoSimplePrice {
  [coinId: string]: {
    eur?: number;
    usd?: number;
  };
}

// Mapping: Symbol/Ticker → Coingecko ID
const CRYPTO_SYMBOL_TO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'TRX': 'tron',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'XLM': 'stellar',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'FIL': 'filecoin',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'NEAR': 'near',
  'ICP': 'internet-computer',
  'HBAR': 'hedera-hashgraph',
  'QNT': 'quant-network',
  'GRT': 'the-graph',
  'AAVE': 'aave',
  'SNX': 'havven',
  'MKR': 'maker',
  'COMP': 'compound-governance-token',
  'SUSHI': 'sushi',
  'CRV': 'curve-dao-token',
  // Weitere können hier ergänzt werden
};

// Bekannte Crypto-Namen für schnelle Erkennung
const CRYPTO_NAMES = [
  'bitcoin', 'ethereum', 'tether', 'binance', 'ripple', 'cardano', 
  'solana', 'dogecoin', 'polkadot', 'avalanche', 'chainlink', 'uniswap',
  'litecoin', 'cosmos', 'stellar', 'algorand', 'vechain', 'filecoin',
  'sandbox', 'decentraland', 'aptos', 'arbitrum', 'optimism', 'near',
  'hedera', 'quant', 'graph', 'aave', 'maker', 'compound', 'sushi', 'curve'
];

/**
 * Erkennt ob ein Symbol/Ticker eine Kryptowährung ist
 */
export function isCryptoSymbol(symbolOrIsin: string): boolean {
  const upper = symbolOrIsin.toUpperCase();
  const lower = symbolOrIsin.toLowerCase();
  
  // 1. Bekannte Crypto-Symbole
  if (CRYPTO_SYMBOL_TO_ID[upper]) {
    return true;
  }
  
  // 2. Crypto-Paare (z.B. BTCUSD, ETHUSD)
  if (upper.match(/^(BTC|ETH|USDT|BNB|XRP|ADA|SOL|DOGE|TRX|MATIC|AVAX|DOT|LINK)(USD|EUR|USDT|BTC|ETH)$/)) {
    return true;
  }
  
  // 3. Mit Suffixen (z.B. BTC-USD)
  if (upper.match(/^(BTC|ETH|USDT|BNB|XRP|ADA|SOL|DOGE|TRX|MATIC|AVAX|DOT|LINK)[-\/](USD|EUR|USDT)$/)) {
    return true;
  }
  
  // 4. Bekannte Crypto-Namen (z.B. "Bitcoin", "Ethereum")
  if (CRYPTO_NAMES.some(name => lower.includes(name))) {
    return true;
  }
  
  // 5. Typische Crypto-Keywords
  if (lower.match(/\b(crypto|coin|token|defi|nft)\b/)) {
    return true;
  }
  
  return false;
}

/**
 * Extrahiert das Basis-Crypto-Symbol aus verschiedenen Formaten
 * BTC, BTCUSD, BTC-USD → BTC
 */
export function extractCryptoSymbol(symbolOrIsin: string): string {
  const upper = symbolOrIsin.toUpperCase();
  
  // Entferne Suffixe wie -USD, /USD, USD
  const cleaned = upper
    .replace(/[-\/](USD|EUR|USDT|BTC|ETH)$/, '')
    .replace(/(USD|EUR|USDT)$/, '');
  
  return cleaned;
}

/**
 * Konvertiert Symbol zu Coingecko ID
 */
function symbolToCoingeckoId(symbol: string): string | null {
  const baseSymbol = extractCryptoSymbol(symbol);
  return CRYPTO_SYMBOL_TO_ID[baseSymbol] || null;
}

/**
 * Holt Krypto-Preis von Coingecko
 */
export async function fetchCoingeckoPrice(symbolOrIsin: string): Promise<Quote | null> {
  try {
    const coingeckoId = symbolToCoingeckoId(symbolOrIsin);
    
    if (!coingeckoId) {
      console.log(`Unknown crypto symbol: ${symbolOrIsin}`);
      return null;
    }
    
    return await fetchCoingeckoPriceById(coingeckoId, symbolOrIsin);
  } catch (error) {
    console.error(`Error fetching Coingecko price for ${symbolOrIsin}:`, error);
    return null;
  }
}

/**
 * Holt Krypto-Preis von Coingecko mit direkter ID
 */
export async function fetchCoingeckoPriceById(coingeckoId: string, displaySymbol?: string): Promise<Quote | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=eur`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Timeout nach 10 Sekunden
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.error(`Coingecko API error: ${response.status}`);
      return null;
    }
    
    const data: CoingeckoSimplePrice = await response.json();
    
    if (!data[coingeckoId] || !data[coingeckoId].eur) {
      console.log(`No EUR price for ${coingeckoId}`);
      return null;
    }
    
    const priceEUR = data[coingeckoId].eur!;
    const baseSymbol = displaySymbol ? extractCryptoSymbol(displaySymbol) : coingeckoId.toUpperCase();
    
    return {
      ticker: baseSymbol,
      price: Math.round(priceEUR * 100) / 100,
      currency: 'EUR',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching Coingecko price for ${coingeckoId}:`, error);
    return null;
  }
}

/**
 * Sucht nach Kryptowährungen basierend auf Query
 */
export async function searchCoingeckoCrypto(query: string): Promise<Array<{
  id: string;
  symbol: string;
  name: string;
}> | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.coins || data.coins.length === 0) {
      return null;
    }
    
    // Nehme nur die ersten 10 Ergebnisse
    return data.coins.slice(0, 10).map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
  } catch (error) {
    console.error(`Error searching Coingecko for ${query}:`, error);
    return null;
  }
}

/**
 * Holt mehrere Crypto-Preise gleichzeitig (Batch)
 */
export async function fetchCoingeckoBatch(symbols: string[]): Promise<Map<string, Quote>> {
  const quotesMap = new Map<string, Quote>();
  
  if (symbols.length === 0) {
    return quotesMap;
  }
  
  // Konvertiere Symbole zu Coingecko IDs
  const symbolToIdMap = new Map<string, string>();
  const coingeckoIds: string[] = [];
  
  for (const symbol of symbols) {
    const id = symbolToCoingeckoId(symbol);
    if (id) {
      symbolToIdMap.set(symbol, id);
      if (!coingeckoIds.includes(id)) {
        coingeckoIds.push(id);
      }
    }
  }
  
  if (coingeckoIds.length === 0) {
    return quotesMap;
  }
  
  try {
    // Batch-Request für alle IDs
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=eur`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      console.error(`Coingecko batch API error: ${response.status}`);
      return quotesMap;
    }
    
    const data: CoingeckoSimplePrice = await response.json();
    
    // Erstelle Quotes für jedes Symbol
    for (const [symbol, coingeckoId] of symbolToIdMap.entries()) {
      if (data[coingeckoId] && data[coingeckoId].eur) {
        const baseSymbol = extractCryptoSymbol(symbol);
        quotesMap.set(symbol, {
          ticker: baseSymbol,
          price: Math.round(data[coingeckoId].eur! * 100) / 100,
          currency: 'EUR',
          timestamp: Date.now(),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching Coingecko batch:', error);
  }
  
  return quotesMap;
}
