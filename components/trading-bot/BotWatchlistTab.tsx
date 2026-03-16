'use client';

import { useState } from 'react';
import { Plus, Search, Trash2, ToggleLeft, ToggleRight, Loader2, Eye } from 'lucide-react';
import type { BotWatchlistItem } from '@/types/trading-bot';
import { searchStocks } from '@/lib/quoteProvider';

interface BotWatchlistTabProps {
  watchlist: BotWatchlistItem[];
  isLoading: boolean;
  onAdd: (item: { isin: string; ticker?: string; name: string; currency?: 'EUR' | 'USD' }) => Promise<void>;
  onUpdate: (data: { id: string; isActive?: boolean; notes?: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

interface SearchResult {
  isin: string;
  ticker?: string;
  name: string;
  currency?: string;
}

export default function BotWatchlistTab({
  watchlist,
  isLoading,
  onAdd,
  onUpdate,
  onRemove,
}: BotWatchlistTabProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchStocks(searchQuery.trim());
      setSearchResults(results.map(r => ({
        isin: r.isin,
        ticker: r.ticker,
        name: r.name,
        currency: r.currency,
      })));
    } catch {
      // Search failed silently
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (result: SearchResult) => {
    await onAdd({
      isin: result.isin,
      ticker: result.ticker,
      name: result.name,
      currency: (result.currency === 'USD' ? 'USD' : 'EUR') as 'EUR' | 'USD',
    });
    setSearchResults([]);
    setSearchQuery('');
    setShowSearch(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-zinc-400">
          {watchlist.length} {watchlist.length === 1 ? 'Aktie' : 'Aktien'} in der Watchlist
        </h3>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
        >
          <Plus size={14} />
          Hinzufügen
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Aktie suchen (Name, ISIN, Ticker)..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Suchen'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((result, i) => {
                const alreadyAdded = watchlist.some(w => w.isin === result.isin);
                return (
                  <button
                    key={`${result.isin}-${i}`}
                    onClick={() => !alreadyAdded && handleAddFromSearch(result)}
                    disabled={alreadyAdded}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      alreadyAdded
                        ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                        : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <span className="text-sm">{result.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">{result.ticker || result.isin}</span>
                    </div>
                    {alreadyAdded && (
                      <span className="text-xs text-zinc-600">Bereits vorhanden</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 text-center">
          <Eye size={32} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400 text-sm">Noch keine Aktien in der Watchlist.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-400' : 'bg-zinc-600'}`}
                />
                <div>
                  <span className="text-sm text-zinc-100 font-medium">{item.name}</span>
                  <span className="text-xs text-zinc-500 ml-2">{item.ticker || item.isin}</span>
                  <span className="text-xs text-zinc-600 ml-2">{item.currency}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdate({ id: item.id, isActive: !item.isActive })}
                  className={`p-2 transition-colors ${
                    item.isActive ? 'text-green-400 hover:text-green-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={item.isActive ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {item.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`"${item.name}" aus der Watchlist entfernen?`)) {
                      setRemovingId(item.id);
                      await onRemove(item.id);
                      setRemovingId(null);
                    }
                  }}
                  disabled={removingId === item.id}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Entfernen"
                >
                  {removingId === item.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
