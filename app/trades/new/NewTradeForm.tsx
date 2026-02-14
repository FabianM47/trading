/**
 * New Trade Form Component
 * 
 * Interactive form with:
 * - Instrument autocomplete search
 * - Manual ISIN entry
 * - Smart quantity/amount calculation
 * - Date/Time picker
 * - Validation
 * - Server Action submission
 */

'use client';

import { createTrade } from '@/app/actions/trades';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import { AlertCircle, Check, Loader2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Instrument {
  id: string;
  name: string;
  symbol: string;
  isin: string;
}

interface NewTradeFormProps {
  portfolioId: string;
}

export function NewTradeForm({ portfolioId }: NewTradeFormProps) {
  const router = useRouter();

  // Form state
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [manualIsin, setManualIsin] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [fees, setFees] = useState('0');
  const [executedAt, setExecutedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Instrument[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastEdited, setLastEdited] = useState<'quantity' | 'amount' | null>(null);

  // Search instruments
  const searchInstruments = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && !useManualEntry) {
        searchInstruments(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, useManualEntry, searchInstruments]);

  // Calculate amount when quantity or price changes
  useEffect(() => {
    if (lastEdited === 'quantity' && quantity && price) {
      try {
        const qty = new Decimal(quantity);
        const prc = new Decimal(price);
        const amt = qty.times(prc);
        setAmount(amt.toFixed(2));
      } catch {
        // Invalid input, ignore
      }
    }
  }, [quantity, price, lastEdited]);

  // Calculate quantity when amount or price changes
  useEffect(() => {
    if (lastEdited === 'amount' && amount && price) {
      try {
        const amt = new Decimal(amount);
        const prc = new Decimal(price);
        if (!prc.isZero()) {
          const qty = amt.dividedBy(prc);
          setQuantity(qty.toFixed(8));
        }
      } catch {
        // Invalid input, ignore
      }
    }
  }, [amount, price, lastEdited]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedInstrument && !manualIsin) {
      newErrors.instrument = 'Bitte wähle ein Instrument oder gib eine ISIN ein';
    }

    if (useManualEntry && manualIsin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(manualIsin)) {
      newErrors.isin = 'Ungültiges ISIN-Format (z.B. US0378331005)';
    }

    if (!price || parseFloat(price) <= 0) {
      newErrors.price = 'Preis muss größer als 0 sein';
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      newErrors.quantity = 'Menge muss größer als 0 sein';
    }

    if (fees && parseFloat(fees) < 0) {
      newErrors.fees = 'Gebühren dürfen nicht negativ sein';
    }

    if (!executedAt) {
      newErrors.executedAt = 'Datum ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await createTrade({
        portfolioId,
        instrumentId: selectedInstrument?.id,
        isin: useManualEntry ? manualIsin : undefined,
        symbol: useManualEntry ? manualIsin.substring(0, 6) : undefined, // Placeholder
        name: useManualEntry ? `Manual: ${manualIsin}` : undefined,
        tradeType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        fees: parseFloat(fees),
        executedAt: new Date(executedAt),
        notes: notes || undefined,
      });

      if (result.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push('/dashboard-v2');
        }, 1500);
      } else {
        setSubmitError(result.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError('Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">
            Trade erfolgreich gespeichert! Weiterleitung zum Dashboard...
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{submitError}</p>
        </div>
      )}

      <div className="space-y-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        {/* Trade Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trade-Typ
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTradeType('BUY')}
              className={cn(
                'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                tradeType === 'BUY'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              Kauf
            </button>
            <button
              type="button"
              onClick={() => setTradeType('SELL')}
              className={cn(
                'px-4 py-3 rounded-lg border-2 font-medium transition-colors',
                tradeType === 'SELL'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              Verkauf
            </button>
          </div>
        </div>

        {/* Instrument Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Instrument
          </label>

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setUseManualEntry(false);
                setManualIsin('');
              }}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                !useManualEntry
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              Suche
            </button>
            <button
              type="button"
              onClick={() => {
                setUseManualEntry(true);
                setSelectedInstrument(null);
                setSearchQuery('');
              }}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                useManualEntry
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              Manuelle ISIN
            </button>
          </div>

          {!useManualEntry ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={selectedInstrument ? selectedInstrument.name : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedInstrument(null);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Suche nach Name, Symbol oder ISIN..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
              {selectedInstrument && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInstrument(null);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-600" />
              )}

              {/* Search Results */}
              {showResults && searchResults.length > 0 && !selectedInstrument && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setSelectedInstrument(result);
                        setShowResults(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-800 last:border-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {result.symbol} - {result.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {result.isin}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedInstrument && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedInstrument.symbol} - {selectedInstrument.name}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    ISIN: {selectedInstrument.isin}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={manualIsin}
              onChange={(e) => setManualIsin(e.target.value.toUpperCase())}
              placeholder="z.B. US0378331005"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          )}

          {errors.instrument && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.instrument}</p>
          )}
          {errors.isin && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.isin}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preis pro Stück (EUR)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
          )}
        </div>

        {/* Quantity OR Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stückzahl
            </label>
            <input
              id="quantity"
              type="number"
              step="0.00000001"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setLastEdited('quantity');
              }}
              placeholder="0.00000000"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gesamtbetrag (EUR)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setLastEdited('amount');
              }}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Fees */}
        <div>
          <label htmlFor="fees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gebühren (EUR) - Optional
          </label>
          <input
            id="fees"
            type="number"
            step="0.01"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono"
          />
          {errors.fees && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fees}</p>
          )}
        </div>

        {/* Executed At */}
        <div>
          <label htmlFor="executedAt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ausführungsdatum und -zeit
          </label>
          <input
            id="executedAt"
            type="datetime-local"
            value={executedAt}
            onChange={(e) => setExecutedAt(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
          {errors.executedAt && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.executedAt}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notizen - Optional
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Zusätzliche Informationen..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || submitSuccess}
            className={cn(
              'flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              isSubmitting || submitSuccess
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Speichere...' : submitSuccess ? 'Gespeichert!' : 'Trade speichern'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </form>
  );
}
