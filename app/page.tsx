'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useSWR from 'swr';
import type { Trade, FilterOptions, QuotesApiResponse, TradeWithPnL, AggregatedPosition, MonthlyPnL, SystemError, ApiError } from '@/types';
import { loadTrades, addTrade, deleteTrade, updateTrade } from '@/lib/apiStorage';
import {
  enrichTradeWithPnL,
  calculateFullPortfolioSummary,
  calculateMonthlyHistory,
} from '@/lib/calculations';
import { initializeExchangeRates } from '@/lib/currencyConverter';
import { aggregatePositions, getUniqueSymbols } from '@/lib/aggregatePositions';

import IndexCards from '@/components/IndexCards';
import PortfolioSummary from '@/components/PortfolioSummary';
import PortfolioDonutChart from '@/components/dashboard/PortfolioDonutChart';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import EmptyState from '@/components/EmptyState';
import TradeTable from '@/components/TradeTable';
import TradeFormModal from '@/components/TradeFormModal';
import CloseTradeModal from '@/components/CloseTradeModal';
import RealizedTradesModal from '@/components/RealizedTradesModal';
import MonthlyTradesModal from '@/components/MonthlyTradesModal';
import ConfirmModal from '@/components/ConfirmModal';
import ErrorIndicator from '@/components/ErrorIndicator';
import PositionDetailModal from '@/components/PositionDetailModal';
import DerivativeCalculatorModal from '@/components/DerivativeCalculatorModal';
import PriceAlertModal from '@/components/PriceAlertModal';
import { AuthButton } from '@/components/auth/AuthButton';
import { usePushNotifications } from '@/lib/usePushNotifications';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error(`API Error: ${url} returned ${res.status}`, errorText);

    if (res.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Validierungsfehler: ${errorData.message || 'Ungueltige Anfrage'}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Validierungsfehler')) throw e;
        throw new Error('Ungueltige API-Anfrage');
      }
    }

    throw new Error(`Server-Fehler (${res.status})`);
  }
  return res.json();
};

export default function HomePage() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRealizedModalOpen, setIsRealizedModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0); // Counter für force refresh
  const [selectedPosition, setSelectedPosition] = useState<AggregatedPosition | null>(null); // Selected Position für Detail Modal
  const [selectedMonth, setSelectedMonth] = useState<MonthlyPnL | null>(null); // Selected Month für Monats-Trades Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false); // Price Alert Modal
  const [alertPrefill, setAlertPrefill] = useState<{ isin: string; ticker?: string; name: string; currentPrice?: number } | undefined>(undefined);
  const [calculatorTrade, setCalculatorTrade] = useState<Trade | null>(null); // Derivat-Rechner
  const [isCalculatorPickerOpen, setIsCalculatorPickerOpen] = useState(false); // Derivat-Auswahl

  // 🔔 Push Notifications
  const { isSupported: isPushSupported, isSubscribed: isPushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, isPending: isPushPending, needsInstall: pushNeedsInstall } = usePushNotifications();

  // Helper: Fehler hinzufuegen (mit Deduplizierung nach Message)
  const addSystemError = (category: SystemError['category'], message: string, details?: string) => {
    setSystemErrors(prev => {
      // Dedupliziere nach message
      if (prev.some(e => e.message === message)) return prev;
      return [...prev, {
        id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        message,
        details,
        timestamp: Date.now(),
      }];
    });
  };

  // Helper: API-Fehler in SystemErrors umwandeln
  const addApiErrors = (apiErrors: ApiError[]) => {
    if (!apiErrors || apiErrors.length === 0) return;
    // Bei neuem Fetch alte Provider/Exchange-Rate Fehler entfernen und mit neuen ersetzen
    setSystemErrors(prev => {
      const apiCategories = new Set(apiErrors.map(e => e.category));
      const kept = prev.filter(e => !apiCategories.has(e.category));
      const newErrors: SystemError[] = apiErrors.map(err => ({
        id: `${err.category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: err.category,
        message: err.message,
        details: err.details,
        timestamp: Date.now(),
      }));
      return [...kept, ...newErrors];
    });
  };

  const dismissError = useCallback((id: string) => {
    setSystemErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  const dismissAllErrors = useCallback(() => {
    setSystemErrors([]);
  }, []);

  // 💱 Initialisiere Wechselkurse beim App-Start
  useEffect(() => {
    initializeExchangeRates().catch((error) => {
      console.error('Failed to initialize exchange rates:', error);
      addSystemError('exchange_rate', 'Wechselkurse nicht verfuegbar', 'EUR/USD Kurs konnte beim App-Start nicht geladen werden.');
    });
  }, []);

  // Auth-Check beim Start
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/logto/user');
        const data = await response.json();
        
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          setIsAuthChecking(false);
        } else {
          // Nicht authentifiziert -> Middleware sollte bereits umgeleitet haben
          // Falls nicht, manuell umleiten
          window.location.href = '/api/logto/sign-in';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/api/logto/sign-in';
      }
    }
    
    checkAuth();
  }, []);

  // Trades aus API laden (nur wenn authentifiziert)
  useEffect(() => {
    if (isAuthenticated) {
      loadTrades().then(setTrades);
    }
  }, [isAuthenticated]);

  // 🎯 ISINs/Symbole für Quote-Abfrage (dedupliziert aus aggregierten Positionen)
  // Nur noch EINE Abfrage pro Symbol, auch wenn mehrere Trades existieren
  const isins = useMemo(() => {
    // Sammle alle eindeutigen ISINs/Ticker aus ALLEN Trades (auch geschlossene für Historie)
    const uniqueSymbols = new Set<string>();
    
    trades.forEach(trade => {
      const symbol = trade.isin || trade.ticker;
      if (symbol) {
        uniqueSymbols.add(symbol);
      }
    });
    
    return Array.from(uniqueSymbols);
  }, [trades]);

  // Quotes mit SWR fetchen (alle 15 Minuten)
  // Wichtig: Auch wenn keine ISINs vorhanden sind, laden wir die Indizes
  // Der forceRefresh counter wird erhöht, um den Cache zu umgehen
  const quotesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (isins.length > 0) {
      params.set('isins', isins.join(','));
      
      // Füge bevorzugte Provider hinzu (Format: "ISIN1:provider1,ISIN2:provider2")
      const providerMappings = trades
        .filter(t => !t.isClosed && t.priceProvider)
        .map(t => `${t.isin || t.ticker}:${t.priceProvider}`)
        .filter(Boolean);
      
      if (providerMappings.length > 0) {
        params.set('providers', providerMappings.join(','));
      }
    }
    if (forceRefresh > 0) {
      params.set('force', 'true');
      params.set('_', forceRefresh.toString());
    }
    const queryString = params.toString();
    return `/api/quotes${queryString ? `?${queryString}` : ''}`;
  }, [isins, forceRefresh, trades]);
  
  const { data: quotesData, mutate, isValidating, error: quotesError } = useSWR<QuotesApiResponse>(
    quotesUrl,
    fetcher,
    {
      refreshInterval: 15 * 60 * 1000, // 15 Minuten
      revalidateOnFocus: false,
      revalidateOnMount: true, // Beim initialen Laden sofort Daten abrufen
      onError: (err) => {
        console.error('Failed to fetch quotes:', err);
        addSystemError('network', 'Kursdaten konnten nicht geladen werden', `API-Anfrage fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
      },
      onSuccess: (data) => {
        // Erfolgreicher Fetch -> Netzwerk-Fehler entfernen
        setSystemErrors(prev => prev.filter(e => e.category !== 'network'));

        // Verarbeite API-Fehler aus der Response
        if (data?.errors && data.errors.length > 0) {
          addApiErrors(data.errors);
        } else {
          // Keine Fehler - bestehende Provider/Exchange-Rate Fehler entfernen
          setSystemErrors(prev => prev.filter(e => e.category !== 'provider' && e.category !== 'exchange_rate'));
        }
      },
    }
  );

  // Automatisch currentPrice in Datenbank speichern wenn neue Quotes kommen
  // WICHTIG: Nur quotesData als Dependency, NICHT trades!
  // trades wird über tradesRef gelesen, um eine Update-Schleife zu vermeiden:
  // setTrades → trades ändert sich → useEffect läuft erneut → setTrades → ...
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  useEffect(() => {
    if (!quotesData || !quotesData.quotes) return;
    const currentTrades = tradesRef.current;
    if (currentTrades.length === 0) return;

    let hasChanges = false;
    const updatedTrades = currentTrades.map(trade => {
      if (trade.isClosed) return trade; // Geschlossene Trades nicht aktualisieren
      
      const key = trade.isin || trade.ticker || '';
      const quote = quotesData.quotes[key];
      
      if (quote && quote.price) {
        const needsPriceUpdate = quote.price !== trade.currentPrice;
        const needsProviderUpdate = quote.provider && quote.provider !== trade.priceProvider;
        
        if (needsPriceUpdate || needsProviderUpdate) {
          hasChanges = true;
          return {
            ...trade,
            currentPrice: quote.price,
            priceProvider: quote.provider || trade.priceProvider, // Speichere den erfolgreichen Provider
          };
        }
      }
      
      return trade;
    });
    
    if (hasChanges) {
      // Nur geänderte Trades aktualisieren (nicht alle)
      const changedTrades = updatedTrades.filter((trade, i) => trade !== currentTrades[i]);
      Promise.allSettled(changedTrades.map(trade => updateTrade(trade)))
        .then(() => setTrades(updatedTrades));
    }
  }, [quotesData]); // Nur wenn neue Quotes kommen, NICHT bei trades-Änderung

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

  // 🎯 Aggregiere Positionen (gruppiert Trades nach Symbol/ISIN)
  const aggregatedPositions = useMemo<AggregatedPosition[]>(() => {
    return aggregatePositions(trades, quotesData?.quotes || {});
  }, [trades, quotesData]);

  // Portfolio-Zusammenfassung (unrealisiert basiert auf offenen Trades, realisiert auf ALLEN)
  const portfolioSummary = useMemo(
    () => calculateFullPortfolioSummary(tradesWithPnL, trades),
    [tradesWithPnL, trades]
  );

  // Monatliche P/L-Historie
  const monthlyHistory = useMemo(
    () => calculateMonthlyHistory(tradesWithPnL, trades),
    [tradesWithPnL, trades]
  );

  // Handlers
  const handleAddTrade = async (trade: Trade) => {
    // Prüfe ob es ein Edit (Update) oder ein neuer Trade ist
    if (tradeToEdit) {
      // Update existierenden Trade
      const updated = await updateTrade(trade);
      if (updated) {
        setTrades((prev) => prev.map(t => t.id === trade.id ? updated : t));
      }
    } else {
      // Neuen Trade hinzufügen
      const added = await addTrade(trade);
      if (added) {
        setTrades((prev) => [...prev, added]);
      }
    }
    setIsModalOpen(false);
    setTradeToEdit(null);
  };

  const handleEditTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      setTradeToEdit(trade);
      setIsModalOpen(true);
    }
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

  const handleSaveClosedTrade = async (
    tradeId: string,
    sellQuantity: number,
    sellPrice: number | undefined,
    sellTotal: number | undefined,
    realizedPnL: number,
    closedDate: string
  ) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    const isPartialSale = sellQuantity < trade.quantity;
    const closedAt = new Date(closedDate).toISOString();
    
    if (isPartialSale) {
      // Teilverkauf: Erstelle geschlossenen Trade für verkauften Teil
      const soldTrade: Trade = {
        ...trade,
        id: `${trade.id}-partial-${Date.now()}`,
        quantity: sellQuantity,
        investedEur: trade.buyPrice * sellQuantity,
        isClosed: true,
        closedAt,
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
            soldAt: closedAt,
          },
        ],
      };

      // Speichere beide Trades
      const added = await addTrade(soldTrade);
      const updated = await updateTrade(updatedTrade);
      
      if (added && updated) {
        setTrades(prev => [...prev.map(t => t.id === tradeId ? updated : t), added]);
      }
    } else {
      // Vollständiger Verkauf
      const updatedTrade: Trade = {
        ...trade,
        isClosed: true,
        closedAt,
        sellPrice,
        sellTotal,
        realizedPnL,
      };

      const updated = await updateTrade(updatedTrade);
      if (updated) {
        setTrades(prev => prev.map(t => t.id === tradeId ? updated : t));
      }
    }

    setIsCloseModalOpen(false);
    setTradeToClose(null);
    // Schließe auch das PositionDetailModal, da der Trade nun geschlossen ist
    setSelectedPosition(null);
  };

  const handleRefresh = async () => {
    // Lade Trades aus der Datenbank neu
    const freshTrades = await loadTrades();
    setTrades(freshTrades);
    
    // Erhöhe Counter um force refresh zu triggern
    // Dies ändert den SWR key und umgeht sowohl SWR- als auch Backend-Cache
    setForceRefresh(prev => prev + 1);
  };

  const handleLogout = () => {
    window.location.href = '/api/logto/sign-out';
  };

  const toggleFabMenu = () => {
    setIsFabMenuOpen(!isFabMenuOpen);
  };

  // Loading State während Auth-Check
  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-accent mb-6"></div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Authentifizierung wird geprüft...
          </h2>
          <p className="text-text-secondary">
            Einen Moment bitte
          </p>
        </div>
      </main>
    );
  }

  // Nicht authentifiziert (sollte nicht erreicht werden durch Middleware)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* iOS PWA Install Banner */}
        {pushNeedsInstall && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📲</span>
            <p className="text-sm text-blue-300">
              <strong>Push-Benachrichtigungen aktivieren:</strong> Tippe auf <strong>Teilen</strong> und wähle <strong>„Zum Home-Bildschirm"</strong> – danach funktionieren Preis-Alarme auch bei gesperrtem iPhone.
            </p>
          </div>
        )}

        {/* Indizes ganz oben */}
        {quotesData?.indices && (
          <div className="mb-6">
            <IndexCards indices={quotesData.indices} isLoading={isValidating} />
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <ErrorIndicator errors={systemErrors} onDismiss={dismissError} onDismissAll={dismissAllErrors} />
        </div>

        {/* Inhalt */}
        {trades.length === 0 ? (
          <EmptyState onAddTrade={() => setIsModalOpen(true)} />
        ) : (
          <>
            {/* Charts Bereich */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Performance Chart - TradeRepublic Style */}
              <div className="lg:col-span-2">
                <PerformanceChart trades={trades} portfolioSummary={portfolioSummary} />
              </div>
              
              {/* Donut Chart */}
              <div className="lg:col-span-1">
                <PortfolioDonutChart trades={tradesWithPnL} />
              </div>
            </div>

            {/* Portfolio-Übersicht */}
            <div className="mb-6">
              <PortfolioSummary 
                summary={portfolioSummary}
                monthlyHistory={monthlyHistory}
                onShowRealizedTrades={() => setIsRealizedModalOpen(true)}
                onMonthClick={(month) => setSelectedMonth(month)}
              />
            </div>

            {/* Trades Liste */}
            {aggregatedPositions.length === 0 ? (
              <div className="bg-background-card rounded-card p-8 border border-border shadow-card text-center text-text-secondary">
                Keine offenen Positionen vorhanden.
              </div>
            ) : (
              <TradeTable
                positions={aggregatedPositions}
                onOpenPosition={(position) => setSelectedPosition(position)}
              />
            )}
          </>
        )}

        {/* Modals */}
        <TradeFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setTradeToEdit(null);
          }}
          onSave={handleAddTrade}
          editTrade={tradeToEdit}
        />

        {/* Position Detail Modal */}
        <PositionDetailModal
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
          onEditTrade={handleEditTrade}
          onCloseTrade={handleCloseTrade}
          onDeleteTrade={handleDeleteTrade}
          onCreateAlert={(prefill) => {
            setAlertPrefill(prefill);
            setSelectedPosition(null);
            setIsAlertModalOpen(true);
          }}
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
            onEditTrade={handleEditTrade}
          />
        )}

        {selectedMonth && (
          <MonthlyTradesModal
            trades={trades}
            month={selectedMonth}
            onClose={() => setSelectedMonth(null)}
            onDeleteTrade={handleDeleteTrade}
            onEditTrade={handleEditTrade}
          />
        )}

        {/* Price Alert Modal */}
        <PriceAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => {
            setIsAlertModalOpen(false);
            setAlertPrefill(undefined);
          }}
          prefill={alertPrefill}
        />

        {/* Confirm Modal for Delete */}
        <ConfirmModal
          isOpen={!!tradeToDelete}
          title="Trade löschen"
          message={`Möchtest du den Trade "${tradeToDelete?.name}" wirklich löschen?`}
          variant="danger"
          confirmText="Löschen"
          cancelText="Abbrechen"
          onConfirm={async () => {
            if (tradeToDelete) {
              const success = await deleteTrade(tradeToDelete.id);
              if (success) {
                setTrades((prev) => prev.filter((t) => t.id !== tradeToDelete.id));
              }
              setTradeToDelete(null);
            }
          }}
          onCancel={() => setTradeToDelete(null)}
        />

        {/* Derivat-Rechner Auswahl */}
        {isCalculatorPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCalculatorPickerOpen(false)} />
            <div className="relative bg-background-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Derivat wählen</h3>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {aggregatedPositions
                  .filter(p => p.isDerivative && p.openTrades.length > 0)
                  .flatMap(p => p.openTrades.map(t => ({ trade: t, positionName: p.name })))
                  .map(({ trade, positionName }) => (
                    <button
                      key={trade.id}
                      onClick={() => {
                        setCalculatorTrade(trade);
                        setIsCalculatorPickerOpen(false);
                      }}
                      className="text-left px-4 py-3 rounded-xl bg-background hover:bg-border/50 transition-colors border border-border"
                    >
                      <div className="text-sm font-medium text-text-primary">{positionName}</div>
                      <div className="text-xs text-text-secondary">{trade.quantity} Stk. × {trade.currentPrice?.toFixed(2) || trade.buyPrice.toFixed(2)} €</div>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setIsCalculatorPickerOpen(false)}
                className="mt-4 w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Derivat-Rechner Modal */}
        {calculatorTrade && (
          <DerivativeCalculatorModal
            key={calculatorTrade.id}
            isOpen={!!calculatorTrade}
            onClose={() => setCalculatorTrade(null)}
            trade={calculatorTrade}
          />
        )}

        {/* Floating Action Menu – ausblenden wenn ein Modal offen ist */}
        <div className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 transition-opacity duration-200 ${
          isModalOpen || !!selectedPosition || !!tradeToClose || isRealizedModalOpen || !!tradeToDelete || !!selectedMonth || isAlertModalOpen || !!calculatorTrade || isCalculatorPickerOpen
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100'
        }`}>
          {/* Menu Items */}
          <div className={`absolute bottom-20 right-0 flex flex-col gap-3 transition-all duration-300 ${isFabMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {/* Trade hinzufügen */}
            <button
              onClick={() => {
                setIsModalOpen(true);
                setIsFabMenuOpen(false);
              }}
              className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">Trade hinzufügen</span>
            </button>

            {/* Derivat-Rechner */}
            {aggregatedPositions.some(p => p.isDerivative && p.openTrades.length > 0) && (
              <button
                onClick={() => {
                  const derivativePositions = aggregatedPositions.filter(p => p.isDerivative && p.openTrades.length > 0);
                  const allDerivativeTrades = derivativePositions.flatMap(p => p.openTrades);
                  if (allDerivativeTrades.length === 1) {
                    setCalculatorTrade(allDerivativeTrades[0]);
                  } else {
                    setIsCalculatorPickerOpen(true);
                  }
                  setIsFabMenuOpen(false);
                }}
                className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm0 2.25h.006v.008h-.006v-.008zm2.498-6h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75v-.008zM15 9.75a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V10.5a.75.75 0 00-.75-.75H15zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                <span className="text-sm font-medium whitespace-nowrap">Derivat-Rechner</span>
              </button>
            )}

            {/* Preis-Alarme */}
            <button
              onClick={() => {
                setIsAlertModalOpen(true);
                setIsFabMenuOpen(false);
              }}
              className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">Preis-Alarme</span>
            </button>

            {/* Sankey-Diagramm */}
            <Link
              href="/sankey"
              onClick={() => setIsFabMenuOpen(false)}
              className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">Sankey-Diagramm</span>
            </Link>

            {/* Aktualisieren */}
            <button
              onClick={() => {
                handleRefresh();
                setIsFabMenuOpen(false);
              }}
              disabled={isValidating}
              className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group disabled:opacity-50"
            >
              <svg 
                className={`w-5 h-5 ${isValidating ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">
                {isValidating ? 'Lädt...' : 'Aktualisieren'}
              </span>
            </button>

            {/* Push Notifications Toggle */}
            {isPushSupported && (
              <button
                onClick={async () => {
                  if (isPushSubscribed) {
                    await unsubscribePush();
                  } else {
                    await subscribePush();
                  }
                  setIsFabMenuOpen(false);
                }}
                disabled={isPushPending}
                className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  {isPushSubscribed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667-.15M2 2l20 20M13 7.5V6a1 1 0 10-2 0v2.293" />
                  )}
                </svg>
                <span className="text-sm font-medium whitespace-nowrap">
                  {isPushPending ? 'Wird verarbeitet...' : isPushSubscribed ? 'Push deaktivieren' : 'Push aktivieren'}
                </span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => {
                handleLogout();
                setIsFabMenuOpen(false);
              }}
              className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium whitespace-nowrap">Logout</span>
            </button>
          </div>

          {/* Main FAB Button */}
          <button
            onClick={toggleFabMenu}
            className={`bg-white text-black p-4 rounded-full shadow-2xl hover:bg-gray-100 transition-all transform hover:scale-110 flex items-center justify-center ${isFabMenuOpen ? 'rotate-45' : ''}`}
            title="Menü"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
