'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { estimateDerivativePrice, roundTo2 } from '@/lib/calculations';
import type { Trade } from '@/types';

interface DerivativeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade;
  currentUnderlyingPrice?: number;
}

export default function DerivativeCalculatorModal({
  isOpen,
  onClose,
  trade,
  currentUnderlyingPrice: initialUnderlyingPrice,
}: DerivativeCalculatorModalProps) {
  const [underlyingPrice, setUnderlyingPrice] = useState<string>(
    initialUnderlyingPrice ? initialUnderlyingPrice.toFixed(2) : ''
  );
  const [targetUnderlyingPrice, setTargetUnderlyingPrice] = useState<string>('');
  const [sellQuantity, setSellQuantity] = useState<string>(trade.quantity.toString());
  const [manualKnockOut, setManualKnockOut] = useState<string>(trade.knockOut != null ? trade.knockOut.toString() : '');
  const [manualLeverage, setManualLeverage] = useState<string>(trade.leverage ? trade.leverage.toString() : '');
  const [manualOptionType, setManualOptionType] = useState<'call' | 'put'>(trade.optionType || 'call');

  const currentDerivativePrice = trade.currentPrice || trade.buyPrice;
  const effectiveKnockOut = trade.knockOut ?? (parseFloat(manualKnockOut) || undefined);
  const effectiveLeverage = trade.leverage ?? (parseFloat(manualLeverage) || undefined);
  const effectiveOptionType = trade.optionType || manualOptionType;

  // Berechne Derivatpreis bei Zielkurs
  const result = useMemo(() => {
    const underlying = parseFloat(underlyingPrice);
    const target = parseFloat(targetUnderlyingPrice);
    const qty = parseFloat(sellQuantity);

    if (isNaN(underlying) || isNaN(target) || isNaN(qty) || underlying <= 0 || target <= 0 || qty <= 0) {
      return null;
    }

    const estimate = estimateDerivativePrice({
      currentDerivativePrice,
      currentUnderlyingPrice: underlying,
      targetUnderlyingPrice: target,
      knockOut: effectiveKnockOut,
      optionType: effectiveOptionType,
      leverage: effectiveLeverage,
    });

    if (!estimate) return null;

    const revenue = roundTo2(estimate.targetDerivativePrice * qty);
    const invested = roundTo2(trade.buyPrice * qty);
    const profit = roundTo2(revenue - invested);
    const profitPct = invested > 0 ? roundTo2((profit / invested) * 100) : 0;

    return {
      ...estimate,
      revenue,
      invested,
      profit,
      profitPct,
      quantity: qty,
    };
  }, [underlyingPrice, targetUnderlyingPrice, sellQuantity, currentDerivativePrice, trade, effectiveKnockOut, effectiveLeverage, effectiveOptionType]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

  const isCall = effectiveOptionType !== 'put';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background-card border-b border-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Derivat-Rechner</h2>
              <p className="text-sm text-text-secondary mt-1">{trade.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">

          {/* Info-Box: Aktuelle Daten */}
          <div className="bg-background rounded-lg p-4 space-y-2 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Aktueller Derivat-Preis</span>
              <span className="text-white font-medium">{formatCurrency(currentDerivativePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Kaufpreis</span>
              <span className="text-white font-medium">{formatCurrency(trade.buyPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Menge</span>
              <span className="text-white font-medium">{trade.quantity} Stk.</span>
            </div>
            {trade.knockOut != null ? (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Knock-Out</span>
                <span className="text-orange-400 font-medium">{formatCurrency(trade.knockOut)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Knock-Out</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualKnockOut}
                  onChange={(e) => setManualKnockOut(e.target.value)}
                  placeholder="Optional"
                  className="w-28 text-right px-2 py-1 bg-background-elevated border border-border rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>
            )}
            {trade.leverage ? (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Hebel</span>
                <span className="text-white font-medium">{trade.leverage}x</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Hebel</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualLeverage}
                  onChange={(e) => setManualLeverage(e.target.value)}
                  placeholder="Optional"
                  className="w-28 text-right px-2 py-1 bg-background-elevated border border-border rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Typ</span>
              {trade.optionType ? (
                <span className="text-white font-medium">{isCall ? 'Call / Long' : 'Put / Short'}</span>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => setManualOptionType('call')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      manualOptionType === 'call'
                        ? 'bg-profit/20 text-profit border border-profit/40'
                        : 'bg-background-elevated text-text-secondary border border-border hover:bg-border'
                    }`}
                  >
                    Call / Long
                  </button>
                  <button
                    onClick={() => setManualOptionType('put')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      manualOptionType === 'put'
                        ? 'bg-loss/20 text-loss border border-loss/40'
                        : 'bg-background-elevated text-text-secondary border border-border hover:bg-border'
                    }`}
                  >
                    Put / Short
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Schritt 1: Aktueller Kurs des Basiswerts */}
          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Aktueller Kurs Basiswert ({trade.underlying || 'Aktie'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={underlyingPrice}
              onChange={(e) => setUnderlyingPrice(e.target.value)}
              placeholder="z.B. 230.50"
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all text-white"
            />
          </div>

          {/* Schritt 2: Zielkurs des Basiswerts */}
          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Zielkurs Basiswert (Verkaufsziel)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={targetUnderlyingPrice}
              onChange={(e) => setTargetUnderlyingPrice(e.target.value)}
              placeholder="z.B. 250.00"
              className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all text-white"
            />
            {effectiveKnockOut != null && parseFloat(underlyingPrice) > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                Knock-Out bei {formatCurrency(effectiveKnockOut)}
                {isCall
                  ? ` (Abstand: ${((parseFloat(underlyingPrice) - effectiveKnockOut) / parseFloat(underlyingPrice) * 100).toFixed(1)}%)`
                  : ` (Abstand: ${((effectiveKnockOut - parseFloat(underlyingPrice)) / parseFloat(underlyingPrice) * 100).toFixed(1)}%)`}
              </p>
            )}
          </div>

          {/* Schritt 3: Menge */}
          <div>
            <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
              Anzahl zu verkaufen
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="1"
                min="1"
                max={trade.quantity}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                className="flex-1 px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all text-white"
              />
              <button
                onClick={() => setSellQuantity(trade.quantity.toString())}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  sellQuantity === trade.quantity.toString()
                    ? 'bg-white text-black'
                    : 'bg-background-elevated text-text-secondary border border-border hover:bg-border'
                }`}
              >
                Alle
              </button>
            </div>
          </div>

          {/* Ergebnis */}
          {result && (
            <div className={`rounded-lg p-4 space-y-3 border-2 ${
              result.knockedOut
                ? 'bg-red-500/10 border-red-500/40'
                : result.profit >= 0
                  ? 'bg-profit/5 border-profit/30'
                  : 'bg-loss/5 border-loss/30'
            }`}>
              {result.knockedOut ? (
                <div className="text-center py-2">
                  <p className="text-red-400 font-bold text-lg">Knock-Out!</p>
                  <p className="text-red-400/70 text-sm mt-1">
                    Bei diesem Zielkurs waere das Produkt wertlos.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Gesch. Derivat-Preis</span>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(result.targetDerivativePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">
                      Erloess ({result.quantity} Stk.)
                    </span>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(result.revenue)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-text-primary">Gewinn / Verlust</span>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${result.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {result.profit >= 0 ? '+' : ''}{formatCurrency(result.profit)}
                      </span>
                      <span className={`block text-sm ${result.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {result.profitPct >= 0 ? '+' : ''}{result.profitPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {result.method === 'leverage' && (
                    <p className="text-xs text-text-tertiary mt-1">
                      * Approximation über Hebel ({effectiveLeverage}x). Genauigkeit nimmt bei großen Kursbewegungen ab.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Hinweis wenn Daten fehlen */}
          {!effectiveKnockOut && !effectiveLeverage && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400">
              Bitte gib oben einen Knock-Out oder Hebel an, um den Rechner nutzen zu können.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 sm:p-6">
          <button
            onClick={onClose}
            className="w-full bg-background-elevated text-text-primary border border-border px-4 py-3 rounded-lg hover:bg-border transition-colors font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
