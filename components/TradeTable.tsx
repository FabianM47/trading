'use client';

import type { TradeWithPnL } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Mobile: Cards */}
      <div className="md:hidden">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="p-4 border-b border-gray-200 last:border-b-0"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">{trade.name}</div>
                <div className="text-xs text-gray-500">
                  {trade.ticker || trade.isin}
                </div>
              </div>
              <div className={`text-right font-semibold ${getPnLColorClass(trade.pnlEur)}`}>
                <div>{formatCurrency(trade.pnlEur)}</div>
                <div className="text-sm">{formatPercent(trade.pnlPct)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-500">Kaufkurs</div>
                <div>{formatCurrency(trade.buyPrice)}</div>
              </div>
              <div>
                <div className="text-gray-500">Aktuell</div>
                <div>{formatCurrency(trade.currentPrice)}</div>
              </div>
              <div>
                <div className="text-gray-500">Menge</div>
                <div>{trade.quantity}</div>
              </div>
              <div>
                <div className="text-gray-500">Datum</div>
                <div>{formatDate(trade.buyDate)}</div>
              </div>
            </div>
            {onDeleteTrade && (
              <button
                onClick={() => onDeleteTrade(trade.id)}
                className="mt-3 text-sm text-red-600 hover:text-red-800"
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
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Aktie
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ISIN
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Kaufkurs
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Menge
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktuell
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                P/L (EUR)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                P/L (%)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Datum
              </th>
              {onDeleteTrade && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Aktion
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{trade.name}</div>
                  <div className="text-xs text-gray-500">{trade.ticker}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {trade.isin}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(trade.buyPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {trade.quantity}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(trade.currentPrice)}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${getPnLColorClass(trade.pnlEur)}`}>
                  {formatCurrency(trade.pnlEur)}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${getPnLColorClass(trade.pnlPct)}`}>
                  {formatPercent(trade.pnlPct)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {formatDate(trade.buyDate)}
                </td>
                {onDeleteTrade && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeleteTrade(trade.id)}
                      className="text-sm text-red-600 hover:text-red-800"
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
