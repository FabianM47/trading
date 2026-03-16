'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Loader2, X, BookOpen } from 'lucide-react';
import type { BotTrade, BotWatchlistItem } from '@/types/trading-bot';
import BotTradeFormModal from './BotTradeFormModal';
import BotCloseTradeModal from './BotCloseTradeModal';
import BotLearningModal from './BotLearningModal';

interface BotTradesTabProps {
  trades: BotTrade[];
  watchlist: BotWatchlistItem[];
  isLoading: boolean;
  onCreateTrade: (data: Omit<BotTrade, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isClosed'>) => Promise<void>;
  onCloseTrade: (data: { id: string; sellPrice: number; sellTotal: number; realizedPnL: number; exitReason?: string }) => Promise<void>;
  onDeleteTrade: (id: string) => Promise<void>;
  onCreateLearning: (data: { botTradeId: string; isin: string; ticker?: string; outcome: 'win' | 'loss' | 'breakeven'; pnlAmount?: number; pnlPercent?: number; holdingDays?: number; lessonSummary?: string; whatWorked?: string; whatFailed?: string; tags?: string[] }) => Promise<void>;
}

type FilterStatus = 'all' | 'open' | 'closed';

export default function BotTradesTab({
  trades,
  watchlist,
  isLoading,
  onCreateTrade,
  onCloseTrade,
  onDeleteTrade,
  onCreateLearning,
}: BotTradesTabProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterIsin, setFilterIsin] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [closingTrade, setClosingTrade] = useState<BotTrade | null>(null);
  const [learningTrade, setLearningTrade] = useState<BotTrade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTrades = trades.filter((t) => {
    if (filterStatus === 'open' && t.isClosed) return false;
    if (filterStatus === 'closed' && !t.isClosed) return false;
    if (filterIsin && t.isin !== filterIsin) return false;
    return true;
  });

  // Get unique ISINs for filter dropdown
  const uniqueIsins = Array.from(new Set(trades.map(t => t.isin))).map(isin => {
    const trade = trades.find(t => t.isin === isin);
    return { isin, name: trade?.name || isin, ticker: trade?.ticker };
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'open', 'closed'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {status === 'all' ? 'Alle' : status === 'open' ? 'Offen' : 'Geschlossen'}
            </button>
          ))}
          {uniqueIsins.length > 0 && (
            <select
              value={filterIsin}
              onChange={(e) => setFilterIsin(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
            >
              <option value="">Alle Aktien</option>
              {uniqueIsins.map(({ isin, name, ticker }) => (
                <option key={isin} value={isin}>
                  {ticker || isin} - {name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={14} />
          Neuer Trade
        </button>
      </div>

      {/* Trades */}
      {filteredTrades.length === 0 ? (
        <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm">
            {trades.length === 0 ? 'Noch keine Bot-Trades vorhanden.' : 'Keine Trades fuer diesen Filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTrades.map((trade) => {
            const isExpanded = expandedId === trade.id;
            return (
              <div
                key={trade.id}
                className="bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
              >
                {/* Trade Row */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        trade.isClosed
                          ? trade.realizedPnL && trade.realizedPnL > 0
                            ? 'bg-green-400'
                            : trade.realizedPnL && trade.realizedPnL < 0
                              ? 'bg-red-400'
                              : 'bg-zinc-400'
                          : 'bg-blue-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-100 font-medium truncate">{trade.name}</span>
                        <span className="text-xs text-zinc-500">{trade.ticker || trade.isin}</span>
                        {trade.signalType !== 'manual' && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                            {trade.signalType === 'bot_signal' ? 'Signal' : 'Auto'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{trade.quantity}x @ {trade.buyPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {trade.currency}</span>
                        <span>{new Date(trade.buyDate).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                      <span className="text-sm text-zinc-400 tabular-nums">
                        {trade.investedAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-zinc-500" />
                    ) : (
                      <ChevronDown size={14} className="text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-zinc-800 pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      {trade.stopLoss && (
                        <div>
                          <span className="text-zinc-500">Stop Loss</span>
                          <p className="text-red-400 font-medium">{trade.stopLoss.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      {trade.takeProfit && (
                        <div>
                          <span className="text-zinc-500">Take Profit</span>
                          <p className="text-green-400 font-medium">{trade.takeProfit.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      {trade.riskRewardRatio && (
                        <div>
                          <span className="text-zinc-500">Risk/Reward</span>
                          <p className="text-zinc-300 font-medium">1:{trade.riskRewardRatio}</p>
                        </div>
                      )}
                      {trade.isClosed && trade.sellPrice && (
                        <div>
                          <span className="text-zinc-500">Verkaufspreis</span>
                          <p className="text-zinc-300 font-medium">{trade.sellPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </div>
                    {trade.entryReason && (
                      <div className="mb-2">
                        <span className="text-xs text-zinc-500">Entry Reason</span>
                        <p className="text-xs text-zinc-400 mt-0.5 whitespace-pre-wrap">{trade.entryReason}</p>
                      </div>
                    )}
                    {trade.exitReason && (
                      <div className="mb-2">
                        <span className="text-xs text-zinc-500">Exit Reason</span>
                        <p className="text-xs text-zinc-400 mt-0.5 whitespace-pre-wrap">{trade.exitReason}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {!trade.isClosed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClosingTrade(trade);
                          }}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
                        >
                          Trade schliessen
                        </button>
                      )}
                      {trade.isClosed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLearningTrade(trade);
                          }}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors inline-flex items-center gap-1"
                        >
                          <BookOpen size={12} />
                          Learning
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Trade wirklich loeschen?')) {
                            setDeletingId(trade.id);
                            await onDeleteTrade(trade.id);
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === trade.id}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                      >
                        {deletingId === trade.id ? <Loader2 size={12} className="animate-spin" /> : 'Loeschen'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <BotTradeFormModal
          watchlist={watchlist}
          onSave={async (data) => {
            await onCreateTrade(data);
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {closingTrade && (
        <BotCloseTradeModal
          trade={closingTrade}
          onClose={async (data) => {
            await onCloseTrade(data);
            setClosingTrade(null);
          }}
          onCancel={() => setClosingTrade(null)}
        />
      )}

      {learningTrade && (
        <BotLearningModal
          trade={learningTrade}
          onSave={async (data) => {
            await onCreateLearning(data);
            setLearningTrade(null);
          }}
          onClose={() => setLearningTrade(null)}
        />
      )}
    </div>
  );
}
