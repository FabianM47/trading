'use client';

import { useState } from 'react';
import type { Trade } from '@/types';
import { calculateRealizedPnL, formatCurrency, getPnLColorClass } from '@/lib/calculations';
import CustomDatePicker from './CustomDatePicker';

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onSave: (
    tradeId: string,
    sellQuantity: number,
    sellPrice: number | undefined,
    sellTotal: number | undefined,
    realizedPnL: number,
    closedDate: string
  ) => void;
}

type InputMode = 'perShare' | 'total';

export default function CloseTradeModal({
  trade,
  onClose,
  onSave,
}: CloseTradeModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('perShare');
  const [sellQuantity, setSellQuantity] = useState(trade.quantity.toFixed(2));
  const [sellPrice, setSellPrice] = useState('');
  const [sellTotal, setSellTotal] = useState('');
  const [closedDate, setClosedDate] = useState<Date>(new Date()); // Default: heute
  const [error, setError] = useState('');

  // Setze Verkaufsmenge basierend auf Prozent
  const setPercentage = (percent: number) => {
    if (percent === 100) {
      // Bei 100% exakt die volle Menge verwenden (keine Rundungsfehler)
      setSellQuantity(trade.quantity.toString());
    } else {
      const amount = (trade.quantity * percent) / 100;
      // Runde auf 2 Nachkommastellen
      setSellQuantity(amount.toFixed(2));
    }
    setError('');
  };

  // Behandle Mengen-Eingabe mit max 2 Nachkommastellen
  const handleQuantityChange = (value: string) => {
    // Erlaube leere Eingabe
    if (value === '') {
      setSellQuantity('');
      return;
    }

    // Validiere Format: Zahl mit max 2 Nachkommastellen
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value)) {
      setSellQuantity(value);
      setError('');
    }
  };

  // Berechne Werte für Anzeige
  const quantity = parseFloat(sellQuantity) || 0;
  const isPartialSale = quantity > 0 && quantity < trade.quantity;

  // Berechne realisierten Gewinn basierend auf Eingabe
  const calculatePnL = (): number => {
    const qty = parseFloat(sellQuantity);
    if (isNaN(qty) || qty <= 0) return 0;

    if (inputMode === 'perShare' && sellPrice) {
      const price = parseFloat(sellPrice);
      if (isNaN(price) || price <= 0) return 0;
      
      // Gewinn = (Verkaufspreis - Kaufpreis) × Menge
      return (price - trade.buyPrice) * qty;
    } else if (inputMode === 'total' && sellTotal) {
      const total = parseFloat(sellTotal);
      if (isNaN(total) || total <= 0) return 0;
      
      // Gewinn = Verkaufserlös - (Kaufpreis × Menge)
      return total - (trade.buyPrice * qty);
    }
    return 0;
  };

  const realizedPnL = calculatePnL();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let qty = parseFloat(sellQuantity);
    
    // Bei sehr nahe an 100%: Verwende exakte Menge (verhindert Rundungsfehler)
    const percentage = (qty / trade.quantity) * 100;
    if (percentage > 99.99 && percentage <= 100) {
      qty = trade.quantity;
    }
    
    const priceValue = inputMode === 'perShare' ? parseFloat(sellPrice) : undefined;
    const totalValue = inputMode === 'total' ? parseFloat(sellTotal) : undefined;

    // Validierung Menge
    if (isNaN(qty) || qty <= 0) {
      setError('Bitte geben Sie eine gültige Menge ein.');
      return;
    }
    
    if (qty > trade.quantity) {
      setError(`Die Menge darf nicht größer als ${trade.quantity.toFixed(2)} sein.`);
      return;
    }

    // Validierung Preis/Betrag
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

    // Verwende die potentiell korrigierte Menge
    const finalRealizedPnL = inputMode === 'perShare' && priceValue
      ? (priceValue - trade.buyPrice) * qty
      : (totalValue! - (trade.buyPrice * qty));

    onSave(trade.id, qty, priceValue, totalValue, finalRealizedPnL, closedDate.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border bg-background-elevated sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Trade schließen
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {trade.name} ({trade.ticker || trade.isin})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
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
              <span className="text-text-secondary">Verfügbare Anzahl:</span>
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

          {/* Zu verkaufende Menge */}
          <div className="space-y-3">
            <label htmlFor="sellQuantity" className="block text-sm font-medium text-text-primary">
              Zu verkaufende Anzahl
            </label>
            
            {/* Prozent-Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPercentage(25)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm font-medium text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setPercentage(50)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm font-medium text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setPercentage(75)}
                className="px-3 py-2 bg-background border border-border rounded-md text-sm font-medium text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setPercentage(100)}
                className="px-3 py-2 bg-accent border border-accent rounded-md text-sm font-bold text-white hover:bg-accent/90 transition-colors"
              >
                100%
              </button>
            </div>

            <input
              type="text"
              id="sellQuantity"
              value={sellQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder={`Max: ${trade.quantity.toFixed(2)}`}
              required
            />
            <p className="text-xs text-text-secondary">
              Maximal 2 Nachkommastellen erlaubt
            </p>
            
            {isPartialSale && (
              <div className="bg-accent/10 border border-accent/30 rounded-md p-3">
                <p className="text-xs font-semibold text-accent">
                  ⚠️ Teilverkauf: {quantity.toFixed(2)} von {trade.quantity.toFixed(2)} Stück
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Verbleibend: {(trade.quantity - quantity).toFixed(2)} Stück
                </p>
              </div>
            )}
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
              {sellPrice && !isNaN(parseFloat(sellPrice)) && parseFloat(sellPrice) > 0 && sellQuantity && !isNaN(parseFloat(sellQuantity)) && (
                <p className="text-xs text-text-secondary">
                  Gesamterlös: {formatCurrency(parseFloat(sellPrice) * parseFloat(sellQuantity))}
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
              {sellTotal && !isNaN(parseFloat(sellTotal)) && parseFloat(sellTotal) > 0 && sellQuantity && !isNaN(parseFloat(sellQuantity)) && (
                <p className="text-xs text-text-secondary">
                  Preis pro Aktie: {formatCurrency(parseFloat(sellTotal) / parseFloat(sellQuantity))}
                </p>
              )}
            </div>
          )}

          {/* Datum des Verkaufs */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Verkaufsdatum
            </label>
            <CustomDatePicker
              selected={closedDate}
              onChange={(date) => setClosedDate(date || new Date())}
              maxDate={new Date()} // Maximal heute
              placeholderText="Verkaufsdatum wählen"
            />
          </div>

          {/* Realisierter Gewinn Preview */}
          {(sellPrice || sellTotal) && sellQuantity && (
            <div className="bg-background rounded-lg p-4 border-2 border-accent/40 shadow-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-text-primary">
                  Realisierter Gewinn/Verlust:
                </span>
                <span className={`text-xl font-bold ${getPnLColorClass(realizedPnL)}`}>
                  {formatCurrency(realizedPnL)}
                </span>
              </div>
              {isPartialSale && (
                <div className="text-xs text-text-secondary pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span>Verkaufte Menge:</span>
                    <span className="font-medium">{parseFloat(sellQuantity).toFixed(2)} Stück</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verbleibend im Portfolio:</span>
                    <span className="font-medium">{(trade.quantity - parseFloat(sellQuantity)).toFixed(2)} Stück</span>
                  </div>
                </div>
              )}
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
              {isPartialSale ? 'Teilverkauf durchführen' : 'Trade komplett schließen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
