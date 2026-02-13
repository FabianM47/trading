/**
 * Live Price Status Indicator
 * 
 * Shows update status in dashboard header
 * - Green dot: Live updates active
 * - Last update time
 * - Manual refresh button
 */

'use client';

import { useLivePrices } from '@/hooks/useLivePrices';

// ============================================================================
// Types
// ============================================================================

interface LivePriceStatusProps {
  instrumentIds: string[];
  refreshInterval?: number;
}

// ============================================================================
// Component
// ============================================================================

export function LivePriceStatus({
  instrumentIds,
  refreshInterval = 60000,
}: LivePriceStatusProps) {
  const {
    lastUpdate,
    isLoading,
    error,
    isStale,
    refresh,
    cacheHitRate,
  } = useLivePrices(instrumentIds, { refreshInterval });

  const lastUpdateTime = lastUpdate
    ? lastUpdate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    : '--:--:--';

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {!isLoading && !error && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-600 font-medium">Live</span>
          </>
        )}

        {isLoading && (
          <>
            <span className="animate-spin text-gray-400">↻</span>
            <span className="text-gray-600">Aktualisiere...</span>
          </>
        )}

        {error && !isLoading && (
          <>
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span className="text-red-600">Fehler</span>
          </>
        )}
      </div>

      {/* Divider */}
      <span className="text-gray-300">|</span>

      {/* Last Update */}
      <div className="flex items-center gap-2">
        <span className={isStale ? 'text-orange-600' : 'text-gray-600'}>
          Stand: {lastUpdateTime}
        </span>

        {isStale && (
          <span
            className="text-orange-600"
            title="Daten sind älter als 60 Sekunden"
          >
            ⚠
          </span>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={refresh}
        disabled={isLoading}
        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        title="Manuell aktualisieren"
      >
        <svg
          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Cache Info (Dev) */}
      {process.env.NODE_ENV === 'development' && cacheHitRate !== undefined && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500">
            Cache: {cacheHitRate}%
          </span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export function LivePriceStatusCompact({
  instrumentIds,
  refreshInterval = 60000,
}: LivePriceStatusProps) {
  const { lastUpdate, isLoading, error, isStale } = useLivePrices(
    instrumentIds,
    { refreshInterval }
  );

  const lastUpdateTime = lastUpdate
    ? lastUpdate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '--:--';

  return (
    <div className="flex items-center gap-2 text-xs">
      {!isLoading && !error && (
        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
      )}
      {isLoading && <span className="animate-spin">↻</span>}
      {error && <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>}

      <span className={isStale ? 'text-orange-600' : 'text-gray-500'}>
        {lastUpdateTime}
      </span>
    </div>
  );
}
