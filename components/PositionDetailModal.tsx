'use client';

import { X, Bell, Calendar, Edit2, Trash2, BanknoteX, ChevronDown, Calculator, ArrowRightLeft, Download } from 'lucide-react';
import ExportDropdown from './ExportDropdown';
import { useState, useEffect } from 'react';
import TradingViewChart, { getTradingViewSymbol, searchTradingViewSymbol, type TradingViewSearchResult } from './TradingViewChart';
import DerivativeCalculatorModal from './DerivativeCalculatorModal';
import type { AggregatedPosition, Trade } from '@/types';
import { convertToEURSync } from '@/lib/currencyConverter';

interface PositionDetailModalProps {
  position: AggregatedPosition | null;
  onClose: () => void;
  onEditTrade?: (tradeId: string) => void;
  onCloseTrade?: (tradeId: string) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onConvertDemo?: (tradeId: string) => void;
  onCreateAlert?: (prefill: { isin: string; ticker?: string; name: string; currentPrice?: number }) => void;
}

export default function PositionDetailModal({
  position,
  onClose,
  onEditTrade,
  onCloseTrade,
  onDeleteTrade,
  onConvertDemo,
  onCreateAlert,
}: PositionDetailModalProps) {
  const [tvSymbol, setTvSymbol] = useState<string>('');
  const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [calculatorTrade, setCalculatorTrade] = useState<Trade | null>(null);
  
  // Überwache Position-Änderungen: Schließe Modal wenn keine offenen Trades mehr vorhanden sind
  useEffect(() => {
    // Wenn Position null ist oder keine offenen Trades mehr hat, schließe die Modal
    if (position && position.openTrades.length === 0) {
      console.log('📊 Keine offenen Trades mehr vorhanden, schließe Position Detail Modal');
      onClose();
    }
  }, [position?.openTrades.length, onClose]);
  
  // Statische Liste aller verfügbaren Börsen
  const allExchanges = [
    { code: 'NASDAQ', name: 'NASDAQ' },
    { code: 'NYSE', name: 'New York Stock Exchange' },
    { code: 'XETRA', name: 'Deutsche Börse Xetra' },
    { code: 'FWB', name: 'Frankfurt Stock Exchange' },
    { code: 'LSE', name: 'London Stock Exchange' },
    { code: 'EURONEXT', name: 'Euronext' },
    { code: 'SIX', name: 'SIX Swiss Exchange' },
    { code: 'TSX', name: 'Toronto Stock Exchange' },
    { code: 'ASX', name: 'Australian Securities Exchange' },
    { code: 'HKEX', name: 'Hong Kong Stock Exchange' },
    { code: 'TSE', name: 'Tokyo Stock Exchange' },
    { code: 'BINANCE', name: 'Binance (Crypto)' },
    { code: 'GETTEX', name: 'Gettex München' },
  ];

  // Hilfsfunktion: Lade gespeicherte Börse für ein Symbol aus localStorage
  const getSavedExchange = (symbol: string): string | null => {
    try {
      const saved = localStorage.getItem(`exchange_preference_${symbol}`);
      return saved;
    } catch (error) {
      console.error('Fehler beim Laden der Börsen-Präferenz:', error);
      return null;
    }
  };

  // Hilfsfunktion: Speichere Börse für ein Symbol in localStorage
  const saveExchangePreference = (symbol: string, exchange: string) => {
    try {
      localStorage.setItem(`exchange_preference_${symbol}`, exchange);
      console.log(`💾 Börsen-Präferenz gespeichert: ${symbol} → ${exchange}`);
    } catch (error) {
      console.error('Fehler beim Speichern der Börsen-Präferenz:', error);
    }
  };

  // Hilfsfunktion: Generiere alternative Börsen für ein Symbol
  const generateAlternativeExchanges = (
    ticker?: string,
    isin?: string,
    productType?: string,
    isDerivative?: boolean,
    underlying?: string
  ): TradingViewSearchResult[] => {
    // Bei Derivaten: Versuche den Underlying-Wert zu nutzen
    let searchSymbol = ticker;
    let searchIsin = isin;
    
    if (isDerivative && underlying) {
      // Extrahiere Symbol aus Underlying-Namen
      // z.B. "Cameco Corporation" -> "CCJ", "Apple Inc." -> "AAPL"
      const underlyingUpper = underlying.toUpperCase();
      
      // Bekannte Mappings für häufige Underlyings
      const knownUnderlyings: Record<string, { symbol: string; isin?: string; exchange: string }> = {
        'APPLE': { symbol: 'AAPL', exchange: 'NASDAQ' },
        'CAMECO': { symbol: 'CCJ', exchange: 'NYSE' },
        'DAX': { symbol: 'DAX', isin: 'DE0008469008', exchange: 'XETRA' },
        'DOW JONES': { symbol: 'DJI', exchange: 'INDEX' },
        'S&P 500': { symbol: 'SPX', exchange: 'INDEX' },
        'TESLA': { symbol: 'TSLA', exchange: 'NASDAQ' },
        'MICROSOFT': { symbol: 'MSFT', exchange: 'NASDAQ' },
        'NVIDIA': { symbol: 'NVDA', exchange: 'NASDAQ' },
        'AMAZON': { symbol: 'AMZN', exchange: 'NASDAQ' },
      };
      
      // Suche nach Match
      for (const [name, data] of Object.entries(knownUnderlyings)) {
        if (underlyingUpper.includes(name)) {
          searchSymbol = data.symbol;
          searchIsin = data.isin;
          console.log(`📊 Derivat erkannt: ${underlying} → ${searchSymbol} (${data.exchange})`);
          break;
        }
      }
    }
    
    if (!searchSymbol && !searchIsin) return [];
    
    const symbol = searchSymbol || searchIsin?.substring(searchIsin.length - 6) || 'UNKNOWN';
    const countryCode = searchIsin?.substring(0, 2) || 'US';
    const alternatives: TradingViewSearchResult[] = [];

    // Basiere auf ISIN-Ländercode
    switch (countryCode) {
      case 'DE':
        alternatives.push(
          { exchange: 'XETRA', symbol, description: `${symbol} (XETRA - Deutsche Börse)`, type: 'stock' },
          { exchange: 'FWB', symbol, description: `${symbol} (Frankfurt)`, type: 'stock' },
          { exchange: 'GETTEX', symbol, description: `${symbol} (Gettex München)`, type: 'stock' }
        );
        break;
      case 'US':
        alternatives.push(
          { exchange: 'NASDAQ', symbol, description: `${symbol} (NASDAQ)`, type: 'stock' },
          { exchange: 'NYSE', symbol, description: `${symbol} (NYSE)`, type: 'stock' }
        );
        break;
      case 'GB':
        alternatives.push({ exchange: 'LSE', symbol, description: `${symbol} (London Stock Exchange)`, type: 'stock' });
        break;
      case 'FR':
        alternatives.push({ exchange: 'EURONEXT', symbol, description: `${symbol} (Euronext Paris)`, type: 'stock' });
        break;
      case 'NL':
        alternatives.push({ exchange: 'EURONEXT', symbol, description: `${symbol} (Euronext Amsterdam)`, type: 'stock' });
        break;
      case 'CH':
        alternatives.push({ exchange: 'SIX', symbol, description: `${symbol} (SIX Swiss Exchange)`, type: 'stock' });
        break;
      default:
        alternatives.push({ exchange: 'NASDAQ', symbol, description: `${symbol} (Default)`, type: 'stock' });
    }

    return alternatives;
  };

  // Hilfsfunktion: Dynamische Symbol-Suche für normale Aktien
  const searchSymbolDynamically = async (
    ticker?: string,
    isin?: string,
    name?: string
  ): Promise<string> => {
    try {
      // Suche mit ISIN (bevorzugt) oder Ticker oder Name
      const searchQuery = isin || ticker || name;
      if (!searchQuery) {
        return 'NASDAQ:UNKNOWN';
      }

      console.log(`🔍 Suche Symbol für: "${searchQuery}"`);
      
      // FIX: API erwartet 'query' nicht 'q'
      const searchResponse = await fetch(`/api/quotes/search?query=${encodeURIComponent(searchQuery)}&limit=3`);
      
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        
        if (searchResults.results && searchResults.results.length > 0) {
          const bestMatch = searchResults.results[0];
          
          // Mappe Exchange zu TradingView Format
          const symbol = bestMatch.symbol || bestMatch.ticker;
          const exchange = determineTradingViewExchange(
            symbol,
            bestMatch.exchange,
            bestMatch.type
          );
          const tvSymbol = `${exchange}:${symbol}`;
          
          console.log(`✅ Symbol gefunden: ${tvSymbol} (Exchange: ${bestMatch.exchange})`);
          return tvSymbol;
        }
      }
      
    } catch (error) {
      console.error('Fehler bei Symbol-Suche:', error);
    }
    
    // Fallback: Statische Methode
    return getTradingViewSymbol(ticker, isin);
  };

  // Hilfsfunktion: Finde TradingView Symbol für Underlying-Aktie (DYNAMISCH)
  const getTradingViewSymbolForUnderlying = async (underlying: string, derivateName: string): Promise<string> => {
    try {
      // 1. Extrahiere Firmennamen aus dem Derivat-Namen oder nutze Underlying direkt
      const companyName = underlying || extractCompanyNameFromDerivate(derivateName, underlying);
      console.log(`🔍 Suche Underlying-Aktie für: "${companyName}"`);
      
      // 2. WICHTIG: API erwartet 'query' Parameter (nicht 'q')
      const searchResponse = await fetch(`/api/quotes/search?query=${encodeURIComponent(companyName)}&limit=5`);
      
      console.log(`📡 API Response Status: ${searchResponse.status}`);
      
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        console.log(`📊 Suchergebnisse für Underlying "${companyName}":`, searchResults);
        
        if (searchResults.results && searchResults.results.length > 0) {
          // Filter: Nimm NICHT das erste Ergebnis wenn es ein Derivat ist
          // Suche nach dem echten Stock/Equity
          let bestMatch = searchResults.results[0];
          
          console.log(`🔎 Prüfe ${searchResults.results.length} Ergebnisse auf Derivate...`);
          
          // Durchsuche alle Ergebnisse und bevorzuge echte Aktien
          for (const result of searchResults.results) {
            const resultName = (result.name || '').toLowerCase();
            const resultTicker = result.ticker || result.symbol || '';
            
            const isLikelyDerivative = 
              resultName.includes('turbo') || 
              resultName.includes('knock') ||
              resultName.includes('zertifikat') ||
              resultName.includes('optionsschein') ||
              resultName.includes('warrant') ||
              resultName.includes('mini-future') ||
              (resultTicker.length > 10); // Derivate haben oft lange Ticker
            
            console.log(`  - ${result.name} (${resultTicker}): ${isLikelyDerivative ? '❌ Derivat' : '✅ Aktie'}`);
            
            // Wenn es KEIN Derivat ist, bevorzuge es
            if (!isLikelyDerivative) {
              bestMatch = result;
              console.log(`✅ Underlying-Aktie gefunden: ${result.name} (${resultTicker})`);
              break;
            }
          }
          
          // Mappe zu TradingView Format
          const symbol = bestMatch.symbol || bestMatch.ticker;
          const exchange = determineTradingViewExchange(
            symbol,
            bestMatch.exchange,
            bestMatch.type
          );
          const tvSymbol = `${exchange}:${symbol}`;
          
          console.log(`✅ Underlying-Symbol: ${tvSymbol} für ${companyName}`);
          return tvSymbol;
        } else {
          console.warn(`⚠️ Keine Ergebnisse von API für "${companyName}"`);
        }
      } else {
        console.error(`❌ API Fehler: ${searchResponse.status} ${searchResponse.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Fehler bei der dynamischen Underlying-Suche:', error);
    }
    
    // Letzter Fallback: NASDAQ mit erstem Wort
    const fallbackSymbol = underlying?.split(' ')[0]?.toUpperCase() || 'UNKNOWN';
    console.log(`⚠️ Fallback für Underlying: NASDAQ:${fallbackSymbol}`);
    return `NASDAQ:${fallbackSymbol}`;
  };

  // Hilfsfunktion: Extrahiere Firmennamen aus Derivat-Name
  const extractCompanyNameFromDerivate = (derivateName: string, underlying?: string): string => {
    // Wenn Underlying vorhanden ist, verwende das direkt
    if (underlying && underlying.length > 2) {
      console.log(`📌 Nutze Underlying-Feld direkt: "${underlying}"`);
      return underlying;
    }
    
    console.log(`🔧 Extrahiere aus Derivat-Name: "${derivateName}"`);
    
    // Entferne typische Derivat-Präfixe/Suffixe
    let cleanName = derivateName
      .replace(/^(Open End |Mini[- ]?Future |Turbo |Knock[- ]?Out |Optionsschein |Faktor[- ]?Zertifikat |Call |Put |Warrant )/i, '')
      .replace(/ ?(Long|Short|Bull|Bear|Call|Put)$/i, '')
      .replace(/auf /i, '')
      .trim();
    
    // Entferne Zusatzinformationen in Klammern
    cleanName = cleanName.replace(/\([^)]*\)/g, '').trim();
    
    // Extrahiere den Teil vor speziellen Zeichen oder Nummern
    const match = cleanName.match(/^([A-Za-zäöüÄÖÜß\s&.-]+?)(?:\s+\d|$)/);
    const extracted = match ? match[1].trim() : cleanName;
    
    console.log(`✨ Extrahiert: "${extracted}"`);
    return extracted;
  };

  // Hilfsfunktion: Bestimme TradingView Exchange basierend auf Symbol-Info
  const determineTradingViewExchange = (symbol: string, exchange?: string, type?: string): string => {
    // Wenn Exchange bereits gesetzt ist, mappe es zu TradingView
    if (exchange) {
      const exchangeUpper = exchange.toUpperCase();
      
      // Direkte Mappings
      const exchangeMap: Record<string, string> = {
        'NASDAQ': 'NASDAQ',
        'NYSE': 'NYSE',
        'XETRA': 'XETRA',
        'FWB': 'FWB',
        'LSE': 'LSE',
        'EURONEXT': 'EURONEXT',
        'SIX': 'SIX',
        'TSE': 'TSE',
        'HKEX': 'HKEX',
        'ASX': 'ASX',
        'TSX': 'TSX',
      };
      
      for (const [key, value] of Object.entries(exchangeMap)) {
        if (exchangeUpper.includes(key)) {
          return value;
        }
      }
    }
    
    // Crypto Detection
    if (type === 'crypto' || symbol.match(/^(BTC|ETH|BNB|SOL|XRP|ADA|DOGE|AVAX|USDT)/i)) {
      return 'BINANCE';
    }
    
    // Default: NASDAQ
    return 'NASDAQ';
  };

  // Dynamische Symbol-Suche beim Öffnen der Modal
  useEffect(() => {
    if (!position) return;

    // Bei Derivaten: Hole Underlying-Info vom ersten Trade
    const firstTrade = position.trades[0];
    const underlying = firstTrade?.underlying;
    
    // Erweiterte Derivate-Erkennung (nicht nur position.isDerivative)
    const isDerivative = position.isDerivative || 
      !!position.productType || 
      !!underlying ||
      position.name.toLowerCase().match(/turbo|knock|zertifikat|optionsschein|warrant|mini-future/);
    
    console.log(`📋 Position: ${position.name}`);
    console.log(`  - isDerivative flag: ${position.isDerivative}`);
    console.log(`  - productType: ${position.productType}`);
    console.log(`  - underlying: ${underlying}`);
    console.log(`  - ERKANNT ALS: ${isDerivative ? 'DERIVAT' : 'NORMALE AKTIE'}`);

    // Async Funktion für Symbol-Suche
    const loadSymbol = async () => {
      setIsSearchingSymbol(true);

      let detectedSymbol: string;
      let searchQueryForAlternatives: string;
      
      if (isDerivative && underlying) {
        // Dynamische Suche für Underlying bei Derivaten
        console.log(`🎯 Suche Underlying für Derivat: ${position.name} → ${underlying}`);
        detectedSymbol = await getTradingViewSymbolForUnderlying(underlying, position.name);
        
        // WICHTIG: Suche Alternativen für das UNDERLYING, nicht für das Derivat!
        searchQueryForAlternatives = underlying;
      } else {
        // Dynamische Suche für normale Aktien über ISIN/Ticker
        console.log(`📈 Suche Symbol für normale Aktie: ${position.name}`);
        detectedSymbol = await searchSymbolDynamically(position.ticker, position.isin, position.name);
        
        // Suche Alternativen für die Aktie selbst
        searchQueryForAlternatives = position.name;
      }
      
      // Prüfe ob eine gespeicherte Börsen-Präferenz existiert
      const symbolPart = detectedSymbol.split(':')[1]; // z.B. "CCJ" aus "NYSE:CCJ"
      const savedExchange = getSavedExchange(symbolPart);
      
      if (savedExchange) {
        // Nutze gespeicherte Börse
        const preferredSymbol = `${savedExchange}:${symbolPart}`;
        console.log(`💾 Gespeicherte Börsen-Präferenz gefunden: ${preferredSymbol}`);
        setTvSymbol(preferredSymbol);
      } else {
        // Nutze automatisch erkannte Börse
        setTvSymbol(detectedSymbol);
      }
      
      setIsSearchingSymbol(false);
    };

    loadSymbol().catch((err) => {
      console.error('Symbol-Suche fehlgeschlagen:', err);
      setTvSymbol(getTradingViewSymbol(position.ticker, position.isin));
      setIsSearchingSymbol(false);
    });
  }, [position]);

  // Schließe Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.exchange-dropdown')) {
          setIsDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (!position) return null;

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Hole Underlying-Info für Anzeige im Header
  const firstTrade = position.trades[0];
  const underlying = firstTrade?.underlying;
  const showingUnderlying = position.isDerivative && underlying;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background-card border-b border-border p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{position.name}</h2>
                {position.isDerivative && position.leverage && (
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded border border-orange-500/30 whitespace-nowrap">
                    {position.leverage}x Hebel
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-text-secondary flex-wrap text-xs sm:text-sm">
                <span className="font-mono">{position.ticker}</span>
                {position.isin && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{position.isin}</span>
                  </>
                )}
                {position.productType && (
                  <>
                    <span>•</span>
                    <span>{position.productType}</span>
                  </>
                )}
                {showingUnderlying && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400">📊 {underlying}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Börsen-Dropdown und Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Börsen-Auswahl Dropdown */}
              <div className="relative exchange-dropdown">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-background-elevated hover:bg-background-elevated/80 rounded-lg transition-colors border border-border text-xs sm:text-sm"
                >
                  <span className="text-white font-medium">
                    {tvSymbol.split(':')[0] || 'Börse'}
                  </span>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-background-elevated border border-border rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                  {allExchanges.map((exchange) => {
                    // Extrahiere aktuelles Symbol (ohne Börse)
                    const currentSymbol = tvSymbol.split(':')[1] || tvSymbol;
                    const fullSymbol = `${exchange.code}:${currentSymbol}`;
                    const isSelected = tvSymbol.split(':')[0] === exchange.code;
                    
                    return (
                      <button
                        key={exchange.code}
                        onClick={() => {
                          setTvSymbol(fullSymbol);
                          setIsDropdownOpen(false);
                          
                          // Speichere Börsen-Präferenz für dieses Symbol
                          saveExchangePreference(currentSymbol, exchange.code);
                          
                          console.log(`📊 Börse gewechselt zu: ${fullSymbol}`);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-background-card transition-colors border-b border-border last:border-b-0 ${
                          isSelected ? 'bg-background-card' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-white font-medium">{exchange.code}</div>
                            <div className="text-xs text-text-secondary mt-0.5">
                              {exchange.name}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export Button */}
            {position.trades.length > 0 && (
              <ExportDropdown
                trades={position.trades}
                filename={`${position.ticker || position.name}-trades`}
              />
            )}

            {onCreateAlert && (
              <button
                onClick={() => onCreateAlert({
                  isin: position.isin || position.ticker || '',
                  ticker: position.ticker,
                  name: position.name,
                  currentPrice: position.currentPrice,
                })}
                className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
                title="Preis-Alarm erstellen"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary hover:text-accent" />
              </button>
            )}

            {/* Derivat-Rechner Button - nur fuer Derivate mit offenen Trades */}
            {position.isDerivative && position.openTrades.length > 0 && (
              <button
                onClick={() => setCalculatorTrade(position.openTrades[0])}
                className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
                title="Derivat-Rechner"
              >
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary hover:text-orange-400" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary" />
            </button>
          </div>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-white mb-4">Chart</h3>
          <div className="rounded-lg overflow-hidden">
            <TradingViewChart 
              symbol={tvSymbol}
              height={450}
              theme="dark"
            />
          </div>
        </div>

        {/* Offene Trades */}
        {position.openTrades.length > 0 && (
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-white mb-4">
              Offene Trades ({position.openTrades.length})
            </h3>
            <TradeList
              trades={position.openTrades}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onEdit={onEditTrade}
              onClose={onCloseTrade}
              onDelete={onDeleteTrade}
              onConvertDemo={onConvertDemo}
              onCalculate={position.isDerivative ? (trade) => setCalculatorTrade(trade) : undefined}
            />
          </div>
        )}

        {/* Geschlossene Trades */}
        {position.closedTrades.length > 0 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Geschlossene Trades ({position.closedTrades.length})
            </h3>
            <TradeList 
              trades={position.closedTrades}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              isClosed={true}
            />
          </div>
        )}

        {/* Falls keine Trades vorhanden */}
        {position.trades.length === 0 && (
          <div className="p-6 text-center text-text-secondary">
            Keine Trades gefunden
          </div>
        )}

      </div>

      {/* Derivat-Rechner Modal */}
      {calculatorTrade && (
        <DerivativeCalculatorModal
          key={calculatorTrade.id}
          isOpen={!!calculatorTrade}
          onClose={() => setCalculatorTrade(null)}
          trade={calculatorTrade}
        />
      )}
    </div>
  );
}

// Trade List Komponente
function TradeList({
  trades,
  formatCurrency,
  formatDate,
  onEdit,
  onClose,
  onDelete,
  onConvertDemo,
  onCalculate,
  isClosed = false,
}: {
  trades: Trade[];
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: string) => string;
  onEdit?: (tradeId: string) => void;
  onClose?: (tradeId: string) => void;
  onDelete?: (tradeId: string) => void;
  onConvertDemo?: (tradeId: string) => void;
  onCalculate?: (trade: Trade) => void;
  isClosed?: boolean;
}) {
  return (
    <div className="space-y-3">
      {trades.map(trade => {
        const tradeCurrency = trade.currency || 'EUR';
        const investedEUR = convertToEURSync(trade.investedEur, tradeCurrency);
        const pnl = trade.realizedPnL || (
          trade.currentPrice 
            ? (trade.currentPrice * trade.quantity) - investedEUR 
            : 0
        );
        const pnlPercent = investedEUR > 0 ? (pnl / investedEUR) * 100 : 0;

        return (
          <div 
            key={trade.id} 
            className="bg-background-elevated rounded-lg p-4 border border-border hover:border-border-hover transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Links: Mengen- und Datumsinformationen */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {trade.quantity} Stück
                  </span>
                  {trade.isDerivative && trade.leverage && (
                    <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded">
                      {trade.leverage}x
                    </span>
                  )}
                </div>
                <div className="text-sm text-text-secondary mt-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Kauf: {formatDate(trade.buyDate)}</span>
                  {isClosed && trade.closedAt && (
                    <>
                      <span>•</span>
                      <span>Verkauf: {formatDate(trade.closedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mitte: Preise */}
              <div className="flex-1 text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-text-secondary text-xs">Kaufpreis</div>
                    <div className="text-white font-medium">
                      {formatCurrency(trade.buyPrice, trade.currency)}
                    </div>
                  </div>
                  {isClosed && trade.sellPrice && (
                    <div>
                      <div className="text-text-secondary text-xs">Verkaufspreis</div>
                      <div className="text-white font-medium">
                        {formatCurrency(trade.sellPrice, trade.currency)}
                      </div>
                    </div>
                  )}
                  {!isClosed && trade.currentPrice && (
                    <div>
                      <div className="text-text-secondary text-xs">Aktuell</div>
                      <div className="text-white font-medium">
                        {formatCurrency(trade.currentPrice, 'EUR')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rechts: P/L und Actions */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-base font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'EUR')}
                  </div>
                  <div className={`text-sm ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Action Buttons für offene Trades */}
                {!isClosed && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {onConvertDemo && trade.isDemo && (
                      <button
                        onClick={() => onConvertDemo(trade.id)}
                        className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                        title="Zu echtem Trade umwandeln"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-yellow-400" />
                      </button>
                    )}
                    {onCalculate && trade.isDerivative && (
                      <button
                        onClick={() => onCalculate(trade)}
                        className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                        title="Derivat-Rechner"
                      >
                        <Calculator className="w-4 h-4 text-orange-400" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(trade.id)}
                        className="p-2 hover:bg-background-card rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4 text-text-secondary" />
                      </button>
                    )}
                    {onClose && (
                      <button
                        onClick={() => onClose(trade.id)}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Schließen"
                      >
                        <BanknoteX className="w-4 h-4 text-green-500" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(trade.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
