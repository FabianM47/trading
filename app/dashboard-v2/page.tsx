/**
 * Dashboard Page - Server Component
 * 
 * Features:
 * - Market indices overview
 * - Portfolio KPIs (month/total profit, unrealized P&L)
 * - Positions table with filters
 * - Group management
 * 
 * Calculations use Average Cost Method
 */

import { db } from '@/db';
import { instruments, portfolios, trades } from '@/db/schema';
import { requireAuth } from '@/lib/auth/server';
import {
  buildPositionsFromTrades,
  type Position,
} from '@/lib/portfolio/calculations';
import { and, eq, sql } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export const metadata = {
  title: 'Dashboard | Trading Portfolio',
  description: 'Portfolio overview with live prices and P&L tracking',
};

export default async function DashboardPage() {
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
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Kein Portfolio gefunden</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
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

  // Fetch all trades for this portfolio
  const allTrades = await db
    .select({
      id: trades.id,
      instrumentId: trades.instrumentId,
      type: trades.tradeType,
      quantity: trades.quantity,
      price: trades.pricePerUnit,
      fees: trades.fees,
      executedAt: trades.executedAt,
      portfolioId: trades.portfolioId,
    })
    .from(trades)
    .where(eq(trades.portfolioId, defaultPortfolio.id))
    .orderBy(sql`${trades.executedAt} ASC`);

  // Fetch instrument metadata
  const instrumentIds = [...new Set(allTrades.map((t) => t.instrumentId))];
  const instrumentsData = await db
    .select({
      id: instruments.id,
      symbol: instruments.symbol,
      isin: instruments.isin,
      name: instruments.name,
    })
    .from(instruments)
    .where(sql`${instruments.id} IN ${instrumentIds}`);

  // Build instrument metadata map
  const instrumentMeta = new Map(
    instrumentsData.map((inst) => {
      return [
        inst.id,
        {
          symbol: inst.symbol,
          isin: inst.isin,
          name: inst.name,
          groupId: undefined,
          groupName: undefined,
          groupColor: undefined,
        },
      ];
    })
  );

  // Build positions from trades
  const positionsMap = buildPositionsFromTrades(
    allTrades.map((t) => ({
      ...t,
      type: t.type as 'BUY' | 'SELL',
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.price),
      fees: parseFloat(t.fees),
    })),
    instrumentMeta
  );

  // Convert to array for client
  const positionsArray: Position[] = Array.from(positionsMap.values());

  return (
    <DashboardClient
      portfolio={{
        id: defaultPortfolio.id,
        name: defaultPortfolio.name,
      }}
      positions={positionsArray}
      groups={[]}
    />
  );
}
