/**
 * Portfolio Table with Live Prices and P/L
 * 
 * Features:
 * - Batch fetch all positions efficiently
 * - Live price updates (60s)
 * - P/L calculation per position
 * - Total portfolio value
 * - Color-coded gains/losses
 * - "Stand: HH:MM:SS" indicator
 */

'use client';

import { useLivePrices } from '@/hooks/useLivePrices';
import Decimal from 'decimal.js';
import { useEffect, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PortfolioPosition {
  id: string;
  instrumentId: string;
  instrumentSymbol: string;
  instrumentName: string;
  isin: string;
  quantity: number;
  avgCost: number;
  currency: string;
}

interface PortfolioLivePricesProps {
  positions: PortfolioPosition[];
  refreshInterval?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Calculate P/L with decimal.js
 */
function calculatePositionPL(
  currentPrice: number,
  avgCost: number,
  quantity: number
) {
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

export function PortfolioLivePrices({
  positions,
  refreshInterval = 60000,
}: PortfolioLivePricesProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Extract instrument IDs for batch fetch
  const instrumentIds = useMemo(
    () => positions.map((p) => p.instrumentId),
    [positions]
  );

  // Fetch all prices in one batch
  const { prices, isLoading, error, lastUpdate, refresh, cacheHitRate } =
    useLivePrices(instrumentIds, {
      refreshInterval,
      refreshEnabled: true,
    });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    if (!prices) {
      return { totalValue: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0 };
    }

    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);

    positions.forEach((position) => {
      const price = prices.find((p) => p.instrumentId === position.instrumentId);
      if (price) {
        const pl = calculatePositionPL(
          price.price,
          position.avgCost,
          position.quantity
        );
        if (pl) {
          totalValue = totalValue.plus(pl.value);
          totalCost = totalCost.plus(pl.cost);
        }
      }
    });

    const totalPL = totalValue.minus(totalCost);
    const totalPLPercent = totalCost.isZero()
      ? new Decimal(0)
      : totalPL.dividedBy(totalCost).times(100);

    return {
      totalValue: totalValue.toNumber(),
      totalCost: totalCost.toNumber(),
      totalPL: totalPL.toNumber(),
      totalPLPercent: totalPLPercent.toNumber(),
    };
  }, [prices, positions]);

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Portfolio</h2>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>
              Stand: {lastUpdate ? formatTimestamp(lastUpdate) : formatTimestamp(currentTime)}
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Portfolio aktualisieren"
          >
            {isLoading ? 'Lädt...' : '🔄 Aktualisieren'}
          </button>

          {/* Cache hit rate (dev mode) */}
          {process.env.NODE_ENV === 'development' && cacheHitRate !== undefined && (
            <span className="text-xs text-gray-500">
              Cache: {cacheHitRate}%
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">
            Fehler beim Laden der Kurse
          </p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instrument
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Menge
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ø Einstand
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktueller Kurs
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wert
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                G/V
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                G/V %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positions.map((position) => {
              const price = prices?.find(
                (p) => p.instrumentId === position.instrumentId
              );

              const pl = price
                ? calculatePositionPL(price.price, position.avgCost, position.quantity)
                : null;

              const isPositiveChange = price?.isPositive ?? (price?.change ?? 0) >= 0;
              const changeColor = isPositiveChange
                ? 'text-green-600'
                : 'text-red-600';
              const plColor = (pl?.pl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600';

              return (
                <tr key={position.id} className="hover:bg-gray-50">
                  {/* Instrument */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {position.instrumentSymbol}
                      </span>
                      <span className="text-sm text-gray-500">
                        {position.instrumentName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {position.isin}
                      </span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {position.quantity}
                  </td>

                  {/* Avg Cost */}
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {formatPrice(position.avgCost, position.currency)}
                  </td>

                  {/* Current Price */}
                  <td className="px-6 py-4 text-right">
                    {isLoading && !price ? (
                      <div className="inline-block h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    ) : price ? (
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-gray-900">
                          {formatPrice(price.price, price.currency)}
                        </span>
                        {price.changePercent !== undefined && (
                          <span className={`text-xs ${changeColor}`}>
                            {isPositiveChange ? '↑' : '↓'}{' '}
                            {formatPercent(price.changePercent)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>

                  {/* Value */}
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {pl ? formatPrice(pl.value, position.currency) : '-'}
                  </td>

                  {/* P/L Absolute */}
                  <td className={`px-6 py-4 text-right text-sm font-semibold ${plColor}`}>
                    {pl ? (
                      <>
                        {pl.pl >= 0 ? '+' : ''}
                        {formatPrice(pl.pl, position.currency)}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* P/L Percent */}
                  <td className={`px-6 py-4 text-right text-sm font-semibold ${plColor}`}>
                    {pl ? formatPercent(pl.plPercent) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 font-bold">
            <tr>
              <td className="px-6 py-4" colSpan={4}>
                Gesamt
              </td>
              <td className="px-6 py-4 text-right">
                {formatPrice(totals.totalValue, 'EUR')}
              </td>
              <td
                className={`px-6 py-4 text-right ${totals.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
              >
                {totals.totalPL >= 0 ? '+' : ''}
                {formatPrice(totals.totalPL, 'EUR')}
              </td>
              <td
                className={`px-6 py-4 text-right ${totals.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
              >
                {formatPercent(totals.totalPLPercent)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info text */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <span>ℹ️</span>
        <span>
          Kurse werden automatisch alle {refreshInterval / 1000} Sekunden aktualisiert.
        </span>
      </div>
    </div>
  );
}
