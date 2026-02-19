'use client';

import type { PortfolioSummary as PortfolioSummaryType } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  onShowRealizedTrades?: () => void;
}

export default function PortfolioSummary({ summary, onShowRealizedTrades }: PortfolioSummaryProps) {
  return (
    <div className="bg-background-card rounded-card p-6 border border-border shadow-card">
      <h2 className="text-lg font-semibold mb-6 text-text-secondary">Portfolio-Übersicht</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unrealisierter P/L */}
        <div>
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Unrealisiert P/L</div>
          <div className={`text-2xl lg:text-3xl font-bold mb-2 tabular-nums ${getPnLColorClass(summary.pnlEur)}`}>
            {formatCurrency(summary.pnlEur)}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${getPnLColorClass(summary.pnlPct)}`}>
            {formatPercent(summary.pnlPct)}
          </div>
        </div>

        {/* Realisierter Gewinn */}
        <div
          className={`${
            onShowRealizedTrades ? 'cursor-pointer hover:bg-background-elevated rounded-lg p-4 -m-4 transition-colors' : ''
          }`}
          onClick={onShowRealizedTrades}
          title={onShowRealizedTrades ? 'Klicken für Trade-Historie' : ''}
        >
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide flex items-center gap-1">
            Realisierter Gewinn
            {onShowRealizedTrades && (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          </div>
          <div className={`text-2xl lg:text-3xl font-bold mb-2 tabular-nums ${getPnLColorClass(summary.realizedPnL)}`}>
            {formatCurrency(summary.realizedPnL)}
          </div>
          <div className="text-xs text-text-tertiary">
            Aus geschlossenen Trades
          </div>
        </div>

        {/* Gesamtgewinn */}
        <div>
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Gesamtgewinn</div>
          <div className={`text-2xl lg:text-3xl font-bold mb-2 tabular-nums ${getPnLColorClass(summary.totalPnL)}`}>
            {formatCurrency(summary.totalPnL)}
          </div>
          <div className="text-xs text-text-tertiary">
            Realisiert + Unrealisiert
          </div>
        </div>
      </div>

      {/* Monat als separate Zeile */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Diesen Monat</div>
            <div className={`text-xl font-bold tabular-nums ${getPnLColorClass(summary.monthPnlEur)}`}>
              {formatCurrency(summary.monthPnlEur)}
            </div>
          </div>
          <div className={`text-lg font-semibold tabular-nums ${getPnLColorClass(summary.monthPnlPct)}`}>
            {formatPercent(summary.monthPnlPct)}
          </div>
        </div>
      </div>
    </div>
  );
}
