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
import { USERNAME_REGEX, USERNAME_RULES } from '@/lib/validation';

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
import PriceAlertModal from '@/components/PriceAlertModal';
import UsernameModal from '@/components/UsernameModal';
import { AuthButton } from '@/components/auth/AuthButton';
import { usePushNotifications } from '@/lib/usePushNotifications';
import RoleGate from '@/components/RoleGate';
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0); // Counter für force refresh
  const [selectedPosition, setSelectedPosition] = useState<AggregatedPosition | null>(null); // Selected Position für Detail Modal
  const [selectedMonth, setSelectedMonth] = useState<MonthlyPnL | null>(null); // Selected Month für Monats-Trades Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false); // Price Alert Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Einstellungen
  const [alertPrefill, setAlertPrefill] = useState<{ isin: string; ticker?: string; name: string; currentPrice?: number } | undefined>(undefined);
  const [username, setUsername] = useState<string | null>(null); // Logto Username
  const [showUsernameModal, setShowUsernameModal] = useState(false); // Username-Pflicht Modal
  const [isEditingUsername, setIsEditingUsername] = useState(false); // Username in Settings ändern
  const [isSavingUsername, setIsSavingUsername] = useState(false); // Username wird gespeichert
  const [editUsername, setEditUsername] = useState('');
  const [editUsernameError, setEditUsernameError] = useState('');

  // 🔔 Push Notifications
  const { isSupported: isPushSupported, isSubscribed: isPushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, isPending: isPushPending, needsInstall: pushNeedsInstall } = usePushNotifications();

  // ⚙️ User Settings
  const [tradeNotifications, setTradeNotifications] = useState(true);
  const [isTradeNotifPending, setIsTradeNotifPending] = useState(false);
  const [newsNotifications, setNewsNotifications] = useState(true);
  const [isNewsNotifPending, setIsNewsNotifPending] = useState(false);

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
          if (data.claims?.username) {
            setUsername(data.claims.username);
          } else {
            setShowUsernameModal(true);
          }
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

  // Settings laden (nur wenn authentifiziert)
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/settings').then(r => r.json()).then(data => {
        if (data.settings) {
          setTradeNotifications(data.settings.tradeNotifications ?? true);
          setNewsNotifications(data.settings.newsNotifications ?? true);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

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

  // Echte Trades (ohne Demo-Trades) für Auswertungen
  const realTrades = useMemo(() => trades.filter(t => !t.isDemo), [trades]);

  // Trades mit aktuellen Kursen anreichern (nur offene Trades, OHNE Demo für P/L)
  const tradesWithPnL = useMemo<TradeWithPnL[]>(() => {
    const openTrades = realTrades.filter(t => !t.isClosed);
    if (openTrades.length === 0) return [];

    return openTrades.map((trade) => {
        const key = trade.isin || trade.ticker || '';
        const quote = quotesData?.quotes[key];

        // Priorität: Live-Kurs > gespeicherter currentPrice > Kaufkurs
        const currentPrice = quote?.price || trade.currentPrice || trade.buyPrice;
        return enrichTradeWithPnL(trade, currentPrice);
      });
  }, [realTrades, quotesData]);

  // 🎯 Aggregiere Positionen — ALLE Trades anzeigen (inkl. Demo für Sichtbarkeit)
  const aggregatedPositions = useMemo<AggregatedPosition[]>(() => {
    return aggregatePositions(trades, quotesData?.quotes || {});
  }, [trades, quotesData]);

  // Portfolio-Zusammenfassung (ohne Demo-Trades)
  const portfolioSummary = useMemo(
    () => calculateFullPortfolioSummary(tradesWithPnL, realTrades),
    [tradesWithPnL, realTrades]
  );

  // Monatliche P/L-Historie (ohne Demo-Trades)
  const monthlyHistory = useMemo(
    () => calculateMonthlyHistory(tradesWithPnL, realTrades),
    [tradesWithPnL, realTrades]
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
    if (isFabMenuOpen) setIsMoreOpen(false);
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

  // Username-Pflicht: Blockierendes Modal wenn kein Username gesetzt
  if (showUsernameModal) {
    return (
      <main className="min-h-screen bg-background">
        <UsernameModal
          onUsernameSet={(newUsername) => {
            setUsername(newUsername);
            setShowUsernameModal(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <RoleGate role="trading">
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
                <PerformanceChart trades={realTrades} portfolioSummary={portfolioSummary} />
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


        {/* Einstellungen Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
            <div className="relative bg-background-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">Einstellungen</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-background-elevated rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* Benutzername */}
                <div className="py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Benutzername</p>
                      {!isEditingUsername && (
                        <p className="text-xs text-text-secondary mt-0.5">{username || 'Nicht gesetzt'}</p>
                      )}
                    </div>
                    {!isEditingUsername && (
                      <button
                        onClick={() => {
                          setEditUsername(username || '');
                          setEditUsernameError('');
                          setIsEditingUsername(true);
                        }}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-background-elevated"
                      >
                        Ändern
                      </button>
                    )}
                  </div>
                  {isEditingUsername && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => {
                          setEditUsername(e.target.value);
                          setEditUsernameError('');
                        }}
                        autoFocus
                        minLength={3}
                        maxLength={20}
                        className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-white"
                      />
                      {editUsernameError && (
                        <p className="text-xs text-red-400 mt-1">{editUsernameError}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          disabled={isSavingUsername}
                          onClick={async () => {
                            const trimmed = editUsername.trim();
                            if (!USERNAME_REGEX.test(trimmed)) {
                              setEditUsernameError(USERNAME_RULES);
                              return;
                            }
                            setIsSavingUsername(true);
                            try {
                              const res = await fetch('/api/logto/user', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: trimmed }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setEditUsernameError(data.error || 'Fehler');
                                return;
                              }
                              setUsername(data.username);
                              setIsEditingUsername(false);
                            } catch {
                              setEditUsernameError('Netzwerkfehler');
                            } finally {
                              setIsSavingUsername(false);
                            }
                          }}
                          className="flex-1 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          {isSavingUsername ? 'Speichert...' : 'Speichern'}
                        </button>
                        <button
                          onClick={() => setIsEditingUsername(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-background-elevated transition-colors border border-border"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Benachrichtigungen Gruppe */}
                <div className="py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm font-medium text-text-primary">Benachrichtigungen</p>
                  </div>
                  <div className="space-y-3 pl-1">
                    {/* Push Notifications Master-Toggle */}
                    {isPushSupported && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-primary">Push-Benachrichtigungen</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {isPushSubscribed ? 'Aktiv' : 'Deaktiviert'}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (isPushSubscribed) {
                              await unsubscribePush();
                            } else {
                              await subscribePush();
                            }
                          }}
                          disabled={isPushPending}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                            isPushSubscribed ? 'bg-profit' : 'bg-border'
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isPushSubscribed ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    )}

                    {/* Trade-Benachrichtigungen */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary">Trade-Benachrichtigungen</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Chat-Nachricht bei neuen Trades
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !tradeNotifications;
                          setIsTradeNotifPending(true);
                          try {
                            const res = await fetch('/api/settings', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ tradeNotifications: newValue }),
                            });
                            if (res.ok) setTradeNotifications(newValue);
                          } catch {} finally {
                            setIsTradeNotifPending(false);
                          }
                        }}
                        disabled={isTradeNotifPending}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                          tradeNotifications ? 'bg-profit' : 'bg-border'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          tradeNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* News-Benachrichtigungen (nur wenn Push aktiv) */}
                    {isPushSupported && isPushSubscribed && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-primary">News-Benachrichtigungen</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Push beim täglichen Marktbericht
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !newsNotifications;
                            setIsNewsNotifPending(true);
                            try {
                              const res = await fetch('/api/settings', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ newsNotifications: newValue }),
                              });
                              if (res.ok) setNewsNotifications(newValue);
                            } catch {} finally {
                              setIsNewsNotifPending(false);
                            }
                          }}
                          disabled={isNewsNotifPending}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                            newsNotifications ? 'bg-profit' : 'bg-border'
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            newsNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 py-3 text-red-400 hover:bg-red-500/10 rounded-lg px-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Abmelden</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Menu – ausblenden wenn ein Modal offen ist */}
        <div className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 transition-opacity duration-200 ${
          isModalOpen || !!selectedPosition || !!tradeToClose || isRealizedModalOpen || !!tradeToDelete || !!selectedMonth || isAlertModalOpen || isSettingsOpen
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100'
        }`}>
          {/* Menu Items */}
          <div className={`absolute bottom-20 right-0 flex flex-col gap-3 transition-all duration-300 ${isFabMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {!isMoreOpen ? (
              <>
                {/* === Hauptmenü === */}
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

                {/* News */}
                <Link
                  href="/news"
                  onClick={() => setIsFabMenuOpen(false)}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">News</span>
                </Link>

                {/* Chat */}
                <Link
                  href="/chat"
                  onClick={() => setIsFabMenuOpen(false)}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Chat</span>
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

                {/* Mehr... */}
                <button
                  onClick={() => setIsMoreOpen(true)}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Mehr...</span>
                </button>

                {/* Einstellungen */}
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsFabMenuOpen(false);
                  }}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Einstellungen</span>
                </button>
              </>
            ) : (
              <>
                {/* === Mehr-Menü === */}
                {/* Zurück */}
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Zurück</span>
                </button>

                {/* Preis-Alarme */}
                <button
                  onClick={() => {
                    setIsAlertModalOpen(true);
                    setIsFabMenuOpen(false);
                    setIsMoreOpen(false);
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
                  onClick={() => { setIsFabMenuOpen(false); setIsMoreOpen(false); }}
                  className="bg-white text-black px-4 py-3 rounded-full shadow-xl hover:bg-gray-100 transition-all flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Sankey-Diagramm</span>
                </Link>
              </>
            )}
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
      </RoleGate>
    </main>
  );
}
