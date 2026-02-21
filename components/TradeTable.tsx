'use client';

import { useState } from 'react';
import type { AggregatedPosition } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass, getPnLBadgeClass } from '@/lib/calculations';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface TradeTableProps {
  positions: AggregatedPosition[];
  onOpenPosition?: (position: AggregatedPosition) => void;
}

type SortField = 'name' | 'isin' | 'avgBuyPrice' | 'quantity' | 'currentPrice' | 'pnlEur' | 'pnlPct' | 'date' | 'value';
type SortDirection = 'asc' | 'desc' | null;

export default function TradeTable({ positions, onOpenPosition }: TradeTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

  // Sortierte Positionen
  const sortedPositions = [...positions].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'isin':
        aValue = (a.isin || '').toLowerCase();
        bValue = (b.isin || '').toLowerCase();
        break;
      case 'avgBuyPrice':
        aValue = a.averageBuyPrice;
        bValue = b.averageBuyPrice;
        break;
      case 'quantity':
        aValue = a.totalQuantity;
        bValue = b.totalQuantity;
        break;
      case 'currentPrice':
        aValue = a.currentPrice;
        bValue = b.currentPrice;
        break;
      case 'pnlEur':
        aValue = a.totalPnL;
        bValue = b.totalPnL;
        break;
      case 'pnlPct':
        aValue = a.totalPnLPercent;
        bValue = b.totalPnLPercent;
        break;
      case 'value':
        aValue = a.currentValue;
        bValue = b.currentValue;
        break;
      case 'date':
        aValue = new Date(a.lastBuyDate).getTime();
        bValue = new Date(b.lastBuyDate).getTime();
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
            <option value="value">Gesamtwert</option>
            <option value="currentPrice">Aktueller Preis</option>
            <option value="avgBuyPrice">Ø Kaufpreis</option>
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
        {sortedPositions.map((position) => (
          <div
            key={position.symbol}
            onClick={() => onOpenPosition?.(position)}
            className="p-4 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-base">
                  {position.name}
                  {position.isDerivative && position.leverage && (
                    <span className="ml-2 text-xs bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded font-bold">
                      {position.leverage}x
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  {position.ticker}
                  {position.isDerivative && position.productType && (
                    <span className="ml-1 text-purple-400">• {position.productType}</span>
                  )}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {position.openTrades.length} offen
                  {position.closedTrades.length > 0 && ` • ${position.closedTrades.length} geschlossen`}
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-2 py-1 rounded-md font-bold text-base tabular-nums ${getPnLBadgeClass(position.totalPnL)}`}>
                  {formatCurrency(position.totalPnL)}
                </div>
                <div className={`text-sm font-semibold tabular-nums mt-1 ${getPnLColorClass(position.totalPnLPercent)}`}>
                  {formatPercent(position.totalPnLPercent)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-text-secondary text-xs mb-1">Ø Kaufpreis</div>
                <div className="font-medium tabular-nums">{formatCurrency(position.averageBuyPrice)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">Aktuell</div>
                <div className="font-medium tabular-nums">{formatCurrency(position.currentPrice)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">Menge</div>
                <div className="font-medium tabular-nums">{position.totalQuantity.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs mb-1">Gesamtwert</div>
                <div className="font-medium tabular-nums">{formatCurrency(position.currentValue)}</div>
              </div>
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
                  Position
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
                onClick={() => handleSort('avgBuyPrice')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Ø Kaufpreis
                  <SortIcon field="avgBuyPrice" />
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
                onClick={() => handleSort('value')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Gesamtwert
                  <SortIcon field="value" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pnlEur')}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer hover:bg-background-card transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  Gesamt P/L
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Trades
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedPositions.map((position) => (
              <tr
                key={position.symbol}
                onClick={() => onOpenPosition?.(position)}
                className="hover:bg-background-elevated transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">
                    {position.name}
                    {position.isDerivative && position.leverage && (
                      <span className="ml-2 text-xs bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded font-bold">
                        {position.leverage}x
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {position.ticker}
                    {position.isDerivative && position.productType && (
                      <span className="ml-1 text-purple-400">• {position.productType}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {position.isin || '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatCurrency(position.averageBuyPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {position.totalQuantity.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {formatCurrency(position.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(position.currentValue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(position.totalPnL)}`}>
                    {formatCurrency(position.totalPnL)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tabular-nums ${getPnLBadgeClass(position.totalPnLPercent)}`}>
                    {formatPercent(position.totalPnLPercent)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-secondary">
                  <div>{position.openTrades.length} offen</div>
                  {position.closedTrades.length > 0 && (
                    <div className="text-xs opacity-60">{position.closedTrades.length} geschl.</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
