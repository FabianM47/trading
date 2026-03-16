'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { BotTrade } from '@/types/trading-bot';

interface BotCloseTradeModalProps {
  trade: BotTrade;
  onClose: (data: {
    id: string;
    sellPrice: number;
    sellTotal: number;
    realizedPnL: number;
    exitReason?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function BotCloseTradeModal({ trade, onClose, onCancel }: BotCloseTradeModalProps) {
  const [sellPrice, setSellPrice] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sellPriceNum = parseFloat(sellPrice) || 0;
  const sellTotal = sellPriceNum * trade.quantity;
  const realizedPnL = sellTotal - trade.investedAmount;
  const pnlPct = trade.investedAmount > 0 ? (realizedPnL / trade.investedAmount) * 100 : 0;

  const handleClose = async () => {
    if (sellPriceNum <= 0) return;
    setIsSaving(true);
    try {
      await onClose({
        id: trade.id,
        sellPrice: sellPriceNum,
        sellTotal: Math.round(sellTotal * 100) / 100,
        realizedPnL: Math.round(realizedPnL * 100) / 100,
        exitReason: exitReason || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Trade schließen</h2>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm text-zinc-100 font-medium">{trade.name}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {trade.quantity}x @ {trade.buyPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {trade.currency}
              {' | '}Investiert: {trade.investedAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {trade.currency}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Verkaufspreis</label>
            <input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              step="0.01"
              min="0"
              autoFocus
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          {sellPriceNum > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500">Verkaufssumme</div>
                <div className="text-sm text-zinc-100 font-medium tabular-nums">
                  {sellTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {trade.currency}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500">P&L</div>
                <div className={`text-sm font-medium tabular-nums ${realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {realizedPnL >= 0 ? '+' : ''}{realizedPnL.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {trade.currency}
                  <span className="text-xs ml-1">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Exit Reason (optional)</label>
            <textarea
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              rows={3}
              placeholder="Warum wird dieser Trade geschlossen?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleClose}
            disabled={sellPriceNum <= 0 || isSaving}
            className="bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            Trade schließen
          </button>
        </div>
      </div>
    </div>
  );
}
