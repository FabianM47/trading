'use client';

import { X, TrendingUp, TrendingDown, Calendar, DollarSign, Edit2, Trash2, BanknoteX } from 'lucide-react';
import TradingViewChart, { getTradingViewSymbol } from './TradingViewChart';
import type { AggregatedPosition, Trade } from '@/types';

interface PositionDetailModalProps {
  position: AggregatedPosition | null;
  onClose: () => void;
  onEditTrade?: (tradeId: string) => void;
  onCloseTrade?: (tradeId: string) => void;
  onDeleteTrade?: (tradeId: string) => void;
}

export default function PositionDetailModal({ 
  position, 
  onClose,
  onEditTrade,
  onCloseTrade,
  onDeleteTrade,
}: PositionDetailModalProps) {
  if (!position) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // TradingView Symbol erstellen
  const tvSymbol = getTradingViewSymbol(position.ticker, position.isin, position.productType);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background-card border-b border-border p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{position.name}</h2>
              {position.isDerivative && position.leverage && (
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded border border-orange-500/30">
                  {position.leverage}x Hebel
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-text-secondary">
              <span className="font-mono">{position.ticker}</span>
              {position.isin && (
                <>
                  <span>•</span>
                  <span className="text-sm">{position.isin}</span>
                </>
              )}
              {position.productType && (
                <>
                  <span>•</span>
                  <span className="text-sm">{position.productType}</span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-background-elevated rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        {/* Position Übersicht - Key Metrics */}
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-white mb-4">Position Übersicht</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <StatCard 
              label="Gesamtmenge" 
              value={position.totalQuantity.toFixed(2)}
              icon={<DollarSign className="w-4 h-4" />}
            />
            
            <StatCard 
              label="Ø Kaufpreis" 
              value={formatCurrency(position.averageBuyPrice, position.currency)}
              icon={<TrendingDown className="w-4 h-4" />}
            />
            
            <StatCard 
              label="Aktueller Preis" 
              value={formatCurrency(position.currentPrice, position.currency)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            
            <StatCard 
              label="Gesamt P/L" 
              value={formatCurrency(position.totalPnL, 'EUR')}
              valueColor={position.totalPnL >= 0 ? 'text-profit' : 'text-loss'}
              subValue={formatPercent(position.totalPnLPercent)}
              icon={position.totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            />
            
            <StatCard 
              label="Investiert" 
              value={formatCurrency(position.totalInvested, 'EUR')}
            />
            
            <StatCard 
              label="Aktueller Wert" 
              value={formatCurrency(position.currentValue, 'EUR')}
            />
            
            <StatCard 
              label="Unrealisiert" 
              value={formatCurrency(position.unrealizedPnL, 'EUR')}
              valueColor={position.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}
            />
            
            <StatCard 
              label="Realisiert" 
              value={formatCurrency(position.realizedPnL, 'EUR')}
              valueColor={position.realizedPnL >= 0 ? 'text-profit' : 'text-loss'}
            />
            
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-white mb-4">Chart</h3>
          <div className="rounded-lg overflow-hidden">
            <TradingViewChart 
              symbol={tvSymbol}
              height={450}
              theme="dark"
            />
          </div>
        </div>

        {/* Offene Trades */}
        {position.openTrades.length > 0 && (
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-white mb-4">
              Offene Trades ({position.openTrades.length})
            </h3>
            <TradeList 
              trades={position.openTrades} 
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onEdit={onEditTrade}
              onClose={onCloseTrade}
              onDelete={onDeleteTrade}
            />
          </div>
        )}

        {/* Geschlossene Trades */}
        {position.closedTrades.length > 0 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Geschlossene Trades ({position.closedTrades.length})
            </h3>
            <TradeList 
              trades={position.closedTrades}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              isClosed={true}
            />
          </div>
        )}

        {/* Falls keine Trades vorhanden */}
        {position.trades.length === 0 && (
          <div className="p-6 text-center text-text-secondary">
            Keine Trades gefunden
          </div>
        )}

      </div>
    </div>
  );
}

// Stat Card Komponente
function StatCard({ 
  label, 
  value, 
  valueColor = 'text-white',
  subValue,
  icon,
}: { 
  label: string; 
  value: string; 
  valueColor?: string;
  subValue?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-background-elevated rounded-lg p-4 border border-border">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-text-secondary">{icon}</span>}
        <div className="text-xs text-text-secondary">{label}</div>
      </div>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
      {subValue && (
        <div className={`text-sm mt-1 ${valueColor}`}>{subValue}</div>
      )}
    </div>
  );
}

// Trade List Komponente
function TradeList({ 
  trades,
  formatCurrency,
  formatDate,
  onEdit,
  onClose,
  onDelete,
  isClosed = false,
}: { 
  trades: Trade[];
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: string) => string;
  onEdit?: (tradeId: string) => void;
  onClose?: (tradeId: string) => void;
  onDelete?: (tradeId: string) => void;
  isClosed?: boolean;
}) {
  return (
    <div className="space-y-3">
      {trades.map(trade => {
        const pnl = trade.realizedPnL || (
          trade.currentPrice 
            ? (trade.currentPrice * trade.quantity) - trade.investedEur 
            : 0
        );
        const pnlPercent = trade.investedEur > 0 ? (pnl / trade.investedEur) * 100 : 0;

        return (
          <div 
            key={trade.id} 
            className="bg-background-elevated rounded-lg p-4 border border-border hover:border-border-hover transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Links: Mengen- und Datumsinformationen */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {trade.quantity} Stück
                  </span>
                  {trade.isDerivative && trade.leverage && (
                    <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded">
                      {trade.leverage}x
                    </span>
                  )}
                </div>
                <div className="text-sm text-text-secondary mt-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Kauf: {formatDate(trade.buyDate)}</span>
                  {isClosed && trade.closedAt && (
                    <>
                      <span>•</span>
                      <span>Verkauf: {formatDate(trade.closedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mitte: Preise */}
              <div className="flex-1 text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-text-secondary text-xs">Kaufpreis</div>
                    <div className="text-white font-medium">
                      {formatCurrency(trade.buyPrice, trade.currency)}
                    </div>
                  </div>
                  {isClosed && trade.sellPrice && (
                    <div>
                      <div className="text-text-secondary text-xs">Verkaufspreis</div>
                      <div className="text-white font-medium">
                        {formatCurrency(trade.sellPrice, trade.currency)}
                      </div>
                    </div>
                  )}
                  {!isClosed && trade.currentPrice && (
                    <div>
                      <div className="text-text-secondary text-xs">Aktuell</div>
                      <div className="text-white font-medium">
                        {formatCurrency(trade.currentPrice, trade.currency)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rechts: P/L und Actions */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-base font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'EUR')}
                  </div>
                  <div className={`text-sm ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Action Buttons für offene Trades */}
                {!isClosed && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(trade.id)}
                        className="p-2 hover:bg-background-card rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4 text-text-secondary" />
                      </button>
                    )}
                    {onClose && (
                      <button
                        onClick={() => onClose(trade.id)}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Schließen"
                      >
                        <BanknoteX className="w-4 h-4 text-green-500" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(trade.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
