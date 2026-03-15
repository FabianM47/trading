'use client';

import { TrendingUp, TrendingDown, Wallet, Target, BarChart3, Clock } from 'lucide-react';
import type { BotStats, BotTrade } from '@/types/trading-bot';

interface BotDashboardTabProps {
  stats: BotStats | null;
  recentTrades: BotTrade[];
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: 'profit' | 'loss' | 'neutral';
}) {
  const colorClass =
    color === 'profit'
      ? 'text-green-400'
      : color === 'loss'
        ? 'text-red-400'
        : 'text-zinc-100';

  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-zinc-500" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</div>
    </div>
  );
}

export default function BotDashboardTab({ stats, recentTrades, isLoading }: BotDashboardTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 text-center">
        <Wallet size={32} className="mx-auto mb-3 text-zinc-500" />
        <p className="text-zinc-400 text-sm">
          Noch keine Bot-Konfiguration vorhanden. Gehe zu &quot;Einstellungen&quot; um den Bot einzurichten.
        </p>
      </div>
    );
  }

  const pnlColor = stats.totalRealizedPnL > 0 ? 'profit' : stats.totalRealizedPnL < 0 ? 'loss' : 'neutral';
  const budgetUsedPct = stats.virtualBudget > 0
    ? Math.round(((stats.virtualBudget - stats.remainingBudget) / stats.virtualBudget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Virtuelles Budget"
          value={`${stats.virtualBudget.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR`}
          icon={Wallet}
        />
        <StatCard
          label="Verfuegbar"
          value={`${stats.remainingBudget.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR`}
          icon={Wallet}
          color={stats.remainingBudget < stats.virtualBudget * 0.1 ? 'loss' : 'neutral'}
        />
        <StatCard
          label="Offene Positionen"
          value={`${stats.openTrades}`}
          icon={Target}
        />
        <StatCard
          label="Win-Rate"
          value={stats.closedTrades > 0 ? `${stats.winRate.toFixed(1)}%` : '–'}
          icon={BarChart3}
          color={stats.winRate >= 50 ? 'profit' : stats.winRate > 0 ? 'loss' : 'neutral'}
        />
        <StatCard
          label="Realisierter P&L"
          value={`${stats.totalRealizedPnL >= 0 ? '+' : ''}${stats.totalRealizedPnL.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR`}
          icon={stats.totalRealizedPnL >= 0 ? TrendingUp : TrendingDown}
          color={pnlColor}
        />
        <StatCard
          label="Trades gesamt"
          value={`${stats.totalTrades}`}
          icon={BarChart3}
        />
        <StatCard
          label="Avg. Haltedauer"
          value={stats.closedTrades > 0 ? `${stats.avgHoldingDays} Tage` : '–'}
          icon={Clock}
        />
        <StatCard
          label="Budget genutzt"
          value={`${budgetUsedPct}%`}
          icon={Wallet}
        />
      </div>

      {/* Active Strategy */}
      {stats.activeStrategyName && (
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Aktive Strategie</span>
          <p className="text-zinc-100 font-medium mt-1">{stats.activeStrategyName}</p>
        </div>
      )}

      {/* Recent Trades */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Letzte Trades</h3>
        {recentTrades.length === 0 ? (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">Noch keine Bot-Trades vorhanden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrades.slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      trade.isClosed
                        ? trade.realizedPnL && trade.realizedPnL > 0
                          ? 'bg-green-400'
                          : 'bg-red-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div>
                    <span className="text-sm text-zinc-100 font-medium">{trade.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">{trade.ticker || trade.isin}</span>
                  </div>
                </div>
                <div className="text-right">
                  {trade.isClosed && trade.realizedPnL !== undefined ? (
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        trade.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {trade.realizedPnL >= 0 ? '+' : ''}
                      {trade.realizedPnL.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR
                    </span>
                  ) : (
                    <span className="text-xs text-blue-400">Offen</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
