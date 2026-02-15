'use client';

import type { Trade } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass, getPnLBadgeClass } from '@/lib/calculations';

interface RealizedTradesModalProps {
  trades: Trade[];
  onClose: () => void;
}

export default function RealizedTradesModal({
  trades,
  onClose,
}: RealizedTradesModalProps) {
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Nur geschlossene Trades
  const closedTrades = trades.filter(t => t.isClosed);

  // Sortiere nach Schließungsdatum (neueste zuerst)
  const sortedTrades = [...closedTrades].sort((a, b) => {
    if (!a.closedAt || !b.closedAt) return 0;
    return new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime();
  });

  const totalRealized = sortedTrades.reduce(
    (sum, t) => sum + (t.realizedPnL || 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border-2 border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border bg-background-elevated">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Realisierte Trades
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {sortedTrades.length} geschlossene{' '}
                {sortedTrades.length === 1 ? 'Trade' : 'Trades'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Gesamt Realisiert */}
          <div className="mt-4 bg-background rounded-lg p-4 border-2 border-accent/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-primary font-medium">
                Gesamt realisierter Gewinn:
              </span>
              <span
                className={`text-2xl font-bold ${getPnLColorClass(totalRealized)}`}
              >
                {formatCurrency(totalRealized)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedTrades.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p className="text-lg mb-2">Keine geschlossenen Trades</p>
              <p className="text-sm">
                Geschlossene Trades erscheinen hier in der Historie
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTrades.map((trade) => {
                const pnlPct = trade.sellPrice
                  ? ((trade.sellPrice / trade.buyPrice - 1) * 100).toFixed(2)
                  : '0.00';
                
                return (
                  <div
                    key={trade.id}
                    className="bg-background-card border border-border rounded-lg p-4 hover:bg-background-elevated transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-base">
                            {trade.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {trade.ticker || trade.isin}
                          </div>
                        </div>
                        <div
                          className={`inline-block px-3 py-1 rounded-md font-bold text-base tabular-nums ${getPnLBadgeClass(
                            trade.realizedPnL || 0
                          )}`}
                        >
                          {formatCurrency(trade.realizedPnL || 0)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-text-secondary text-xs">
                            Kaufpreis
                          </div>
                          <div className="font-medium tabular-nums">
                            {formatCurrency(trade.buyPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary text-xs">
                            Verkaufspreis
                          </div>
                          <div className="font-medium tabular-nums">
                            {trade.sellPrice
                              ? formatCurrency(trade.sellPrice)
                              : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary text-xs">
                            Menge
                          </div>
                          <div className="font-medium tabular-nums">
                            {trade.quantity} Stück
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary text-xs">
                            Performance
                          </div>
                          <div
                            className={`font-medium tabular-nums ${getPnLColorClass(
                              trade.realizedPnL || 0
                            )}`}
                          >
                            {formatPercent(parseFloat(pnlPct))}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary text-xs">
                            Gekauft am
                          </div>
                          <div className="font-medium">
                            {formatDate(trade.buyDate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary text-xs">
                            Verkauft am
                          </div>
                          <div className="font-medium">
                            {trade.closedAt
                              ? formatDate(trade.closedAt)
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-7 md:gap-4 md:items-center">
                      <div className="col-span-2">
                        <div className="font-semibold">{trade.name}</div>
                        <div className="text-xs text-text-secondary">
                          {trade.ticker || trade.isin}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">
                          Kaufpreis
                        </div>
                        <div className="text-sm font-medium tabular-nums">
                          {formatCurrency(trade.buyPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">
                          Verkaufspreis
                        </div>
                        <div className="text-sm font-medium tabular-nums">
                          {trade.sellPrice
                            ? formatCurrency(trade.sellPrice)
                            : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">
                          Menge
                        </div>
                        <div className="text-sm font-medium tabular-nums">
                          {trade.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">
                          Performance
                        </div>
                        <div
                          className={`text-sm font-semibold tabular-nums ${getPnLColorClass(
                            trade.realizedPnL || 0
                          )}`}
                        >
                          {formatPercent(parseFloat(pnlPct))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">
                          Gewinn/Verlust
                        </div>
                        <div
                          className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(
                            trade.realizedPnL || 0
                          )}`}
                        >
                          {formatCurrency(trade.realizedPnL || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Dates Footer (Desktop) */}
                    <div className="hidden md:flex md:justify-between md:mt-3 md:pt-3 md:border-t md:border-border">
                      <div className="text-xs text-text-secondary">
                        Gekauft: {formatDate(trade.buyDate)}
                      </div>
                      <div className="text-xs text-text-secondary">
                        Verkauft:{' '}
                        {trade.closedAt ? formatDate(trade.closedAt) : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-border bg-background-elevated">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors font-semibold shadow-lg"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
