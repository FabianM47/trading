/**
 * Beispiel: Trade Form Component
 * 
 * Verwendet:
 * - React Hook Form für Form-Management
 * - Zod für Validierung
 * - Server Action für Submission
 */

'use client';

import { createTradeOrder } from '@/app/actions/trade.actions';
import { tradeOrderSchema, type TradeOrder } from '@/lib/schemas/trading.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function TradeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<TradeOrder>({
    resolver: zodResolver(tradeOrderSchema),
    defaultValues: {
      symbol: '',
      amount: 0,
      type: 'buy',
      price: undefined,
      stopLoss: undefined,
      takeProfit: undefined,
    },
  });

  const onSubmit = async (data: TradeOrder) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createTradeOrder(data);

      if (!result.success) {
        // Zeige Validierungsfehler
        Object.entries(result.error).forEach(([field, errors]) => {
          if (field === '_form') {
            setErrorMessage(errors[0]);
          } else {
            form.setError(field as keyof TradeOrder, {
              message: errors[0],
            });
          }
        });
      } else {
        // Erfolg
        setSuccessMessage('Trade Order erfolgreich erstellt!');
        form.reset();
      }
    } catch (error) {
      setErrorMessage('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Symbol */}
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium mb-1">
            Symbol *
          </label>
          <input
            id="symbol"
            type="text"
            placeholder="BTC/USD"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('symbol')}
          />
          {form.formState.errors.symbol && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.symbol.message}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-1">
            Type *
          </label>
          <select
            id="type"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('type')}
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          {form.formState.errors.type && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.type.message}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Amount *
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('amount', { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.amount.message}
            </p>
          )}
        </div>

        {/* Price (optional) */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">
            Price (optional)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('price', { valueAsNumber: true })}
          />
          {form.formState.errors.price && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.price.message}
            </p>
          )}
        </div>

        {/* Stop Loss (optional) */}
        <div>
          <label htmlFor="stopLoss" className="block text-sm font-medium mb-1">
            Stop Loss (optional)
          </label>
          <input
            id="stopLoss"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('stopLoss', { valueAsNumber: true })}
          />
        </div>

        {/* Take Profit (optional) */}
        <div>
          <label htmlFor="takeProfit" className="block text-sm font-medium mb-1">
            Take Profit (optional)
          </label>
          <input
            id="takeProfit"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...form.register('takeProfit', { valueAsNumber: true })}
          />
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
