'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import type { BotTrade, BotWatchlistItem } from '@/types/trading-bot';
import { searchStocks, type StockSearchResult } from '@/lib/quoteProvider';

interface BotTradeFormModalProps {
  watchlist: BotWatchlistItem[];
  onSave: (data: Omit<BotTrade, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isClosed'>) => Promise<void>;
  onClose: () => void;
}

interface SelectedStock {
  isin: string;
  ticker: string;
  name: string;
  currency?: string;
  currentPrice?: number;
  source?: string;
}

export default function BotTradeFormModal({ watchlist, onSave, onClose }: BotTradeFormModalProps) {
  // Stock selection
  const [selectedStock, setSelectedStock] = useState<SelectedStock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Trade fields
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [signalType, setSignalType] = useState<'manual' | 'bot_signal' | 'bot_auto'>('manual');
  const [entryReason, setEntryReason] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const investedAmount = (parseFloat(buyPrice) || 0) * (parseFloat(quantity) || 0);

  const canSave = selectedStock && selectedStock.isin && selectedStock.name &&
    parseFloat(buyPrice) > 0 && parseFloat(quantity) > 0 && buyDate;

  // Debounced search - same pattern as TradeFormModal
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStock({
      isin: stock.isin,
      ticker: stock.ticker,
      name: stock.name,
      currency: stock.currency,
      currentPrice: stock.price,
      source: stock.source,
    });
    setSearchQuery('');
    setSearchResults([]);

    // Auto-fill price and currency from search result
    if (stock.price && stock.price > 0) {
      setBuyPrice(stock.price.toFixed(2));
    }
    if (stock.currency === 'USD' || stock.currency === 'EUR') {
      setCurrency(stock.currency);
    }
  };

  const handleWatchlistSelect = (item: BotWatchlistItem) => {
    setSelectedStock({
      isin: item.isin,
      ticker: item.ticker || '',
      name: item.name,
      currency: item.currency,
    });
    if (item.currency === 'USD' || item.currency === 'EUR') {
      setCurrency(item.currency);
    }
  };

  const handleSave = async () => {
    if (!canSave || !selectedStock) return;
    setIsSaving(true);
    try {
      await onSave({
        tradeId: crypto.randomUUID(),
        isin: selectedStock.isin,
        ticker: selectedStock.ticker || undefined,
        name: selectedStock.name,
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
          {/* Aktie auswählen */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Aktie</label>

            {selectedStock ? (
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{selectedStock.name}</div>
                  <div className="text-xs text-zinc-400">
                    {selectedStock.ticker} {selectedStock.isin && `• ${selectedStock.isin}`}
                    {selectedStock.currentPrice && selectedStock.currentPrice > 0 && (
                      <span className="ml-2 text-green-400">
                        • {selectedStock.currentPrice.toFixed(2)} {selectedStock.currency || 'EUR'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStock(null);
                    setBuyPrice('');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Ändern
                </button>
              </div>
            ) : (
              <>
                {/* Search input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Aktie suchen (Name, Ticker oder ISIN)..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>

                {/* Search loading */}
                {isSearching && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                    <Loader2 size={12} className="animate-spin" />
                    Durchsuche alle Quellen...
                  </div>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-zinc-700 rounded-lg max-h-48 overflow-y-auto bg-zinc-800/50">
                    {searchResults.map((stock, index) => (
                      <button
                        key={`${stock.isin}-${stock.ticker}-${index}`}
                        onClick={() => handleStockSelect(stock)}
                        className="w-full text-left p-2.5 hover:bg-zinc-800 border-b border-zinc-700/50 last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                              <span className="truncate">{stock.name}</span>
                              {stock.source && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  stock.source === 'ing' ? 'bg-blue-500/20 text-blue-400' :
                                  stock.source === 'yahoo' ? 'bg-green-500/20 text-green-400' :
                                  stock.source === 'finnhub' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {stock.source === 'ing' ? 'ING' :
                                   stock.source === 'yahoo' ? 'Yahoo' :
                                   stock.source === 'finnhub' ? 'Finnhub' : 'CoinGecko'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {stock.ticker} {stock.isin && `• ${stock.isin}`}
                            </div>
                          </div>
                          {stock.price && stock.price > 0 && (
                            <div className="text-right ml-2 flex-shrink-0">
                              <div className="text-xs font-semibold text-green-400 tabular-nums">
                                {stock.price.toFixed(2)} {stock.currency || 'EUR'}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Keine Ergebnisse gefunden.
                  </div>
                )}

                {/* Quick select from watchlist */}
                {!searchQuery && watchlist.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Schnellauswahl aus Watchlist</div>
                    <div className="flex flex-wrap gap-1.5">
                      {watchlist.slice(0, 8).map((item) => (
                        <button
                          key={item.isin}
                          onClick={() => handleWatchlistSelect(item)}
                          className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                        >
                          {item.ticker || item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

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
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Stückzahl</label>
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
              <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1 block">Währung</label>
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
              placeholder="Warum wird dieser Trade eröffnet?"
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
