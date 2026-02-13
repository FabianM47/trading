/**
 * Price Provider Interface
 * 
 * Abstract interface for fetching real-time stock prices from various data providers.
 * Implementations should handle rate limiting, retries, and error handling.
 * 
 * Supported Identifiers:
 * - ISIN (International Securities Identification Number, e.g., US0378331005 for Apple)
 * - Symbol (Ticker symbol, e.g., AAPL, MSFT)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Stock quote data returned by price providers
 */
export interface StockQuote {
  /**
   * Current price in the specified currency
   */
  price: number;

  /**
   * Currency code (ISO 4217, e.g., USD, EUR)
   */
  currency: string;

  /**
   * Timestamp when the price was last updated
   */
  asOf: Date;

  /**
   * Optional: Trading symbol (e.g., AAPL, MSFT)
   */
  symbol?: string;

  /**
   * Optional: ISIN
   */
  isin?: string;

  /**
   * Optional: Exchange where the stock is traded (e.g., NASDAQ, NYSE, XETRA)
   */
  exchange?: string;

  /**
   * Optional: Previous close price
   */
  previousClose?: number;

  /**
   * Optional: Daily change in price
   */
  change?: number;

  /**
   * Optional: Daily change in percentage
   */
  changePercent?: number;

  /**
   * Optional: Day's high price
   */
  high?: number;

  /**
   * Optional: Day's low price
   */
  low?: number;

  /**
   * Optional: Trading volume
   */
  volume?: number;
}

/**
 * Price provider configuration
 */
export interface PriceProviderConfig {
  /**
   * API key for the provider
   */
  apiKey: string;

  /**
   * Base URL for API requests (optional, providers have defaults)
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Enable request caching
   * @default true
   */
  enableCache?: boolean;

  /**
   * Cache TTL in seconds
   * @default 60
   */
  cacheTTL?: number;
}

/**
 * Price provider error with additional context
 */
export class PriceProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'PriceProviderError';
  }
}

// ============================================================================
// Price Provider Interface
// ============================================================================

/**
 * Abstract interface for price data providers
 * 
 * Implementations must handle:
 * - Rate limiting (respect provider limits)
 * - Retries with exponential backoff
 * - Error handling and proper error messages
 * - Response parsing and validation
 * - Optional caching
 */
export interface PriceProvider {
  /**
   * Provider name (e.g., "Finnhub", "TwelveData")
   */
  readonly name: string;

  /**
   * Get real-time quote for a stock by ISIN
   * 
   * @param isin - International Securities Identification Number
   * @returns Stock quote data
   * @throws PriceProviderError if request fails
   */
  getQuoteByISIN(isin: string): Promise<StockQuote>;

  /**
   * Get real-time quote for a stock by symbol
   * 
   * @param symbol - Trading symbol (e.g., AAPL, MSFT)
   * @param exchange - Optional exchange identifier
   * @returns Stock quote data
   * @throws PriceProviderError if request fails
   */
  getQuoteBySymbol(symbol: string, exchange?: string): Promise<StockQuote>;

  /**
   * Get real-time quote (auto-detect identifier type)
   * 
   * @param identifier - ISIN or symbol
   * @returns Stock quote data
   * @throws PriceProviderError if request fails
   */
  getQuote(identifier: string): Promise<StockQuote>;

  /**
   * Search for stocks by name or symbol
   * 
   * @param query - Search query
   * @returns Array of matching stocks
   */
  searchStocks?(query: string): Promise<Array<{
    symbol: string;
    name: string;
    isin?: string;
    exchange?: string;
    currency?: string;
  }>>;

  /**
   * Check if provider is healthy (API accessible)
   * 
   * @returns True if provider is accessible
   */
  healthCheck?(): Promise<boolean>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if identifier is an ISIN
 * 
 * ISIN format: 2-letter country code + 9-digit identifier + 1 check digit
 * Example: US0378331005 (Apple)
 * 
 * @param identifier - Potential ISIN
 * @returns True if valid ISIN format
 */
export function isISIN(identifier: string): boolean {
  // ISIN: 2 letters + 9 alphanumeric + 1 digit
  const isinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  return isinRegex.test(identifier);
}

/**
 * Check if identifier is a stock symbol
 * 
 * @param identifier - Potential symbol
 * @returns True if valid symbol format
 */
export function isSymbol(identifier: string): boolean {
  // Symbol: 1-5 uppercase letters (e.g., AAPL, MSFT, BRK.B)
  const symbolRegex = /^[A-Z]{1,5}(\.[A-Z])?$/;
  return symbolRegex.test(identifier);
}
