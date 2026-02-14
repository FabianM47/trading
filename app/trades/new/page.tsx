/**
 * New Trade Page
 * 
 * Features:
 * - Instrument search with autocomplete
 * - Manual ISIN entry
 * - Price input
 * - Quantity OR Amount (one calculates the other)
 * - Fees (optional)
 * - Date/Time
 * - Validation with helpful messages
 * - Server Action for submission
 */

import { db } from '@/db';
import { portfolios } from '@/db/schema';
import { requireAuth } from '@/lib/auth/server';
import { and, eq } from 'drizzle-orm';
import { NewTradeForm } from './NewTradeForm';

export const metadata = {
  title: 'Neuer Trade | Trading Portfolio',
  description: 'Füge einen neuen Trade hinzu',
};

export default async function NewTradePage() {
  // Require authentication
  const user = await requireAuth();

  if (!user.id) {
    throw new Error('User ID is required');
  }

  // Get user's default portfolio
  const defaultPortfolio = await db.query.portfolios.findFirst({
    where: and(
      eq(portfolios.userId, user.id),
      eq(portfolios.isDefault, true)
    ),
  });

  if (!defaultPortfolio) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Neuer Trade</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Kein Portfolio gefunden</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Erstellen Sie zuerst ein Portfolio, um Trades hinzuzufügen.
          </p>
          <a
            href="/portfolios/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Portfolio erstellen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Neuer Trade
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Portfolio: {defaultPortfolio.name}
        </p>
      </div>

      <NewTradeForm portfolioId={defaultPortfolio.id} />
    </div>
  );
}
