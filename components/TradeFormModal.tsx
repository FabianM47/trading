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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Trade hinzufügen</h2>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Aktiensuche */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aktie suchen (Name, Ticker oder ISIN)
            </label>
            
            {selectedStock ? (
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div>
                  <div className="font-semibold">{selectedStock.name}</div>
                  <div className="text-sm text-gray-600">
                    {selectedStock.ticker} • {selectedStock.isin}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="text-sm text-red-600 hover:text-red-800"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                {isSearching && (
                  <div className="mt-2 text-sm text-gray-500">Suche...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.isin}
                        onClick={() => handleStockSelect(stock)}
                        className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                      >
                        <div className="font-medium">{stock.name}</div>
                        <div className="text-sm text-gray-600">
                          {stock.ticker} • {stock.isin}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {errors.stock && (
              <div className="mt-1 text-sm text-red-600">{errors.stock}</div>
            )}
          </div>

          {/* Kaufkurs */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kaufkurs (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="z.B. 150.50"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            {errors.buyPrice && (
              <div className="mt-1 text-sm text-red-600">{errors.buyPrice}</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stückzahl
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="z.B. 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              {errors.quantity && (
                <div className="mt-1 text-sm text-red-600">{errors.quantity}</div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investitionssumme (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="z.B. 1000"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              {quantity && (
                <div className="mt-2 text-sm text-gray-600">
                  Berechnete Stückzahl: {parseFloat(quantity).toFixed(6)}
                </div>
              )}
            </div>
          )}

          {/* Kaufdatum */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kaufdatum
            </label>
            <input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            {errors.buyDate && (
              <div className="mt-1 text-sm text-red-600">{errors.buyDate}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Trade speichern
            </button>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
