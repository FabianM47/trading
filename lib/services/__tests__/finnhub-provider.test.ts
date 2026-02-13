/**
 * Unit Tests for Finnhub Price Provider
 * 
 * Tests:
 * - Quote parsing and mapping
 * - ISIN/Symbol validation
 * - Error handling
 * - Rate limiting
 * - Retry logic
 * - Currency detection
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinnhubPriceProvider } from '../finnhub-provider';
import { PriceProviderError } from '../price-provider.interface';

// ============================================================================
// Mocks
// ============================================================================

// Mock Vercel KV
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// ============================================================================
// Test Data
// ============================================================================

const mockFinnhubQuoteResponse = {
  c: 175.43,  // Current price
  d: 2.15,    // Change
  dp: 1.24,   // Percent change
  h: 176.82,  // High
  l: 173.50,  // Low
  o: 174.20,  // Open
  pc: 173.28, // Previous close
  t: 1707840000, // Timestamp (Feb 13, 2024)
};

const mockFinnhubSearchResponse = {
  count: 2,
  result: [
    {
      description: 'Apple Inc',
      displaySymbol: 'AAPL',
      symbol: 'AAPL',
      type: 'Common Stock',
    },
    {
      description: 'Apple Inc.',
      displaySymbol: 'AAPL',
      symbol: 'AAPL',
      type: 'EQS',
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('FinnhubPriceProvider', () => {
  let provider: FinnhubPriceProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create provider with test API key
    provider = new FinnhubPriceProvider({
      apiKey: 'test-api-key',
      enableCache: false, // Disable cache for tests
      maxRetries: 2,
      retryDelay: 100,
      timeout: 5000,
    });
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with valid API key', () => {
      expect(provider.name).toBe('Finnhub');
    });

    it('should throw error without API key', () => {
      expect(() => {
        new FinnhubPriceProvider({ apiKey: '' });
      }).toThrow('Finnhub API key is required');
    });

    it('should use default configuration', () => {
      const defaultProvider = new FinnhubPriceProvider({
        apiKey: 'test-key',
      });
      expect(defaultProvider).toBeDefined();
    });
  });

  // ==========================================================================
  // getQuoteBySymbol Tests
  // ==========================================================================

  describe('getQuoteBySymbol', () => {
    it('should fetch and parse quote successfully', async () => {
      // Mock successful fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('AAPL');

      expect(quote).toMatchObject({
        price: 175.43,
        currency: 'USD',
        symbol: 'AAPL',
        previousClose: 173.28,
        change: 2.15,
        changePercent: 1.24,
        high: 176.82,
        low: 173.50,
      });

      expect(quote.asOf).toBeInstanceOf(Date);
      expect(quote.asOf.getTime()).toBe(1707840000000);
    });

    it('should normalize symbol to uppercase', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      await provider.getQuoteBySymbol('aapl');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL'),
        expect.any(Object)
      );
    });

    it('should detect EUR currency for German stocks', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('BMW.DE');

      expect(quote.currency).toBe('EUR');
    });

    it('should detect GBP currency for UK stocks', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('BP.L');

      expect(quote.currency).toBe('GBP');
    });

    it('should throw error for invalid symbol (no data)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          c: 0,
          d: 0,
          dp: 0,
          h: 0,
          l: 0,
          o: 0,
          pc: 0,
          t: 0,
        }),
      });

      await expect(provider.getQuoteBySymbol('INVALID')).rejects.toThrow(
        PriceProviderError
      );

      await expect(provider.getQuoteBySymbol('INVALID')).rejects.toMatchObject({
        code: 'NO_DATA',
        statusCode: 404,
      });
    });
  });

  // ==========================================================================
  // getQuote Tests (Auto-detect)
  // ==========================================================================

  describe('getQuote', () => {
    it('should detect and fetch by symbol', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuote('AAPL');

      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(175.43);
    });

    it('should throw error for invalid identifier', async () => {
      await expect(provider.getQuote('invalid-123')).rejects.toThrow(
        PriceProviderError
      );

      await expect(provider.getQuote('invalid-123')).rejects.toMatchObject({
        code: 'INVALID_IDENTIFIER',
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(provider.getQuoteBySymbol('AAPL')).rejects.toMatchObject({
        name: 'PriceProviderError',
        provider: 'Finnhub',
        code: 'UNAUTHORIZED',
        statusCode: 401,
        retryable: false,
      });
    });

    it('should handle 404 Not Found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(provider.getQuoteBySymbol('INVALID')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
        retryable: false,
      });
    });

    it('should handle 429 Rate Limit Exceeded', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      });

      await expect(provider.getQuoteBySymbol('AAPL')).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryable: true,
      });
    });

    it('should handle 500 Server Error with retries', async () => {
      // Mock 2 failures, then success
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFinnhubQuoteResponse,
        });

      const quote = await provider.getQuoteBySymbol('AAPL');

      expect(quote.price).toBe(175.43);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      // Mock all failures
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.getQuoteBySymbol('AAPL')).rejects.toThrow(
        PriceProviderError
      );

      expect(global.fetch).toHaveBeenCalledTimes(2); // maxRetries = 2
    });

    it('should handle network timeout', async () => {
      // Create provider with short timeout
      const timeoutProvider = new FinnhubPriceProvider({
        apiKey: 'test-key',
        timeout: 100,
        maxRetries: 1,
        enableCache: false,
      });

      // Mock slow response
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockFinnhubQuoteResponse,
                }),
              200
            )
          )
      );

      await expect(timeoutProvider.getQuoteBySymbol('AAPL')).rejects.toMatchObject({
        code: 'TIMEOUT',
        retryable: true,
      });
    });
  });

  // ==========================================================================
  // Search Tests
  // ==========================================================================

  describe('searchStocks', () => {
    it('should search and parse results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubSearchResponse,
      });

      const results = await provider.searchStocks('Apple');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        symbol: 'AAPL',
        name: 'Apple Inc',
        currency: 'USD',
      });
    });

    it('should encode search query', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, result: [] }),
      });

      await provider.searchStocks('Apple Inc.');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=Apple%20Inc.'),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Health Check Tests
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const healthy = await provider.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should return false when API is down', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const healthy = await provider.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('currency detection', () => {
    it('should detect EUR for .DE suffix', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('SAP.DE');
      expect(quote.currency).toBe('EUR');
    });

    it('should detect GBP for .L suffix', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('HSBA.L');
      expect(quote.currency).toBe('GBP');
    });

    it('should default to USD for US stocks', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinnhubQuoteResponse,
      });

      const quote = await provider.getQuoteBySymbol('TSLA');
      expect(quote.currency).toBe('USD');
    });
  });
});
