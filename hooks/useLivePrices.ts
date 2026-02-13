/**
 * Custom SWR Hooks for Live Price Updates (Client-Polling)
 * 
 * Features:
 * - Auto-refresh every 60s
 * - Auth-protected API calls
 * - Error handling with retry
 * - Loading states
 * - Change indicators (green/red)
 * - Type-safe responses
 * 
 * Used by: Dashboard components
 * API: GET /api/prices?instrumentIds=id1,id2,id3
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';

// ============================================================================
// Types
// ============================================================================

export interface LivePrice {
  instrumentId: string;
  isin: string;
  symbol: string;
  price: number;
  currency: string;
  asOf: string;
  source: string;

  // Change indicators
  change?: number;
  changePercent?: number;
  isPositive?: boolean;

  // Day range (optional)
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface LivePricesResponse {
  success: boolean;
  timestamp: string;
  count: number;
  prices: LivePrice[];
  errors?: Array<{
    instrumentId: string;
    error: string;
  }>;
  metrics: {
    total: number;
    success: number;
    failed: number;
    cacheHits: number;
    apiCalls: number;
    cacheHitRate: number;
    durationMs: number;
  };
}

export interface UseLivePricesOptions {
  /** Refresh interval in milliseconds (default: 60000 = 60s) */
  refreshInterval?: number;

  /** Enable/disable auto-refresh (default: true) */
  refreshEnabled?: boolean;

  /** Revalidate on focus (default: true) */
  revalidateOnFocus?: boolean;

  /** Revalidate on reconnect (default: true) */
  revalidateOnReconnect?: boolean;
}

export interface UseLivePricesReturn {
  /** Current prices */
  prices: LivePrice[] | undefined;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | undefined;

  /** Timestamp of last update */
  lastUpdate: Date | undefined;

  /** Age of oldest price (seconds) */
  oldestAge: number | undefined;

  /** Cache hit rate (%) */
  cacheHitRate: number | undefined;

  /** Manually refresh */
  refresh: () => Promise<void>;

  /** Check if data is stale (>60s) */
  isStale: boolean;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('Failed to fetch prices');
    // Attach extra info to error
    try {
      const data = await res.json();
      (error as any).info = data;
      (error as any).status = res.status;
    } catch {
      // Ignore JSON parse errors
    }
    throw error;
  }

  return res.json();
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for live price updates with auto-refresh
 * 
 * @param instrumentIds - Array of instrument UUIDs
 * @param options - SWR configuration options
 * 
 * @example
 * ```tsx
 * const { prices, isLoading, error, lastUpdate } = useLivePrices([
 *   'uuid-1',
 *   'uuid-2'
 * ]);
 * ```
 */
export function useLivePrices(
  instrumentIds: string[],
  options?: UseLivePricesOptions
): UseLivePricesReturn {
  const {
    refreshInterval = 60000, // 60 seconds
    refreshEnabled = true,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
  } = options || {};

  // Build API URL (use new endpoint)
  const url =
    instrumentIds.length > 0
      ? `/api/prices?instrumentIds=${instrumentIds.join(',')}`
      : null;

  // SWR configuration
  const swrConfig: SWRConfiguration = {
    refreshInterval: refreshEnabled ? refreshInterval : 0,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval: 5000, // Dedupe requests within 5s
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onError: (error) => {
      console.error('Live prices fetch error:', error);
    },
  };

  // Fetch data with SWR
  const { data, error, mutate, isLoading } = useSWR<LivePricesResponse>(
    url,
    fetcher,
    swrConfig
  );

  // Calculate derived values
  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : undefined;
  const oldestAge = data?.metrics?.durationMs
    ? Math.round(data.metrics.durationMs / 1000)
    : undefined;
  const cacheHitRate = data?.metrics?.cacheHitRate;

  // Check if data is stale (>60s old)
  const isStale = lastUpdate
    ? Date.now() - lastUpdate.getTime() > 60000
    : false;

  return {
    prices: data?.prices,
    isLoading,
    error,
    lastUpdate,
    oldestAge,
    cacheHitRate,
    refresh: async () => {
      await mutate();
    },
    isStale,
  };
}

// ============================================================================
// Single Price Hook
// ============================================================================

/**
 * Hook for single instrument price with auto-refresh
 * 
 * @param instrumentId - Instrument UUID
 * @param options - SWR configuration options
 * 
 * @example
 * ```tsx
 * const { price, isLoading, error } = useLivePrice('uuid-1');
 * ```
 */
export function useLivePrice(
  instrumentId: string | undefined,
  options?: UseLivePricesOptions
) {
  const instrumentIds = instrumentId ? [instrumentId] : [];
  const result = useLivePrices(instrumentIds, options);

  return {
    ...result,
    price: result.prices?.[0],
  };
}
