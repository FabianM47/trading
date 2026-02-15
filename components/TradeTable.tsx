'use client';

import type { TradeWithPnL } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass, getPnLBadgeClass } from '@/lib/calculations';

interface TradeTableProps {
  trades: TradeWithPnL[];
  onDeleteTrade?: (tradeId: string) => void;
}

export default function TradeTable({ trades, onDeleteTrade }: TradeTableProps) {
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
      {/* Mobile: Cards */}
      <div className="md:hidden">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="p-4 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-base">{trade.name}</div>
                <div className="text-xs text-text-secondary">
                  {trade.ticker || trade.isin}
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-2 py-1 rounded-md font-bold text-base tabular-nums ${getPnLBadgeClass(trade.pnlEur)}`}>
                  {formatCurrency(trade.pnlEur)}
                </div>
                <div className={`text-sm font-semibold tabular-nums mt-1 ${getPnLColorClass(trade.pnlPct)}`}>
                  {formatPercent(trade.pnlPct)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-text-secondary text-xs">Kaufkurs</div>
                <div className="font-medium tabular-nums">{formatCurrency(trade.buyPrice)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">Aktuell</div>
                <div className="font-medium tabular-nums">{formatCurrency(trade.currentPrice)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">Menge</div>
                <div className="font-medium tabular-nums">{trade.quantity}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">Datum</div>
                <div className="font-medium">{formatDate(trade.buyDate)}</div>
              </div>
            </div>
            {onDeleteTrade && (
              <button
                onClick={() => onDeleteTrade(trade.id)}
                className="mt-3 text-sm text-loss hover:text-loss-dark transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-elevated border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Aktie
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                ISIN
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Kaufkurs
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Menge
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Aktuell
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                P/L (EUR)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                P/L (%)
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Datum
              </th>
              {onDeleteTrade && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Aktion
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-background-elevated transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold">{trade.name}</div>
                  <div className="text-xs text-text-secondary">{trade.ticker}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {trade.isin}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatCurrency(trade.buyPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {trade.quantity}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatCurrency(trade.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(trade.pnlEur)}`}>
                    {formatCurrency(trade.pnlEur)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(trade.pnlPct)}`}>
                    {formatPercent(trade.pnlPct)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  {formatDate(trade.buyDate)}
                </td>
                {onDeleteTrade && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeleteTrade(trade.id)}
                      className="text-sm text-loss hover:text-loss-dark transition-colors"
                    >
                      Löschen
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
