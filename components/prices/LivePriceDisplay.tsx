/**
 * Live Price Display Component with P/L Calculation
 * 
 * Features:
 * - Current price with currency
 * - Change indicators (↑↓ with green/red)
 * - "Stand: HH:MM:SS" timestamp
 * - Loading skeleton
 * - Error handling
 * - Profit/Loss calculation (optional)
 */

'use client';

import { useLivePrice } from '@/hooks/useLivePrices';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface LivePriceDisplayProps {
  /** Instrument UUID */
  instrumentId: string;

  /** Symbol for display */
  symbol: string;

  /** Optional: Quantity for P/L calculation */
  quantity?: number;

  /** Optional: Average purchase price for P/L */
  avgCost?: number;

  /** Show compact variant */
  compact?: boolean;

  /** Show refresh indicator */
  showRefreshIndicator?: boolean;

  /** Refresh interval (ms) */
  refreshInterval?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp to HH:MM:SS
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format price with currency
 */
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format percentage
 */
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Calculate P/L using decimal.js (no float errors)
 */
function calculatePL(currentPrice: number, avgCost: number, quantity: number) {
  try {
    const current = new Decimal(currentPrice);
    const cost = new Decimal(avgCost);
    const qty = new Decimal(quantity);

    const totalValue = current.times(qty);
    const totalCost = cost.times(qty);
    const profitLoss = totalValue.minus(totalCost);
    const profitLossPercent = cost.isZero()
      ? new Decimal(0)
      : profitLoss.dividedBy(totalCost).times(100);

    return {
      value: totalValue.toNumber(),
      cost: totalCost.toNumber(),
      pl: profitLoss.toNumber(),
      plPercent: profitLossPercent.toNumber(),
    };
  } catch (error) {
    console.error('Error calculating P/L:', error);
    return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function LivePriceDisplay({
  instrumentId,
  symbol,
  quantity,
  avgCost,
  compact = false,
  showRefreshIndicator = true,
  refreshInterval = 60000,
}: LivePriceDisplayProps) {
  const { price, isLoading, error, lastUpdate, refresh } = useLivePrice(
    instrumentId,
    { refreshInterval }
  );

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Loading state
  if (isLoading && !price) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  // Error state
  if (error && !price) {
    return (
      <div className="text-red-600">
        <p className="font-medium">Fehler beim Laden</p>
        <button
          onClick={refresh}
          className="text-sm underline hover:no-underline"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // No data
  if (!price) {
    return (
      <div className="text-gray-500">
        <p>Keine Daten verfügbar</p>
      </div>
    );
  }

  // Calculate P/L if data provided
  const pl =
    quantity && avgCost
      ? calculatePL(price.price, avgCost, quantity)
      : null;

  // Determine color for price change
  const isPositive = price.isPositive ?? (price.change ?? 0) >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeIcon = isPositive ? '↑' : '↓';

  // Compact variant
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {formatPrice(price.price, price.currency)}
        </span>
        {price.changePercent !== undefined && (
          <span className={`text-sm ${changeColor}`}>
            {changeIcon} {formatPercent(price.changePercent)}
          </span>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-2">
      {/* Header with symbol */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{symbol}</h3>
        {showRefreshIndicator && (
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">
                Aktualisiert...
              </span>
            )}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              aria-label="Preis aktualisieren"
            >
              🔄
            </button>
          </div>
        )}
      </div>

      {/* Current price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">
          {formatPrice(price.price, price.currency)}
        </span>
        {price.changePercent !== undefined && (
          <span className={`text-lg font-medium ${changeColor}`}>
            {changeIcon} {formatPercent(price.changePercent)}
          </span>
        )}
      </div>

      {/* Change in absolute value */}
      {price.change !== undefined && (
        <div className={`text-sm ${changeColor}`}>
          {isPositive ? '+' : ''}
          {formatPrice(Math.abs(price.change), price.currency)}
        </div>
      )}

      {/* P/L display */}
      {pl && (
        <div className="mt-3 pt-3 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Wert ({quantity} Stk.):</span>
            <span className="font-medium">{formatPrice(pl.value, price.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Einstandswert:</span>
            <span>{formatPrice(pl.cost, price.currency)}</span>
          </div>
          <div className={`flex justify-between font-semibold ${pl.pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>Gewinn/Verlust:</span>
            <div className="text-right">
              <div>
                {pl.pl >= 0 ? '+' : ''}
                {formatPrice(pl.pl, price.currency)}
              </div>
              <div className="text-sm">
                ({formatPercent(pl.plPercent)})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>
          Stand: {lastUpdate ? formatTimestamp(lastUpdate) : formatTimestamp(currentTime)}
        </span>
      </div>

      {/* Day range (optional) */}
      {(price.high || price.low) && (
        <div className="text-xs text-gray-500 space-y-1">
          {price.low && price.high && (
            <div>
              Tagesspanne: {formatPrice(price.low, price.currency)} - {formatPrice(price.high, price.currency)}
            </div>
          )}
          {price.previousClose && (
            <div>
              Vortagesschlusskurs: {formatPrice(price.previousClose, price.currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Badge Variant
// ============================================================================

interface LivePriceBadgeProps {
  instrumentId: string;
  symbol: string;
  refreshInterval?: number;
}

export function LivePriceBadge({
  instrumentId,
  symbol,
  refreshInterval = 60000,
}: LivePriceBadgeProps) {
  const { price, isLoading } = useLivePrice(instrumentId, { refreshInterval });

  if (isLoading || !price) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm animate-pulse">
        {symbol}: ...
      </span>
    );
  }

  const isPositive = price.isPositive ?? (price.change ?? 0) >= 0;
  const bgColor = isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const changeIcon = isPositive ? '↑' : '↓';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
      <span>{symbol}:</span>
      <span>{formatPrice(price.price, price.currency)}</span>
      {price.changePercent !== undefined && (
        <span className="flex items-center gap-0.5">
          <span>{changeIcon}</span>
          <span>{Math.abs(price.changePercent).toFixed(2)}%</span>
        </span>
      )}
    </span>
  );
}
