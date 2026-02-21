'use client';

import { useState } from 'react';
import type { TradeWithPnL } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass, getPnLBadgeClass } from '@/lib/calculations';
import { Trash2, Edit2, BanknoteX, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface TradeTableProps {
  trades: TradeWithPnL[];
  onDeleteTrade?: (tradeId: string) => void;
  onCloseTrade?: (tradeId: string) => void;
  onEditTrade?: (tradeId: string) => void;
}

type SortField = 'name' | 'isin' | 'buyPrice' | 'quantity' | 'currentPrice' | 'pnlEur' | 'pnlPct' | 'date';
type SortDirection = 'asc' | 'desc' | null;

export default function TradeTable({ trades, onDeleteTrade, onCloseTrade, onEditTrade }: TradeTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Sortier-Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Zyklus: null → asc → desc → null
      if (sortDirection === null) {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort-Icon für Header
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 text-accent" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4 text-accent" />;
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
  };

  // Sortierte Trades
  const sortedTrades = [...trades].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'isin':
        aValue = a.isin.toLowerCase();
        bValue = b.isin.toLowerCase();
        break;
      case 'buyPrice':
        aValue = a.buyPrice;
        bValue = b.buyPrice;
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'currentPrice':
        aValue = a.currentPrice;
        bValue = b.currentPrice;
        break;
      case 'pnlEur':
        aValue = a.pnlEur;
        bValue = b.pnlEur;
        break;
      case 'pnlPct':
        aValue = a.pnlPct;
        bValue = b.pnlPct;
        break;
      case 'date':
        aValue = new Date(a.buyDate).getTime();
        bValue = new Date(b.buyDate).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
      {/* Mobile: Sortier-Bar */}
      <div className="md:hidden sticky top-0 z-10 bg-background-elevated border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-primary font-medium whitespace-nowrap">Sortieren:</span>
          <select 
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            value={sortField || 'none'}
            onChange={(e) => {
              const field = e.target.value as SortField | 'none';
              if (field === 'none') {
                setSortField(null);
                setSortDirection(null);
              } else {
                setSortField(field);
                setSortDirection('desc');
              }
            }}
          >
            <option value="none">Standard</option>
            <option value="name">Name</option>
            <option value="pnlEur">Gewinn/Verlust (€)</option>
            <option value="pnlPct">Gewinn/Verlust (%)</option>
            <option value="currentPrice">Aktueller Preis</option>
            <option value="buyPrice">Kaufpreis</option>
            <option value="quantity">Menge</option>
            <option value="date">Datum</option>
          </select>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={`p-2.5 bg-background border border-border rounded-lg transition-colors ${
              !sortField ? 'opacity-50 cursor-not-allowed' : 'hover:bg-background-card active:bg-background-card'
            }`}
            disabled={!sortField}
            title={sortDirection === 'asc' ? 'Aufsteigend sortiert' : 'Absteigend sortiert'}
          >
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden">
        {sortedTrades.map((trade) => (
          <div
            key={trade.id}
            className={`p-4 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors ${
              trade.isClosed ? 'bg-background/50 opacity-75' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-base">
                  {trade.name}
                  {trade.isDerivative && trade.leverage && (
                    <span className="ml-2 text-xs bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded font-bold">
                      {trade.leverage}x
                    </span>
                  )}
                  {trade.isClosed && (
                    <span className="ml-2 text-xs bg-neutral-bg text-neutral px-2 py-0.5 rounded">
                      Geschlossen
                    </span>
                  )}
                  {!trade.isClosed && trade.partialSales && trade.partialSales.length > 0 && (
                    <span className="ml-2 text-xs bg-amber-500 bg-opacity-20 text-amber-500 px-2 py-0.5 rounded">
                      Teilverkauft
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  {trade.ticker || trade.isin}
                  {trade.isDerivative && trade.productType && (
                    <span className="ml-1 text-purple-400">• {trade.productType}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {trade.isClosed && trade.realizedPnL !== undefined ? (
                  <>
                    <div className={`inline-block px-2 py-1 rounded-md font-bold text-base tabular-nums ${getPnLBadgeClass(trade.realizedPnL)}`}>
                      {formatCurrency(trade.realizedPnL)}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Realisiert
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`inline-block px-2 py-1 rounded-md font-bold text-base tabular-nums ${getPnLBadgeClass(trade.pnlEur)}`}>
                      {formatCurrency(trade.pnlEur)}
                    </div>
                    <div className={`text-sm font-semibold tabular-nums mt-1 ${getPnLColorClass(trade.pnlPct)}`}>
                      {formatPercent(trade.pnlPct)}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <div className="text-text-secondary text-xs mb-1">Kaufkurs</div>
                <div className="font-medium tabular-nums">{formatCurrency(trade.buyPrice)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">
                  {trade.isClosed ? 'Verkaufskurs' : 'Aktuell'}
                </div>
                <div className="font-medium tabular-nums">
                  {trade.isClosed && trade.sellPrice
                    ? formatCurrency(trade.sellPrice)
                    : formatCurrency(trade.currentPrice)}
                </div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">Menge</div>
                <div className="font-medium tabular-nums">
                  {trade.quantity}
                  {trade.originalQuantity && trade.originalQuantity > trade.quantity && (
                    <span className="ml-1 text-xs text-amber-500" title={`Ursprünglich: ${trade.originalQuantity}`}>
                      ({trade.originalQuantity})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">
                  {trade.isClosed ? 'Verkauft am' : 'Gekauft am'}
                </div>
                <div className="font-medium">
                  {trade.isClosed && trade.closedAt
                    ? formatDate(trade.closedAt)
                    : formatDate(trade.buyDate)}
                </div>
              </div>
            </div>
            
            {/* Action Buttons - rechts positioniert für Daumen-Erreichbarkeit */}
            <div className="flex justify-end gap-3">
              {onEditTrade && (
                <button
                  onClick={() => onEditTrade(trade.id)}
                  className="text-white hover:text-gray-200 transition-colors p-2 active:bg-background-elevated rounded-lg"
                  title="Bearbeiten"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
              )}
              {!trade.isClosed && onCloseTrade && (
                <button
                  onClick={() => onCloseTrade(trade.id)}
                  className="text-green-500 hover:text-green-400 transition-colors p-2 active:bg-background-elevated rounded-lg"
                  title="Schließen"
                >
                  <BanknoteX className="w-6 h-6" />
                </button>
              )}
              {onDeleteTrade && (
                <button
                  onClick={() => onDeleteTrade(trade.id)}
                  className="text-loss hover:text-loss-dark transition-colors p-2 active:bg-background-elevated rounded-lg"
                  title="Löschen"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-elevated border-b border-border">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  Aktie
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('isin')}
                className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  ISIN
                  <SortIcon field="isin" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('buyPrice')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Kaufkurs
                  <SortIcon field="buyPrice" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('quantity')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Menge
                  <SortIcon field="quantity" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('currentPrice')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Aktuell
                  <SortIcon field="currentPrice" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pnlEur')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  P/L (EUR)
                  <SortIcon field="pnlEur" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pnlPct')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  P/L (%)
                  <SortIcon field="pnlPct" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('date')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Datum
                  <SortIcon field="date" />
                </div>
              </th>
              {(onDeleteTrade || onCloseTrade || onEditTrade) && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Aktion
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTrades.map((trade) => (
              <tr
                key={trade.id}
                className={`hover:bg-background-elevated transition-colors ${
                  trade.isClosed ? 'bg-background/50 opacity-75' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">
                    {trade.name}
                    {trade.isDerivative && trade.leverage && (
                      <span className="ml-2 text-xs bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded font-bold">
                        {trade.leverage}x
                      </span>
                    )}
                    {trade.isClosed && (
                      <span className="ml-2 text-xs bg-neutral-bg text-neutral px-2 py-0.5 rounded">
                        Geschlossen
                      </span>
                    )}
                    {!trade.isClosed && trade.partialSales && trade.partialSales.length > 0 && (
                      <span className="ml-2 text-xs bg-amber-500 bg-opacity-20 text-amber-500 px-2 py-0.5 rounded">
                        Teilverkauft
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {trade.ticker}
                    {trade.isDerivative && trade.productType && (
                      <span className="ml-1 text-purple-400">• {trade.productType}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {trade.isin}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatCurrency(trade.buyPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {trade.quantity}
                  {trade.originalQuantity && trade.originalQuantity > trade.quantity && (
                    <span className="ml-1 text-xs text-amber-500" title={`Ursprünglich: ${trade.originalQuantity}`}>
                      / {trade.originalQuantity}
                    </span>
                  )}
                  {trade.partialSales && trade.partialSales.length > 0 && (
                    <div className="text-xs text-amber-500 mt-0.5">
                      {trade.partialSales.length}× teilverkauft
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {trade.isClosed && trade.sellPrice
                    ? formatCurrency(trade.sellPrice)
                    : formatCurrency(trade.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right">
                  {trade.isClosed && trade.realizedPnL !== undefined ? (
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(trade.realizedPnL)}`}>
                      {formatCurrency(trade.realizedPnL)}
                    </span>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(trade.pnlEur)}`}>
                      {formatCurrency(trade.pnlEur)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {trade.isClosed ? (
                    <span className="text-xs text-text-secondary">—</span>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(trade.pnlPct)}`}>
                      {formatPercent(trade.pnlPct)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  {trade.isClosed && trade.closedAt
                    ? formatDate(trade.closedAt)
                    : formatDate(trade.buyDate)}
                </td>
                {(onDeleteTrade || onCloseTrade || onEditTrade) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      {onEditTrade && (
                        <button
                          onClick={() => onEditTrade(trade.id)}
                          className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-background-elevated rounded-lg"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {!trade.isClosed && onCloseTrade && (
                        <button
                          onClick={() => onCloseTrade(trade.id)}
                          className="text-green-500 hover:text-green-400 transition-colors p-2 hover:bg-background-elevated rounded-lg"
                          title="Schließen"
                        >
                          <BanknoteX className="w-5 h-5" />
                        </button>
                      )}
                      {onDeleteTrade && (
                        <button
                          onClick={() => onDeleteTrade(trade.id)}
                          className="text-loss hover:text-loss-dark transition-colors p-2 hover:bg-background-elevated rounded-lg"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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
