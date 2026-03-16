'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { BotTrade, TradeOutcome } from '@/types/trading-bot';

interface BotLearningModalProps {
  trade: BotTrade;
  onSave: (data: {
    botTradeId: string;
    isin: string;
    ticker?: string;
    outcome: TradeOutcome;
    pnlAmount?: number;
    pnlPercent?: number;
    holdingDays?: number;
    lessonSummary?: string;
    whatWorked?: string;
    whatFailed?: string;
    tags?: string[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function BotLearningModal({ trade, onSave, onClose }: BotLearningModalProps) {
  const pnlAmount = trade.realizedPnL || 0;
  const pnlPct = trade.investedAmount > 0 ? (pnlAmount / trade.investedAmount) * 100 : 0;
  const holdingDays = trade.closedAt && trade.buyDate
    ? Math.ceil((new Date(trade.closedAt).getTime() - new Date(trade.buyDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const autoOutcome: TradeOutcome = pnlAmount > 0 ? 'win' : pnlAmount < 0 ? 'loss' : 'breakeven';

  const [outcome, setOutcome] = useState<TradeOutcome>(autoOutcome);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        botTradeId: trade.id,
        isin: trade.isin,
        ticker: trade.ticker,
        outcome,
        pnlAmount: Math.round(pnlAmount * 100) / 100,
        pnlPercent: Math.round(pnlPct * 100) / 100,
        holdingDays: Math.max(0, holdingDays),
        whatWorked: whatWorked || undefined,
        whatFailed: whatFailed || undefined,
        lessonSummary: lessonSummary || undefined,
        tags: tagsInput
          ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
          : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Trade-Learning</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Trade Summary */}
        <div className="p-4 space-y-4">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-100 font-medium">{trade.name}</div>
                <div className="text-xs text-zinc-500">{trade.ticker || trade.isin}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium tabular-nums ${pnlAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnlAmount >= 0 ? '+' : ''}{pnlAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR
                </div>
                <div className="text-xs text-zinc-500">{holdingDays} Tage Haltedauer</div>
              </div>
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">Ergebnis</label>
            <div className="flex gap-2">
              {(['win', 'loss', 'breakeven'] as TradeOutcome[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    outcome === o
                      ? o === 'win'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : o === 'loss'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-zinc-700 text-zinc-300 border border-zinc-600'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {o === 'win' ? 'Gewinn' : o === 'loss' ? 'Verlust' : 'Break-Even'}
                </button>
              ))}
            </div>
          </div>

          {/* What worked */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Was hat funktioniert?</label>
            <textarea
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              rows={2}
              placeholder="z.B. EMA Crossover war praezise, Timing war gut..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white resize-none"
            />
          </div>

          {/* What failed */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Was hat nicht funktioniert?</label>
            <textarea
              value={whatFailed}
              onChange={(e) => setWhatFailed(e.target.value)}
              rows={2}
              placeholder="z.B. Stop Loss zu eng, Trend hat sich gedreht..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white resize-none"
            />
          </div>

          {/* Lesson Summary */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Lektion / Zusammenfassung</label>
            <textarea
              value={lessonSummary}
              onChange={(e) => setLessonSummary(e.target.value)}
              rows={2}
              placeholder="Was nimmst du aus diesem Trade mit?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Tags (kommagetrennt)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z.B. breakout, earnings, reversal"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
