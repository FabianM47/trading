/**
 * Trading Bot Stats API
 *
 * GET /api/trading-bot/stats - Aggregierte Bot-Statistiken
 */

import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { BotStats } from '@/types/trading-bot';

export async function GET() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    // Fetch config, trades, and active strategy in parallel
    const [configResult, tradesResult, strategyResult] = await Promise.all([
      supabase
        .from('bot_user_configs')
        .select('virtual_budget, remaining_budget, active_strategy_id')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('bot_trades')
        .select('is_closed, realized_pnl, buy_date, closed_at, invested_amount')
        .eq('user_id', userId),
      supabase
        .from('bot_strategies')
        .select('name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single(),
    ]);

    const config = configResult.data;
    const trades = tradesResult.data || [];
    const activeStrategy = strategyResult.data;

    const openTrades = trades.filter(t => !t.is_closed);
    const closedTrades = trades.filter(t => t.is_closed);

    const wins = closedTrades.filter(t => t.realized_pnl && parseFloat(t.realized_pnl) > 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const totalRealizedPnL = closedTrades.reduce(
      (sum, t) => sum + (t.realized_pnl ? parseFloat(t.realized_pnl) : 0),
      0
    );

    // Calculate average holding days for closed trades
    let avgHoldingDays = 0;
    if (closedTrades.length > 0) {
      const totalDays = closedTrades.reduce((sum, t) => {
        if (t.buy_date && t.closed_at) {
          const buyDate = new Date(t.buy_date);
          const closeDate = new Date(t.closed_at);
          const days = Math.ceil((closeDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(0, days);
        }
        return sum;
      }, 0);
      avgHoldingDays = Math.round(totalDays / closedTrades.length);
    }

    const stats: BotStats = {
      totalTrades: trades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      winRate: Math.round(winRate * 10) / 10,
      totalRealizedPnL: Math.round(totalRealizedPnL * 100) / 100,
      avgHoldingDays,
      virtualBudget: config ? parseFloat(config.virtual_budget) : 10000,
      remainingBudget: config ? parseFloat(config.remaining_budget) : 10000,
      activeStrategyName: activeStrategy?.name || undefined,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    logError('GET /api/trading-bot/stats failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Statistiken' }, { status: 500 });
  }
}
