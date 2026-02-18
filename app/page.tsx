'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import type { Trade, FilterOptions, QuotesApiResponse, TradeWithPnL } from '@/types';
import { loadTrades, saveTrades, addTrade, deleteTrade, updateTrade } from '@/lib/storage';
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
import CloseTradeModal from '@/components/CloseTradeModal';
import RealizedTradesModal from '@/components/RealizedTradesModal';
import ConfirmModal from '@/components/ConfirmModal';
import { AuthButton } from '@/components/auth/AuthButton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRealizedModalOpen, setIsRealizedModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<{ id: string; name: string } | null>(null);
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

  // ISINs für Quote-Abfrage (nur offene Trades)
  const isins = useMemo(() => {
    return trades
      .filter(t => !t.isClosed)
      .map((t) => t.isin || t.ticker)
      .filter(Boolean);
  }, [trades]);

  // Quotes mit SWR fetchen (alle 15 Minuten)
  // Wichtig: Auch wenn keine ISINs vorhanden sind, laden wir die Indizes
  const { data: quotesData, mutate, isValidating } = useSWR<QuotesApiResponse>(
    `/api/quotes${isins.length > 0 ? `?isins=${isins.join(',')}` : ''}`,
    fetcher,
    {
      refreshInterval: 15 * 60 * 1000, // 15 Minuten
      revalidateOnFocus: false,
    }
  );

  // Automatisch currentPrice in localStorage speichern wenn neue Quotes kommen
  useEffect(() => {
    if (!quotesData || !quotesData.quotes || trades.length === 0) return;

    let hasChanges = false;
    const updatedTrades = trades.map(trade => {
      if (trade.isClosed) return trade; // Geschlossene Trades nicht aktualisieren
      
      const key = trade.isin || trade.ticker || '';
      const quote = quotesData.quotes[key];
      
      if (quote && quote.price && quote.price !== trade.currentPrice) {
        hasChanges = true;
        return {
          ...trade,
          currentPrice: quote.price
        };
      }
      
      return trade;
    });
    
    if (hasChanges) {
      saveTrades(updatedTrades);
      setTrades(updatedTrades);
    }
  }, [quotesData]); // Nur wenn sich quotesData ändert

  // Trades mit aktuellen Kursen anreichern (nur offene Trades)
  const tradesWithPnL = useMemo<TradeWithPnL[]>(() => {
    // Wenn es keine offenen Trades gibt, gib leeres Array zurück
    const openTrades = trades.filter(t => !t.isClosed);
    if (openTrades.length === 0) return [];

    return openTrades.map((trade) => {
        const key = trade.isin || trade.ticker || '';
        const quote = quotesData?.quotes[key];
        // Priorität: Live-Kurs > gespeicherter currentPrice > Kaufkurs
        const currentPrice = quote?.price || trade.currentPrice || trade.buyPrice;
        return enrichTradeWithPnL(trade, currentPrice);
      });
  }, [trades, quotesData]);

  // Filter anwenden
  const filteredTrades = useMemo(
    () => applyFilters(tradesWithPnL, filters),
    [tradesWithPnL, filters]
  );

  // Portfolio-Zusammenfassung (unrealisiert basiert auf offenen Trades, realisiert auf ALLEN)
  const portfolioSummary = useMemo(
    () => calculateFullPortfolioSummary(tradesWithPnL, trades),
    [tradesWithPnL, trades]
  );

  // Handlers
  const handleAddTrade = (trade: Trade) => {
    addTrade(trade);
    setTrades((prev) => [...prev, trade]);
  };

  const handleDeleteTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      setTradeToDelete({ id: tradeId, name: trade.name });
    }
  };

  const handleCloseTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (trade && !trade.isClosed) {
      setTradeToClose(trade);
      setIsCloseModalOpen(true);
    }
  };

  const handleSaveClosedTrade = (
    tradeId: string,
    sellQuantity: number,
    sellPrice: number | undefined,
    sellTotal: number | undefined,
    realizedPnL: number
  ) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    const isPartialSale = sellQuantity < trade.quantity;
    
    if (isPartialSale) {
      // Teilverkauf: Erstelle geschlossenen Trade für verkauften Teil
      const soldTrade: Trade = {
        ...trade,
        id: `${trade.id}-partial-${Date.now()}`,
        quantity: sellQuantity,
        investedEur: trade.buyPrice * sellQuantity,
        isClosed: true,
        closedAt: new Date().toISOString(),
        sellPrice,
        sellTotal,
        realizedPnL,
        isPartialSale: true,
        parentTradeId: trade.id,
      };

      // Aktualisiere ursprünglichen Trade: Reduziere Menge
      const remainingQuantity = trade.quantity - sellQuantity;
      const updatedTrade: Trade = {
        ...trade,
        quantity: remainingQuantity,
        investedEur: trade.buyPrice * remainingQuantity,
        originalQuantity: trade.originalQuantity || trade.quantity,
        partialSales: [
          ...(trade.partialSales || []),
          {
            id: soldTrade.id,
            soldQuantity: sellQuantity,
            sellPrice: sellPrice || (sellTotal! / sellQuantity),
            sellTotal: sellTotal || (sellPrice! * sellQuantity),
            realizedPnL,
            soldAt: soldTrade.closedAt!,
          },
        ],
      };

      // Speichere beide Trades
      addTrade(soldTrade);
      updateTrade(updatedTrade);
      setTrades(prev => [...prev.map(t => t.id === tradeId ? updatedTrade : t), soldTrade]);
    } else {
      // Vollständiger Verkauf
      const updatedTrade: Trade = {
        ...trade,
        isClosed: true,
        closedAt: new Date().toISOString(),
        sellPrice,
        sellTotal,
        realizedPnL,
      };

      updateTrade(updatedTrade);
      setTrades(prev => prev.map(t => t.id === tradeId ? updatedTrade : t));
    }

    setIsCloseModalOpen(false);
    setTradeToClose(null);
  };

  const handleRefresh = () => {
    // Triggert SWR neu zu fetchen, der useEffect speichert dann automatisch
    mutate();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <div className="flex gap-3">
            <AuthButton />
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-background-card border border-border rounded-lg font-medium hover:bg-background-elevated transition-all flex items-center gap-2"
              title="Kurse aktualisieren"
              disabled={isValidating}
            >
              <svg 
                className={`w-5 h-5 text-text-primary ${isValidating ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">
                {isValidating ? 'Lädt...' : 'Aktualisieren'}
              </span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Trade hinzufügen
            </button>
          </div>
        </div>

        {/* Indizes */}
        {quotesData?.indices && <IndexCards indices={quotesData.indices} isLoading={isValidating} />}

        {/* Inhalt */}
        {trades.length === 0 ? (
          <EmptyState onAddTrade={() => setIsModalOpen(true)} />
        ) : (
          <>
            {/* Portfolio-Übersicht */}
            <PortfolioSummary 
              summary={portfolioSummary}
              onShowRealizedTrades={() => setIsRealizedModalOpen(true)}
            />

            {/* Filter */}
            <FiltersBar filters={filters} onFiltersChange={setFilters} />

            {/* Trades Liste */}
            {filteredTrades.length === 0 ? (
              <div className="bg-background-card rounded-card p-8 border border-border shadow-card text-center text-text-secondary">
                Keine Trades gefunden. Passe deine Filter an.
              </div>
            ) : (
              <TradeTable
                trades={filteredTrades}
                onDeleteTrade={handleDeleteTrade}
                onCloseTrade={handleCloseTrade}
              />
            )}
          </>
        )}

        {/* Modals */}
        <TradeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddTrade}
        />

        {tradeToClose && (
          <CloseTradeModal
            trade={tradeToClose}
            onClose={() => {
              setIsCloseModalOpen(false);
              setTradeToClose(null);
            }}
            onSave={handleSaveClosedTrade}
          />
        )}

        {isRealizedModalOpen && (
          <RealizedTradesModal
            trades={trades}
            onClose={() => setIsRealizedModalOpen(false)}
            onDeleteTrade={handleDeleteTrade}
          />
        )}

        {/* Confirm Modal for Delete */}
        <ConfirmModal
          isOpen={!!tradeToDelete}
          title="Trade löschen"
          message={`Möchtest du den Trade "${tradeToDelete?.name}" wirklich löschen?`}
          variant="danger"
          confirmText="Löschen"
          cancelText="Abbrechen"
          onConfirm={() => {
            if (tradeToDelete) {
              deleteTrade(tradeToDelete.id);
              setTrades((prev) => prev.filter((t) => t.id !== tradeToDelete.id));
              setTradeToDelete(null);
            }
          }}
          onCancel={() => setTradeToDelete(null)}
        />
      </div>
    </main>
  );
}
