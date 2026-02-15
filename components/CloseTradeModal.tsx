'use client';

import { useState } from 'react';
import type { Trade } from '@/types';
import { calculateRealizedPnL, formatCurrency, getPnLColorClass } from '@/lib/calculations';

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onSave: (
    tradeId: string,
    sellPrice: number | undefined,
    sellTotal: number | undefined,
    realizedPnL: number
  ) => void;
}

type InputMode = 'perShare' | 'total';

export default function CloseTradeModal({
  trade,
  onClose,
  onSave,
}: CloseTradeModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('perShare');
  const [sellPrice, setSellPrice] = useState('');
  const [sellTotal, setSellTotal] = useState('');
  const [error, setError] = useState('');

  // Berechne realisierten Gewinn basierend auf Eingabe
  const calculatePnL = (): number => {
    if (inputMode === 'perShare' && sellPrice) {
      const price = parseFloat(sellPrice);
      if (isNaN(price) || price <= 0) return 0;
      return calculateRealizedPnL(trade, price, undefined);
    } else if (inputMode === 'total' && sellTotal) {
      const total = parseFloat(sellTotal);
      if (isNaN(total) || total <= 0) return 0;
      return calculateRealizedPnL(trade, undefined, total);
    }
    return 0;
  };

  const realizedPnL = calculatePnL();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const priceValue = inputMode === 'perShare' ? parseFloat(sellPrice) : undefined;
    const totalValue = inputMode === 'total' ? parseFloat(sellTotal) : undefined;

    // Validierung
    if (inputMode === 'perShare') {
      if (!sellPrice || isNaN(priceValue!) || priceValue! <= 0) {
        setError('Bitte geben Sie einen gültigen Verkaufspreis ein.');
        return;
      }
    } else {
      if (!sellTotal || isNaN(totalValue!) || totalValue! <= 0) {
        setError('Bitte geben Sie einen gültigen Gesamtbetrag ein.');
        return;
      }
    }

    onSave(trade.id, priceValue, totalValue, realizedPnL);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg shadow-2xl max-w-lg w-full border-2 border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border bg-background-elevated">
          <h2 className="text-xl font-semibold text-text-primary">
            Trade schließen
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {trade.name} ({trade.ticker || trade.isin})
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trade Informationen */}
          <div className="bg-background rounded-lg p-4 space-y-2 border-2 border-border">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Kaufpreis:</span>
              <span className="text-text-primary font-medium">
                {formatCurrency(trade.buyPrice)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Anzahl:</span>
              <span className="text-text-primary font-medium">
                {trade.quantity} Stück
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Investiert:</span>
              <span className="text-text-primary font-medium">
                {formatCurrency(trade.investedEur)}
              </span>
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Eingabemodus
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputMode('perShare');
                  setSellTotal('');
                  setError('');
                }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'perShare'
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary hover:bg-border'
                }`}
              >
                Preis pro Aktie
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('total');
                  setSellPrice('');
                  setError('');
                }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'total'
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary hover:bg-border'
                }`}
              >
                Gesamtbetrag
              </button>
            </div>
          </div>

          {/* Input Fields */}
          {inputMode === 'perShare' ? (
            <div className="space-y-2">
              <label htmlFor="sellPrice" className="block text-sm font-medium text-text-primary">
                Verkaufspreis pro Aktie (€)
              </label>
              <input
                type="number"
                id="sellPrice"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => {
                  setSellPrice(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="z.B. 150.50"
                required
              />
              {sellPrice && !isNaN(parseFloat(sellPrice)) && parseFloat(sellPrice) > 0 && (
                <p className="text-xs text-text-secondary">
                  Gesamterlös: {formatCurrency(parseFloat(sellPrice) * trade.quantity)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="sellTotal" className="block text-sm font-medium text-text-primary">
                Gesamtverkaufsbetrag (€)
              </label>
              <input
                type="number"
                id="sellTotal"
                step="0.01"
                min="0"
                value={sellTotal}
                onChange={(e) => {
                  setSellTotal(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="z.B. 15050.00"
                required
              />
              {sellTotal && !isNaN(parseFloat(sellTotal)) && parseFloat(sellTotal) > 0 && (
                <p className="text-xs text-text-secondary">
                  Preis pro Aktie: {formatCurrency(parseFloat(sellTotal) / trade.quantity)}
                </p>
              )}
            </div>
          )}

          {/* Realisierter Gewinn Preview */}
          {(sellPrice || sellTotal) && (
            <div className="bg-background rounded-lg p-4 border-2 border-accent/40 shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-text-primary">
                  Realisierter Gewinn/Verlust:
                </span>
                <span className={`text-xl font-bold ${getPnLColorClass(realizedPnL)}`}>
                  {formatCurrency(realizedPnL)}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-loss-bg text-loss px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-background text-text-primary border-2 border-border rounded-md hover:bg-border transition-colors font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors font-semibold shadow-lg"
            >
              Trade schließen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
