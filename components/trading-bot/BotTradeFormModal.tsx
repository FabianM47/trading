'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { BotTrade, BotWatchlistItem } from '@/types/trading-bot';

interface BotTradeFormModalProps {
  watchlist: BotWatchlistItem[];
  onSave: (data: Omit<BotTrade, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isClosed'>) => Promise<void>;
  onClose: () => void;
}

export default function BotTradeFormModal({ watchlist, onSave, onClose }: BotTradeFormModalProps) {
  const [selectedIsin, setSelectedIsin] = useState('');
  const [customName, setCustomName] = useState('');
  const [customIsin, setCustomIsin] = useState('');
  const [customTicker, setCustomTicker] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [signalType, setSignalType] = useState<'manual' | 'bot_signal' | 'bot_auto'>('manual');
  const [entryReason, setEntryReason] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedWatchlistItem = watchlist.find(w => w.isin === selectedIsin);
  const useCustom = selectedIsin === '__custom__';

  const name = useCustom ? customName : (selectedWatchlistItem?.name || '');
  const isin = useCustom ? customIsin : (selectedWatchlistItem?.isin || '');
  const ticker = useCustom ? customTicker : (selectedWatchlistItem?.ticker || '');

  const investedAmount = (parseFloat(buyPrice) || 0) * (parseFloat(quantity) || 0);

  const canSave = name && isin && parseFloat(buyPrice) > 0 && parseFloat(quantity) > 0 && buyDate;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSave({
        tradeId: crypto.randomUUID(),
        isin,
        ticker: ticker || undefined,
        name,
        buyPrice: parseFloat(buyPrice),
        quantity: parseFloat(quantity),
        investedAmount,
        buyDate: new Date(buyDate).toISOString(),
        currency,
        signalType,
        entryReason: entryReason || undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        riskRewardRatio: stopLoss && takeProfit && buyPrice
          ? Math.round(((parseFloat(takeProfit) - parseFloat(buyPrice)) / (parseFloat(buyPrice) - parseFloat(stopLoss))) * 100) / 100
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
          <h2 className="text-lg font-semibold text-zinc-100">Neuer Bot-Trade</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Aktie auswaehlen */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Aktie</label>
            <select
              value={selectedIsin}
              onChange={(e) => setSelectedIsin(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="">Aus Watchlist waehlen...</option>
              {watchlist.map((item) => (
                <option key={item.isin} value={item.isin}>
                  {item.name} ({item.ticker || item.isin})
                </option>
              ))}
              <option value="__custom__">Manuell eingeben...</option>
            </select>
          </div>

          {/* Custom fields */}
          {useCustom && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">ISIN</label>
                <input
                  type="text"
                  value={customIsin}
                  onChange={(e) => setCustomIsin(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Ticker</label>
                <input
                  type="text"
                  value={customTicker}
                  onChange={(e) => setCustomTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          )}

          {/* Price & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Kaufpreis</label>
              <input
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Stueckzahl</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.0001"
                min="0"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          {/* Invested */}
          {investedAmount > 0 && (
            <div className="text-xs text-zinc-500">
              Investiert: <span className="text-zinc-300 font-medium">{investedAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {currency}</span>
            </div>
          )}

          {/* Date, Currency, Signal Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Datum</label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Waehrung</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD')}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Signal-Typ</label>
              <select
                value={signalType}
                onChange={(e) => setSignalType(e.target.value as 'manual' | 'bot_signal' | 'bot_auto')}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="manual">Manuell</option>
                <option value="bot_signal">Bot-Signal</option>
                <option value="bot_auto">Bot-Auto</option>
              </select>
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>

          {/* Entry Reason */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Entry Reason (optional)</label>
            <textarea
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              rows={3}
              placeholder="Warum wird dieser Trade eroeffnet?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white resize-none"
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
            disabled={!canSave || isSaving}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            Trade anlegen
          </button>
        </div>
      </div>
    </div>
  );
}
