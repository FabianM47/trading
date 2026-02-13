/**
 * Dashboard Page (Server Component)
 * 
 * Loads user positions from database and passes to client component
 * Auth-protected route
 */

import { db } from '@/db';
import { portfolios, positions } from '@/db/schema';
import { requireAuth } from '@/lib/auth/server';
import { and, eq } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  // Require authentication
  const user = await requireAuth();

  // Ensure user.id is defined
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

  // If no portfolio, show empty state
  if (!defaultPortfolio) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Kein Portfolio gefunden</h2>
          <p className="text-gray-700 mb-4">
            Erstellen Sie zuerst ein Portfolio, um Ihre Positionen zu verwalten.
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

  // Load positions with instrument details
  const userPositions = await db.query.positions.findMany({
    where: and(
      eq(positions.portfolioId, defaultPortfolio.id),
      eq(positions.isClosed, false)
    ),
    with: {
      instrument: true,
    },
  });

  // Transform for client component
  const portfolioPositions = userPositions.map((pos) => ({
    id: pos.id,
    instrumentId: pos.instrument.id,
    instrumentSymbol: pos.instrument.symbol,
    instrumentName: pos.instrument.name,
    isin: pos.instrument.isin,
    quantity: parseFloat(pos.totalQuantity),
    avgCost: parseFloat(pos.avgBuyPrice),
    currency: pos.currency,
  }));

  return (
    <DashboardClient
      positions={portfolioPositions}
      portfolioName={defaultPortfolio.name}
      user={user}
    />
  );
}
