'use client';

import { useState } from 'react';
import type { PortfolioSummary as PortfolioSummaryType, MonthlyPnL } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';
import { History, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  monthlyHistory?: MonthlyPnL[];
  onShowRealizedTrades?: () => void;
}

export default function PortfolioSummary({ summary, monthlyHistory = [], onShowRealizedTrades }: PortfolioSummaryProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Aktueller Monat (erstes Element, da die Liste neueste zuerst ist)
  const currentMonth = monthlyHistory.find(m => m.isCurrent);
  // Vergangene Monate (ohne aktuellen)
  const pastMonths = monthlyHistory.filter(m => !m.isCurrent);

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
              <History className="w-4 h-4" />
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

      {/* Monats-Sektion */}
      <div className="mt-6 pt-6 border-t border-border">
        {/* Aktueller Monat */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-secondary mb-1 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {currentMonth?.label || 'Diesen Monat'}
            </div>
            <div className={`text-xl font-bold tabular-nums ${getPnLColorClass(currentMonth?.pnlEur ?? summary.monthPnlEur)}`}>
              {formatCurrency(currentMonth?.pnlEur ?? summary.monthPnlEur)}
            </div>
            <div className="text-[10px] text-text-tertiary mt-0.5">
              Realisierter Gewinn
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-lg font-semibold tabular-nums ${getPnLColorClass(currentMonth?.pnlPct ?? summary.monthPnlPct)}`}>
              {formatPercent(currentMonth?.pnlPct ?? summary.monthPnlPct)}
            </div>
            {pastMonths.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 rounded-lg hover:bg-background-elevated transition-colors text-text-secondary hover:text-text-primary"
                title={showHistory ? 'Historie ausblenden' : 'Monatshistorie anzeigen'}
              >
                {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Monatshistorie (aufklappbar) */}
        {showHistory && pastMonths.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">
              Vergangene Monate
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {pastMonths.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background-elevated transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Farbiger Indikator-Balken */}
                    <div
                      className={`w-1 h-8 rounded-full flex-shrink-0 ${
                        m.pnlEur > 0 ? 'bg-profit' : m.pnlEur < 0 ? 'bg-loss' : 'bg-text-tertiary'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">{m.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className={`text-sm font-bold tabular-nums ${getPnLColorClass(m.pnlEur)}`}>
                      {formatCurrency(m.pnlEur)}
                    </div>
                    <div className={`text-xs font-semibold tabular-nums min-w-[60px] text-right ${getPnLColorClass(m.pnlPct)}`}>
                      {formatPercent(m.pnlPct)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
