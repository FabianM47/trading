/**
 * Beispiel: Trade Form Component
 * 
 * Verwendet:
 * - React Hook Form für Form-Management
 * - Zod für Validierung
 * - Server Action für Submission
 */

'use client';

import { createTradeAction } from '@/app/actions/trade.actions';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import type { TradeFormInput } from '@/lib/types/trading.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function TradeForm({ portfolioId }: { portfolioId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<TradeFormInput>({
    resolver: zodResolver(createTradeRequestSchema) as any,
    defaultValues: {
      portfolioId,
      tradeType: 'BUY',
      quantity: '',
      pricePerUnit: '',
      fees: '0',
      currency: 'EUR',
      executedAt: new Date(),
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createTradeAction(data);

      if (!result.success) {
        // Zeige Validierungsfehler
        Object.entries(result.error).forEach(([field, errors]) => {
          if (field === '_form') {
            setErrorMessage(errors[0]);
          } else {
            form.setError(field as keyof TradeFormInput, {
              message: errors[0],
            });
          }
        });
      } else {
        // Erfolg
        setSuccessMessage('Trade erfolgreich erstellt!');
        form.reset();
      }
    } catch (error) {
      setErrorMessage('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Neuer Trade</h2>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* ISIN */}
        <div>
          <label htmlFor="isin" className="block text-sm font-medium mb-1">
            ISIN *
          </label>
          <input
            id="isin"
            type="text"
            placeholder="US0378331005"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('isin')}
          />
          {form.formState.errors.isin && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.isin.message}
            </p>
          )}
        </div>

        {/* Trade Type */}
        <div>
          <label htmlFor="tradeType" className="block text-sm font-medium mb-1">
            Type *
          </label>
          <select
            id="tradeType"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('tradeType')}
          >
            <option value="BUY">Kauf</option>
            <option value="SELL">Verkauf</option>
          </select>
          {form.formState.errors.tradeType && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.tradeType.message}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium mb-1">
            Menge *
          </label>
          <input
            id="quantity"
            type="text"
            placeholder="10.5"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('quantity')}
          />
          {form.formState.errors.quantity && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.quantity.message}
            </p>
          )}
        </div>

        {/* Price Per Unit */}
        <div>
          <label htmlFor="pricePerUnit" className="block text-sm font-medium mb-1">
            Preis pro Einheit *
          </label>
          <input
            id="pricePerUnit"
            type="text"
            placeholder="125.50"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('pricePerUnit')}
          />
          {form.formState.errors.pricePerUnit && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.pricePerUnit.message}
            </p>
          )}
        </div>

        {/* Fees */}
        <div>
          <label htmlFor="fees" className="block text-sm font-medium mb-1">
            Gebühren
          </label>
          <input
            id="fees"
            type="text"
            placeholder="5.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('fees')}
          />
          {form.formState.errors.fees && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.fees.message}
            </p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium mb-1">
            Währung *
          </label>
          <input
            id="currency"
            type="text"
            placeholder="EUR"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('currency')}
          />
          {form.formState.errors.currency && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.currency.message}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notizen
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Optional..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('notes')}
          />
          {form.formState.errors.notes && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.notes.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? 'Wird erstellt...' : 'Trade erstellen'}
        </button>
      </form>
    </div>
  );
}
