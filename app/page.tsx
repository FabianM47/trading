'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import type { Trade, FilterOptions, QuotesApiResponse, TradeWithPnL } from '@/types';
import { loadTrades, saveTrades, addTrade, deleteTrade } from '@/lib/storage';
import {
  enrichTradeWithPnL,
  calculateFullPortfolioSummary,
  applyFilters,
} from '@/lib/calculations';

import IndexCards from '@/components/IndexCards';
import PortfolioSummary from '@/components/PortfolioSummary';
import EmptyState from '@/components/EmptyState';
import FiltersBar from '@/components/FiltersBar';
import TradeTable from '@/components/TradeTable';
import TradeFormModal from '@/components/TradeFormModal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: 'all',
    onlyWinners: false,
    searchQuery: '',
    sortBy: 'date',
  });

  // Trades aus localStorage laden
  useEffect(() => {
    setTrades(loadTrades());
  }, []);

  // ISINs für Quote-Abfrage
  const isins = useMemo(() => {
    return trades.map((t) => t.isin || t.ticker).filter(Boolean);
  }, [trades]);

  // Quotes mit SWR fetchen (alle 15 Minuten)
  const { data: quotesData, mutate } = useSWR<QuotesApiResponse>(
    isins.length > 0 ? `/api/quotes?isins=${isins.join(',')}` : null,
    fetcher,
    {
      refreshInterval: 15 * 60 * 1000, // 15 Minuten
      revalidateOnFocus: false,
    }
  );

  // Trades mit aktuellen Kursen anreichern
  const tradesWithPnL = useMemo<TradeWithPnL[]>(() => {
    if (!quotesData) return [];

    return trades.map((trade) => {
      const key = trade.isin || trade.ticker || '';
      const quote = quotesData.quotes[key];
      const currentPrice = quote?.price || trade.buyPrice; // Fallback auf Kaufkurs
      return enrichTradeWithPnL(trade, currentPrice);
    });
  }, [trades, quotesData]);

  // Filter anwenden
  const filteredTrades = useMemo(
    () => applyFilters(tradesWithPnL, filters),
    [tradesWithPnL, filters]
  );

  // Portfolio-Zusammenfassung (immer auf ALLEN Trades basierend)
  const portfolioSummary = useMemo(
    () => calculateFullPortfolioSummary(tradesWithPnL),
    [tradesWithPnL]
  );

  // Handlers
  const handleAddTrade = (trade: Trade) => {
    addTrade(trade);
    setTrades((prev) => [...prev, trade]);
  };

  const handleDeleteTrade = (tradeId: string) => {
    if (confirm('Trade wirklich löschen?')) {
      deleteTrade(tradeId);
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    }
  };

  const handleRefresh = () => {
    mutate();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              title="Kurse aktualisieren"
            >
              🔄 Aktualisieren
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              + Trade hinzufügen
            </button>
          </div>
        </div>

        {/* Indizes */}
        {quotesData?.indices && <IndexCards indices={quotesData.indices} />}

        {/* Inhalt */}
        {trades.length === 0 ? (
          <EmptyState onAddTrade={() => setIsModalOpen(true)} />
        ) : (
          <>
            {/* Portfolio-Übersicht */}
            <PortfolioSummary summary={portfolioSummary} />

            {/* Filter */}
            <FiltersBar filters={filters} onFiltersChange={setFilters} />

            {/* Trades Liste */}
            {filteredTrades.length === 0 ? (
              <div className="bg-white rounded-lg p-8 border border-gray-200 text-center text-gray-600">
                Keine Trades gefunden. Passe deine Filter an.
              </div>
            ) : (
              <TradeTable
                trades={filteredTrades}
                onDeleteTrade={handleDeleteTrade}
              />
            )}
          </>
        )}

        {/* Modal */}
        <TradeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddTrade}
        />
      </div>
    </main>
  );
}
