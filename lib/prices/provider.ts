/**
 * Price Provider Interface & Implementation
 * 
 * Abstraction layer for price data providers (Finnhub, TwelveData, etc.)
 * Used by cache layer for fetching real-time quotes
 * 
 * NO database writes here - purely API interaction
 */

// ============================================================================
// Types
// ============================================================================

export interface PriceQuote {
  /** Current price */
  price: number;

  /** Currency code (EUR, USD, etc.) */
  currency: string;

  /** Timestamp when quote was captured */
  asOf: Date;

  /** Open price (optional) */
  open?: number;

  /** High price (optional) */
  high?: number;

  /** Low price (optional) */
  low?: number;

  /** Previous close (optional) */
  previousClose?: number;

  /** Change from previous close */
  change?: number;

  /** Percentage change */
  changePercent?: number;
}

export interface GetQuoteParams {
  /** ISIN code (primary identifier) */
  isin: string;

  /** Symbol (e.g., 'AAPL') - optional, provider-specific */
  symbol?: string;

  /** Exchange (e.g., 'XETRA') - optional */
  exchange?: string;
}

export interface PriceProvider {
  /** Provider name for logging/debugging */
  name: string;

  /**
   * Fetch quote for a single instrument
   * @throws Error if quote unavailable
   */
  getQuote(params: GetQuoteParams): Promise<PriceQuote>;

  /**
   * Fetch multiple quotes (batch)
   * Optional - defaults to sequential calls
   */
  getQuotes?(params: GetQuoteParams[]): Promise<Map<string, PriceQuote>>;
}

// ============================================================================
// Finnhub Provider Implementation
// ============================================================================

/**
 * Finnhub.io Price Provider
 * 
 * Free tier: 60 API calls/minute
 * API Doc: https://finnhub.io/docs/api/quote
 */
export class FinnhubProvider implements PriceProvider {
  readonly name = 'Finnhub';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Finnhub API key is required');
    }
    this.apiKey = apiKey;
  }

  async getQuote(params: GetQuoteParams): Promise<PriceQuote> {
    const { symbol } = params;

    if (!symbol) {
      throw new Error('Symbol is required for Finnhub provider');
    }

    try {
      const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        throw new Error(
          `Finnhub API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Finnhub response format:
      // { c: current, h: high, l: low, o: open, pc: previous close, t: timestamp }
      if (!data.c || data.c === 0) {
        throw new Error(`No price data available for symbol: ${symbol}`);
      }

      const changePercent = data.pc && data.pc !== 0
        ? ((data.c - data.pc) / data.pc) * 100
        : 0;

      return {
        price: data.c,
        currency: 'USD', // Finnhub defaults to USD
        asOf: new Date(data.t * 1000), // Convert Unix timestamp
        open: data.o || undefined,
        high: data.h || undefined,
        low: data.l || undefined,
        previousClose: data.pc || undefined,
        change: data.c - (data.pc || 0),
        changePercent,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to fetch quote from Finnhub for ${symbol}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Batch fetch - Finnhub doesn't support true batch API
   * We implement sequential with rate limiting
   */
  async getQuotes(params: GetQuoteParams[]): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();
    const errors: string[] = [];

    // Rate limit: max 1 request per 100ms (60/min limit)
    for (const param of params) {
      try {
        const quote = await this.getQuote(param);
        results.set(param.isin, quote);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(
          `${param.symbol || param.isin}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    if (errors.length > 0) {
      console.warn(`Finnhub batch fetch had ${errors.length} errors:`, errors);
    }

    return results;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let cachedProvider: PriceProvider | null = null;

/**
 * Get configured price provider instance (singleton)
 */
export function getPriceProvider(): PriceProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error(
      'FINNHUB_API_KEY environment variable is required. ' +
      'Get your free key at https://finnhub.io/register'
    );
  }

  cachedProvider = new FinnhubProvider(apiKey);
  return cachedProvider;
}

/**
 * Reset cached provider (for testing)
 */
export function resetPriceProvider(): void {
  cachedProvider = null;
}
