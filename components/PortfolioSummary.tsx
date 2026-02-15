'use client';

import type { PortfolioSummary as PortfolioSummaryType } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export default function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
      <h2 className="text-xl font-semibold mb-6">Portfolio-Übersicht</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gesamtwert */}
        <div>
          <div className="text-sm text-gray-500 mb-1">Gesamtwert</div>
          <div className="text-2xl font-bold mb-1">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="text-xs text-gray-500">
            Investiert: {formatCurrency(summary.totalInvested)}
          </div>
        </div>

        {/* Gesamt P/L */}
        <div>
          <div className="text-sm text-gray-500 mb-1">Gesamt P/L</div>
          <div className={`text-2xl font-bold mb-1 ${getPnLColorClass(summary.pnlEur)}`}>
            {formatCurrency(summary.pnlEur)}
          </div>
          <div className={`text-sm font-medium ${getPnLColorClass(summary.pnlPct)}`}>
            {formatPercent(summary.pnlPct)}
          </div>
        </div>

        {/* Diesen Monat */}
        <div>
          <div className="text-sm text-gray-500 mb-1">Diesen Monat</div>
          <div className={`text-2xl font-bold mb-1 ${getPnLColorClass(summary.monthPnlEur)}`}>
            {formatCurrency(summary.monthPnlEur)}
          </div>
          <div className={`text-sm font-medium ${getPnLColorClass(summary.monthPnlPct)}`}>
            {formatPercent(summary.monthPnlPct)}
          </div>
        </div>
      </div>
    </div>
  );
}
