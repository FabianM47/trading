'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Trade } from '@/types';
import { searchStocks, type StockSearchResult } from '@/lib/quoteProvider';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
}

type InputMode = 'quantity' | 'investment';

interface ExtendedStockSearchResult extends StockSearchResult {
  currentPrice?: number;
  currency?: string;
  fromFinnhub?: boolean;
}

export default function TradeFormModal({ isOpen, onClose, onSave }: TradeFormModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExtendedStockSearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<ExtendedStockSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [buyPrice, setBuyPrice] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('quantity');
  const [quantity, setQuantity] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Suche ausführen - kombiniert lokale Mock-Suche und Finnhub-Suche
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Parallele Suche: Lokal (Mock) und Finnhub
        const [localResults, finnhubResponse] = await Promise.all([
          searchStocks(searchQuery),
          fetch(`/api/quotes/search?query=${encodeURIComponent(searchQuery)}`).then(r => r.json()).catch(() => ({ results: [] }))
        ]);

        // Kombiniere Ergebnisse
        const combinedResults: ExtendedStockSearchResult[] = [];
        
        // Finnhub-Ergebnisse zuerst (mit aktuellem Kurs)
        if (finnhubResponse.results && finnhubResponse.results.length > 0) {
          finnhubResponse.results.forEach((result: any) => {
            combinedResults.push({
              isin: result.isin || '',
              ticker: result.ticker,
              name: result.name,
              exchange: result.exchange,
              currentPrice: result.currentPrice,
              currency: result.currency,
              fromFinnhub: true,
            });
          });
        }
        
        // Lokale Ergebnisse hinzufügen (wenn nicht bereits von Finnhub)
        localResults.forEach((local) => {
          const existsInFinnhub = combinedResults.some(
            (r) => r.isin === local.isin || r.ticker === local.ticker
          );
          if (!existsInFinnhub) {
            combinedResults.push({
              ...local,
              fromFinnhub: false,
            });
          }
        });
        
        setSearchResults(combinedResults);
      } catch (error) {
        console.error('Search failed:', error);
        // Fallback auf lokale Suche
        try {
          const localResults = await searchStocks(searchQuery);
          setSearchResults(localResults.map(r => ({ ...r, fromFinnhub: false })));
        } catch {
          setSearchResults([]);
        }
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Automatische Berechnung
  useEffect(() => {
    if (buyPrice && inputMode === 'investment' && investmentAmount) {
      const price = parseFloat(buyPrice);
      const investment = parseFloat(investmentAmount);
      if (!isNaN(price) && !isNaN(investment) && price > 0) {
        const calculatedQty = investment / price;
        setQuantity(calculatedQty.toFixed(6));
      }
    }
  }, [buyPrice, investmentAmount, inputMode]);

  const handleStockSelect = (stock: ExtendedStockSearchResult) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchResults([]);
    
    // Wenn Finnhub-Ergebnis mit aktuellem Kurs, fülle Kaufpreis automatisch aus
    if (stock.fromFinnhub && stock.currentPrice && stock.currentPrice > 0) {
      setBuyPrice(stock.currentPrice.toString());
    }
  };

  const handleFetchCurrentPrice = async () => {
    if (!selectedStock) return;

    setIsFetchingPrice(true);
    setErrors({});

    try {
      const identifier = selectedStock.isin || selectedStock.ticker;
      const response = await fetch(`/api/quotes/validate?identifier=${encodeURIComponent(identifier)}`);
      const data = await response.json();

      if (data.valid && data.quote) {
        setBuyPrice(data.quote.price.toString());
      } else {
        setErrors({ buyPrice: data.error || 'Kein aktueller Kurs verfügbar' });
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      setErrors({ buyPrice: 'Fehler beim Abrufen des Kurses' });
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedStock) {
      newErrors.stock = 'Bitte wähle eine Aktie aus';
    }

    const price = parseFloat(buyPrice);
    if (!buyPrice || isNaN(price) || price <= 0) {
      newErrors.buyPrice = 'Ungültiger Kaufkurs';
    }

    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Ungültige Menge';
    }

    if (!buyDate) {
      newErrors.buyDate = 'Datum erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setErrors({});

    try {
      // Validiere ISIN und hole aktuellen Kurs
      const identifier = selectedStock!.isin || selectedStock!.ticker;
      const response = await fetch(`/api/quotes/validate?identifier=${encodeURIComponent(identifier)}`);
      const data = await response.json();

      if (!data.valid) {
        // Zeige Warnung, aber erlaube das Speichern
        const shouldContinue = confirm(
          `${data.error}\n\nMöchtest du den Trade trotzdem mit dem eingegebenen Kaufkurs speichern?`
        );
        
        if (!shouldContinue) {
          setIsSaving(false);
          return;
        }
      } else {
        // Wenn kein Kaufpreis eingegeben wurde, verwende aktuellen Kurs
        if (!buyPrice) {
          setBuyPrice(data.quote.price.toString());
        }
        
        // Optional: Zeige Info über aktuellen Kurs
        const currentPrice = data.quote.price;
        const enteredPrice = parseFloat(buyPrice);
        if (enteredPrice && Math.abs(currentPrice - enteredPrice) / currentPrice > 0.1) {
          // Warnung wenn Kaufpreis mehr als 10% vom aktuellen Kurs abweicht
          const shouldContinue = confirm(
            `Hinweis: Der aktuelle Kurs ist ${currentPrice.toFixed(2)} EUR, ` +
            `aber du hast ${enteredPrice.toFixed(2)} EUR als Kaufkurs eingegeben.\n\n` +
            `Möchtest du fortfahren?`
          );
          
          if (!shouldContinue) {
            setIsSaving(false);
            return;
          }
        }
      }

      const price = parseFloat(buyPrice);
      const qty = parseFloat(quantity);

      const trade: Trade = {
        id: uuidv4(),
        isin: selectedStock!.isin,
        ticker: selectedStock!.ticker,
        name: selectedStock!.name,
        buyPrice: price,
        quantity: qty,
        investedEur: Math.round(price * qty * 100) / 100,
        buyDate: new Date(buyDate).toISOString(),
      };

      onSave(trade);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error saving trade:', error);
      setErrors({ submit: 'Fehler beim Speichern. Bitte versuche es erneut.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStock(null);
    setBuyPrice('');
    setQuantity('');
    setInvestmentAmount('');
    setBuyDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    setIsSaving(false);
    setIsFetchingPrice(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm">
      <div className="bg-background-card rounded-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Trade hinzufügen</h2>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="text-text-secondary hover:text-text-primary text-3xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Aktiensuche */}
          <div className="mb-6">
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Aktie suchen (Name, Ticker oder ISIN)
            </label>
            
            {selectedStock ? (
              <div className="flex items-center justify-between p-3 bg-background-elevated rounded-lg border border-border">
                <div>
                  <div className="font-semibold">{selectedStock.name}</div>
                  <div className="text-sm text-text-secondary">
                    {selectedStock.ticker} • {selectedStock.isin}
                    {selectedStock.fromFinnhub && selectedStock.currentPrice && (
                      <span className="ml-2 text-success">
                        • Aktuell: {selectedStock.currentPrice.toFixed(2)} {selectedStock.currency || 'EUR'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStock(null);
                    setBuyPrice(''); // Reset Kaufpreis beim Ändern
                  }}
                  className="text-sm text-loss hover:text-loss-dark transition-colors font-medium"
                >
                  Ändern
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="z.B. Apple, AAPL, US0378331005"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all"
                />
                {isSearching && (
                  <div className="mt-2 text-sm text-text-secondary">🔍 Suche bei Finnhub...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg max-h-64 overflow-y-auto bg-background-elevated">
                    {searchResults.map((stock, index) => (
                      <button
                        key={`${stock.isin}-${stock.ticker}-${index}`}
                        onClick={() => handleStockSelect(stock)}
                        className="w-full text-left p-3 hover:bg-background-card border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {stock.name}
                              {stock.fromFinnhub && (
                                <span className="text-xs px-2 py-0.5 bg-success bg-opacity-20 text-success rounded">
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {stock.ticker} • {stock.isin}
                            </div>
                          </div>
                          {stock.currentPrice && stock.currentPrice > 0 && (
                            <div className="text-right ml-3">
                              <div className="text-sm font-semibold tabular-nums text-success">
                                {stock.currentPrice.toFixed(2)} {stock.currency || 'EUR'}
                              </div>
                              <div className="text-xs text-text-secondary">
                                Aktueller Kurs
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="mt-2 text-sm text-text-secondary">
                    Keine Ergebnisse gefunden. Versuche es mit einem anderen Suchbegriff.
                  </div>
                )}
              </>
            )}
            {errors.stock && (
              <div className="mt-1 text-sm text-loss">{errors.stock}</div>
            )}
          </div>

          {/* Kaufkurs */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs text-text-secondary uppercase tracking-wide font-medium">
                Kaufkurs (EUR)
              </label>
              {selectedStock && (
                <button
                  onClick={handleFetchCurrentPrice}
                  disabled={isFetchingPrice}
                  className="text-xs text-white hover:text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingPrice ? '🔄 Lädt...' : '💡 Aktuellen Kurs holen'}
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="z.B. 150.50"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
            {errors.buyPrice && (
              <div className="mt-1 text-sm text-loss">{errors.buyPrice}</div>
            )}
          </div>

          {/* Eingabemodus */}
          <div className="mb-4">
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={inputMode === 'quantity'}
                  onChange={() => setInputMode('quantity')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Stückzahl eingeben</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={inputMode === 'investment'}
                  onChange={() => setInputMode('investment')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Investitionssumme eingeben</span>
              </label>
            </div>
          </div>

          {/* Stückzahl oder Investition */}
          {inputMode === 'quantity' ? (
            <div className="mb-6">
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
                Stückzahl
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="z.B. 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all"
              />
              {errors.quantity && (
                <div className="mt-1 text-sm text-loss">{errors.quantity}</div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
                Investitionssumme (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="z.B. 1000"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all"
              />
              {quantity && (
                <div className="mt-2 text-sm text-text-secondary">
                  Berechnete Stückzahl: <span className="font-semibold tabular-nums">{parseFloat(quantity).toFixed(6)}</span>
                </div>
              )}
            </div>
          )}

          {/* Kaufdatum */}
          <div className="mb-6">
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Kaufdatum
            </label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
            {errors.buyDate && (
              <div className="mt-1 text-sm text-loss">{errors.buyDate}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSaving ? 'Wird gespeichert...' : 'Trade speichern'}
            </button>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={isSaving}
              className="px-8 py-3 bg-background-elevated border border-border rounded-lg font-semibold hover:bg-background-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>
          </div>
          
          {/* Error Message */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-loss bg-opacity-10 border border-loss rounded-lg text-loss text-sm">
              {errors.submit}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
