/**
 * Finnhub Price Provider
 * 
 * Free tier: 60 API calls/minute
 * Docs: https://finnhub.io/docs/api
 * 
 * Features:
 * - Real-time stock quotes
 * - Symbol search
 * - Rate limiting (60 calls/min)
 * - Automatic retries with exponential backoff
 * - Error handling
 * - Optional caching with Vercel KV
 * 
 * Setup:
 * 1. Get free API key from https://finnhub.io/register
 * 2. Add to .env.local: FINNHUB_API_KEY=your-key
 */

import { kv } from '@/lib/kv';
import {
  isISIN,
  isSymbol,
  PriceProvider,
  PriceProviderConfig,
  PriceProviderError,
  StockQuote,
} from './price-provider.interface';

// ============================================================================
// Types
// ============================================================================

/**
 * Finnhub API response for quote endpoint
 * Docs: https://finnhub.io/docs/api/quote
 */
interface FinnhubQuoteResponse {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp (Unix)
}

/**
 * Finnhub API response for symbol lookup
 */
interface FinnhubSymbolLookupResponse {
  count: number;
  result: Array<{
    description: string;  // Company name
    displaySymbol: string; // Symbol to display
    symbol: string;       // Trading symbol
    type: string;         // Security type
  }>;
}

/**
 * ISIN to Symbol mapping cache
 */
interface ISINMapping {
  symbol: string;
  exchange: string;
  currency: string;
  cachedAt: number;
}

// ============================================================================
// Finnhub Provider Implementation
// ============================================================================

export class FinnhubPriceProvider implements PriceProvider {
  readonly name = 'Finnhub';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly enableCache: boolean;
  private readonly cacheTTL: number;

  // Rate limiting (60 calls/minute for free tier)
  private requestCount = 0;
  private requestWindowStart = Date.now();
  private readonly maxRequestsPerMinute = 60;

  constructor(config: PriceProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Finnhub API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://finnhub.io/api/v1';
    this.timeout = config.timeout || 5000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableCache = config.enableCache ?? true;
    this.cacheTTL = config.cacheTTL || 60; // 60 seconds default
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  async getQuote(identifier: string): Promise<StockQuote> {
    if (isISIN(identifier)) {
      return this.getQuoteByISIN(identifier);
    } else if (isSymbol(identifier)) {
      return this.getQuoteBySymbol(identifier);
    } else {
      throw new PriceProviderError(
        `Invalid identifier: ${identifier}. Must be ISIN or symbol.`,
        this.name,
        'INVALID_IDENTIFIER'
      );
    }
  }

  async getQuoteByISIN(isin: string): Promise<StockQuote> {
    // Try to get symbol from cache
    const mapping = await this.getISINMapping(isin);

    if (!mapping) {
      throw new PriceProviderError(
        `No symbol mapping found for ISIN: ${isin}`,
        this.name,
        'ISIN_NOT_FOUND',
        404
      );
    }

    // Fetch quote by symbol
    const quote = await this.getQuoteBySymbol(mapping.symbol);

    // Add ISIN to response
    return {
      ...quote,
      isin,
    };
  }

  async getQuoteBySymbol(symbol: string, exchange?: string): Promise<StockQuote> {
    // Normalize symbol (uppercase, remove spaces)
    const normalizedSymbol = symbol.trim().toUpperCase();

    // Check cache first
    if (this.enableCache) {
      const cached = await this.getCachedQuote(normalizedSymbol);
      if (cached) return cached;
    }

    // Fetch from API
    const response = await this.fetchWithRetry<FinnhubQuoteResponse>(
      `/quote?symbol=${normalizedSymbol}`
    );

    // Validate response
    if (response.c === 0 || response.c === null) {
      throw new PriceProviderError(
        `No quote data available for symbol: ${normalizedSymbol}`,
        this.name,
        'NO_DATA',
        404
      );
    }

    // Parse response to StockQuote
    const quote: StockQuote = {
      price: response.c,
      currency: this.getCurrencyBySymbol(normalizedSymbol),
      asOf: new Date(response.t * 1000),
      symbol: normalizedSymbol,
      exchange,
      previousClose: response.pc,
      change: response.d,
      changePercent: response.dp,
      high: response.h,
      low: response.l,
    };

    // Cache result
    if (this.enableCache) {
      await this.cacheQuote(normalizedSymbol, quote);
    }

    return quote;
  }

  async searchStocks(query: string): Promise<Array<{
    symbol: string;
    name: string;
    isin?: string;
    exchange?: string;
    currency?: string;
  }>> {
    const response = await this.fetchWithRetry<FinnhubSymbolLookupResponse>(
      `/search?q=${encodeURIComponent(query)}`
    );

    return response.result.map((item) => ({
      symbol: item.symbol,
      name: item.description,
      exchange: undefined, // Finnhub doesn't provide exchange in search
      currency: this.getCurrencyBySymbol(item.symbol),
    }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch a well-known stock (Apple)
      await this.getQuoteBySymbol('AAPL');
      return true;
    } catch (error) {
      console.error('Finnhub health check failed:', error);
      return false;
    }
  }

  // ==========================================================================
  // Private Methods - API Calls
  // ==========================================================================

  /**
   * Fetch from Finnhub API with retry logic
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    attempt = 1
  ): Promise<T> {
    try {
      // Check rate limit
      await this.checkRateLimit();

      // Build URL
      const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${this.apiKey}`;

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      // Increment request count
      this.requestCount++;

      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();

        // Rate limit exceeded (429)
        if (response.status === 429) {
          throw new PriceProviderError(
            'Rate limit exceeded',
            this.name,
            'RATE_LIMIT_EXCEEDED',
            429,
            true // retryable
          );
        }

        // Unauthorized (401)
        if (response.status === 401) {
          throw new PriceProviderError(
            'Invalid API key',
            this.name,
            'UNAUTHORIZED',
            401,
            false
          );
        }

        // Not found (404)
        if (response.status === 404) {
          throw new PriceProviderError(
            'Resource not found',
            this.name,
            'NOT_FOUND',
            404,
            false
          );
        }

        throw new PriceProviderError(
          `API request failed: ${response.status} - ${errorText}`,
          this.name,
          'API_ERROR',
          response.status,
          response.status >= 500 // 5xx errors are retryable
        );
      }

      // Parse JSON
      const data = await response.json();
      return data as T;

    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new PriceProviderError(
          'Request timeout',
          this.name,
          'TIMEOUT',
          undefined,
          true // retryable
        );

        if (attempt < this.maxRetries) {
          console.warn(`Finnhub timeout, retrying (${attempt}/${this.maxRetries})...`);
          await this.delay(this.retryDelay * attempt);
          return this.fetchWithRetry<T>(endpoint, attempt + 1);
        }

        throw timeoutError;
      }

      // Handle PriceProviderError
      if (error instanceof PriceProviderError) {
        // Retry if error is retryable and we haven't exceeded max retries
        if (error.retryable && attempt < this.maxRetries) {
          console.warn(`Finnhub error (${error.code}), retrying (${attempt}/${this.maxRetries})...`);
          await this.delay(this.retryDelay * attempt);
          return this.fetchWithRetry<T>(endpoint, attempt + 1);
        }

        throw error;
      }

      // Unknown error
      throw new PriceProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.name,
        'UNKNOWN_ERROR',
        undefined,
        false
      );
    }
  }

  /**
   * Check rate limit (60 calls/minute)
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.requestWindowStart;

    // Reset window if 1 minute has passed
    if (windowElapsed >= 60000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
      return;
    }

    // Check if we've exceeded the limit
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - windowElapsed;
      console.warn(`Finnhub rate limit reached, waiting ${waitTime}ms...`);
      await this.delay(waitTime);

      // Reset after waiting
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }
  }

  // ==========================================================================
  // Private Methods - Caching
  // ==========================================================================

  /**
   * Get cached quote
   */
  private async getCachedQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const cached = await kv.get<StockQuote>(`quote:${symbol}`);

      if (cached && cached.asOf) {
        // Check if cache is still valid
        const age = Date.now() - new Date(cached.asOf).getTime();
        if (age < this.cacheTTL * 1000) {
          return cached;
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Cache quote
   */
  private async cacheQuote(symbol: string, quote: StockQuote): Promise<void> {
    try {
      await kv.set(`quote:${symbol}`, quote, {
        ex: this.cacheTTL,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get ISIN to symbol mapping (cached)
   */
  private async getISINMapping(isin: string): Promise<ISINMapping | null> {
    try {
      return await kv.get<ISINMapping>(`isin:${isin}`);
    } catch (error) {
      console.error('ISIN mapping get error:', error);
      return null;
    }
  }

  // ==========================================================================
  // Private Methods - Helpers
  // ==========================================================================

  /**
   * Get currency by symbol (heuristic)
   * 
   * This is a simple heuristic. In production, you'd want to use a proper
   * symbol-to-currency mapping database.
   */
  private getCurrencyBySymbol(symbol: string): string {
    // German stocks (XETRA)
    if (symbol.endsWith('.DE')) return 'EUR';

    // UK stocks (LSE)
    if (symbol.endsWith('.L')) return 'GBP';

    // Default to USD (US stocks)
    return 'USD';
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Finnhub price provider instance
 * 
 * @param config - Provider configuration (optional, uses env vars by default)
 * @returns Finnhub provider instance
 */
export function createFinnhubProvider(
  config?: Partial<PriceProviderConfig>
): FinnhubPriceProvider {
  const apiKey = config?.apiKey || process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Finnhub API key is required. Set FINNHUB_API_KEY environment variable or pass apiKey in config.'
    );
  }

  return new FinnhubPriceProvider({
    apiKey,
    ...config,
  });
}
