'use client';

import type { PortfolioSummary as PortfolioSummaryType } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export default function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  return (
    <div className="bg-background-card rounded-card p-6 border border-border shadow-card mb-6">
      <h2 className="text-lg font-semibold mb-6 text-text-secondary">Portfolio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Gesamtwert */}
        <div>
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Gesamtwert</div>
          <div className="text-3xl font-bold mb-2 tabular-nums">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="text-xs text-text-tertiary">
            Investiert: {formatCurrency(summary.totalInvested)}
          </div>
        </div>

        {/* Gesamt P/L */}
        <div>
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Gesamt P/L</div>
          <div className={`text-3xl font-bold mb-2 tabular-nums ${getPnLColorClass(summary.pnlEur)}`}>
            {formatCurrency(summary.pnlEur)}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${getPnLColorClass(summary.pnlPct)}`}>
            {formatPercent(summary.pnlPct)}
          </div>
        </div>

        {/* Diesen Monat */}
        <div>
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Diesen Monat</div>
          <div className={`text-3xl font-bold mb-2 tabular-nums ${getPnLColorClass(summary.monthPnlEur)}`}>
            {formatCurrency(summary.monthPnlEur)}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${getPnLColorClass(summary.monthPnlPct)}`}>
            {formatPercent(summary.monthPnlPct)}
          </div>
        </div>
      </div>
    </div>
  );
}
