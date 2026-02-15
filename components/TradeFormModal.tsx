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

export default function TradeFormModal({ isOpen, onClose, onSave }: TradeFormModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [buyPrice, setBuyPrice] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('quantity');
  const [quantity, setQuantity] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Suche ausführen
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
      }
      setIsSearching(false);
    }, 300);

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

  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchResults([]);
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

  const handleSubmit = () => {
    if (!validate()) return;

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
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStock(null)}
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
                  <div className="mt-2 text-sm text-text-secondary">Suche...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg max-h-48 overflow-y-auto bg-background-elevated">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.isin}
                        onClick={() => handleStockSelect(stock)}
                        className="w-full text-left p-3 hover:bg-background-card border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="font-medium">{stock.name}</div>
                        <div className="text-sm text-text-secondary">
                          {stock.ticker} • {stock.isin}
                        </div>
                      </button>
                    ))}
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
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Kaufkurs (EUR)
            </label>
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
              className="flex-1 bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Trade speichern
            </button>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-8 py-3 bg-background-elevated border border-border rounded-lg font-semibold hover:bg-background-card transition-all"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
