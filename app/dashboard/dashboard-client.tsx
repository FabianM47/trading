/**
 * Dashboard Client Component
 * 
 * Displays portfolio with live prices and P/L calculations
 * Auto-refresh every 60 seconds
 */

'use client';

import { LivePriceDisplay } from '@/components/prices/LivePriceDisplay';
import { PortfolioLivePrices, type PortfolioPosition } from '@/components/prices/PortfolioLivePrices';

interface DashboardClientProps {
  positions: PortfolioPosition[];
  portfolioName: string;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardClient({ positions, portfolioName, user }: DashboardClientProps) {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Portfolio: {portfolioName}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Eingeloggt als</p>
            <p className="font-medium">{user.name || user.email}</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Live-Kurse aktiv
            </h3>
            <p className="text-sm text-blue-800">
              Alle Kurse werden automatisch alle 60 Sekunden aktualisiert, solange Sie diese Seite geöffnet haben.
              Keine Hintergrund-Jobs - 100% clientseitiges Polling (Vercel Hobby kompatibel).
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {positions.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-xl text-gray-600 mb-4">
            Keine Positionen vorhanden
          </p>
          <p className="text-gray-500 mb-6">
            Fügen Sie Trades hinzu, um Ihr Portfolio zu verfolgen.
          </p>
          <a
            href="/trades/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Trade hinzufügen
          </a>
        </div>
      )}

      {/* Portfolio Table */}
      {positions.length > 0 && (
        <PortfolioLivePrices
          positions={positions}
          refreshInterval={60000}
        />
      )}

      {/* Individual Position Cards (first 3) */}
      {positions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Detailansicht</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.slice(0, 3).map((position) => (
              <div
                key={position.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
              >
                <LivePriceDisplay
                  instrumentId={position.instrumentId}
                  symbol={position.instrumentSymbol}
                  quantity={position.quantity}
                  avgCost={position.avgCost}
                  showRefreshIndicator={true}
                  refreshInterval={60000}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Development Hints */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <h3 className="font-mono text-sm font-semibold mb-2">
            🔧 Development Info
          </h3>
          <ul className="text-sm text-gray-700 space-y-1 font-mono">
            <li>• Positions loaded: {positions.length}</li>
            <li>• Auto-refresh: 60s (client-side polling)</li>
            <li>• API: GET /api/prices</li>
            <li>• Cache: Vercel KV (TTL 60s)</li>
            <li>• Provider: Finnhub</li>
            <li>• P/L: decimal.js (no float errors)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
