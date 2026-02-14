/**
 * Header Indices Component
 * 
 * Displays major market indices (DAX, S&P 500, Nasdaq, Euro Stoxx 50)
 * with current prices and daily changes
 */

'use client';

import { useLivePrice } from '@/hooks/useLivePrices';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface IndexCardProps {
  /** Index name */
  name: string;

  /** Index symbol */
  symbol: string;

  /** Instrument ID for price fetching */
  instrumentId?: string;

  /** Fallback price if no live data */
  fallbackPrice?: number;

  /** Fallback change if no live data */
  fallbackChange?: number;
}

function IndexCard({ name, symbol, instrumentId, fallbackPrice, fallbackChange }: IndexCardProps) {
  // If instrumentId provided, fetch live price
  const { price: livePrice, isLoading } = instrumentId
    ? useLivePrice(instrumentId, { refreshInterval: 60000 })
    : { price: null, isLoading: false };

  const price = livePrice?.price ?? fallbackPrice ?? 0;
  const change = livePrice?.change ?? fallbackChange ?? 0;
  const changePercent = livePrice?.changePercent ?? 0;

  const isPositive = change > 0;
  const isNegative = change < 0;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {name}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {symbol}
            </span>
          </div>

          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {new Intl.NumberFormat('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(price)}
          </p>

          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive && 'text-green-600 dark:text-green-400',
              isNegative && 'text-red-600 dark:text-red-400',
              !isPositive && !isNegative && 'text-gray-600 dark:text-gray-400'
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>
              {change > 0 ? '+' : ''}
              {change.toFixed(2)}
            </span>
            <span className="text-xs">
              ({changePercent > 0 ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Header with major indices
 */
export function HeaderIndices() {
  // Fallback data for demo (replace with actual instrument IDs)
  const indices = [
    {
      name: 'DAX',
      symbol: '^GDAXI',
      fallbackPrice: 17850.43,
      fallbackChange: 125.67,
    },
    {
      name: 'S&P 500',
      symbol: '^GSPC',
      fallbackPrice: 5123.41,
      fallbackChange: -12.33,
    },
    {
      name: 'Nasdaq',
      symbol: '^IXIC',
      fallbackPrice: 16085.11,
      fallbackChange: 45.78,
    },
    {
      name: 'Euro Stoxx 50',
      symbol: '^STOXX50E',
      fallbackPrice: 4823.19,
      fallbackChange: 18.94,
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Märkte im Überblick
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indices.map((index) => (
          <IndexCard key={index.symbol} {...index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact variant for smaller spaces
 */
export function HeaderIndicesCompact() {
  const indices = [
    { name: 'DAX', fallbackPrice: 17850.43, fallbackChange: 125.67 },
    { name: 'S&P 500', fallbackPrice: 5123.41, fallbackChange: -12.33 },
    { name: 'Nasdaq', fallbackPrice: 16085.11, fallbackChange: 45.78 },
  ];

  return (
    <div className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">
      {indices.map((index) => {
        const isPositive = index.fallbackChange > 0;
        return (
          <div key={index.name} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {index.name}
            </span>
            <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {index.fallbackPrice.toFixed(2)}
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? '+' : ''}
              {index.fallbackChange.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
