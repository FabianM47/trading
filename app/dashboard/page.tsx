/**
 * Dashboard Page - Server Component
 *
 * Einziges Dashboard: Positionen aus Trades berechnet (Average Cost),
 * Indizes oben, KPIs, Filter, Gruppen. Live-Preise jede Minute.
 */

import { db } from '@/db';
import { instrumentGroupAssignments, instrumentGroups, instruments, portfolios, trades } from '@/db/schema';
import { requireAuth } from '@/lib/auth/server';
import {
  buildPositionsFromTrades,
  type Position,
} from '@/lib/portfolio/calculations';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export const metadata = {
  title: 'Dashboard | Trading Portfolio',
  description: 'Portfolio overview with live prices and P&L tracking',
};

export default async function DashboardPage() {
  const user = await requireAuth();
  if (!user.id) throw new Error('User ID is required');

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

  const instrumentIds = [...new Set(allTrades.map((t) => t.instrumentId))];

  const instrumentsData =
    instrumentIds.length > 0
      ? await db
          .select({
            id: instruments.id,
            symbol: instruments.symbol,
            isin: instruments.isin,
            name: instruments.name,
          })
          .from(instruments)
          .where(inArray(instruments.id, instrumentIds))
      : [];

  const groupsList = await db
    .select({
      id: instrumentGroups.id,
      name: instrumentGroups.name,
      color: instrumentGroups.color,
    })
    .from(instrumentGroups)
    .where(eq(instrumentGroups.portfolioId, defaultPortfolio.id))
    .orderBy(instrumentGroups.name);

  const groupIds = groupsList.map((g) => g.id);
  const assignments =
    groupIds.length > 0
      ? await db
          .select({
            instrumentId: instrumentGroupAssignments.instrumentId,
            groupId: instrumentGroupAssignments.groupId,
          })
          .from(instrumentGroupAssignments)
          .where(inArray(instrumentGroupAssignments.groupId, groupIds))
      : [];

  const instrumentToGroup = new Map<
    string,
    { groupId: string; groupName: string; groupColor: string }
  >();
  for (const a of assignments) {
    const g = groupsList.find((x) => x.id === a.groupId);
    if (g)
      instrumentToGroup.set(a.instrumentId, {
        groupId: g.id,
        groupName: g.name,
        groupColor: g.color ?? '#666666',
      });
  }

  const instrumentMeta = new Map(
    instrumentsData.map((inst) => {
      const group = instrumentToGroup.get(inst.id);
      return [
        inst.id,
        {
          symbol: inst.symbol,
          isin: inst.isin,
          name: inst.name,
          groupId: group?.groupId,
          groupName: group?.groupName,
          groupColor: group?.groupColor,
        },
      ];
    })
  );

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

  const positionsArray: Position[] = Array.from(positionsMap.values());

  const groups = groupsList.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color ?? '#666666',
  }));

  return (
    <DashboardClient
      portfolio={{ id: defaultPortfolio.id, name: defaultPortfolio.name }}
      positions={positionsArray}
      groups={groups}
    />
  );
}
