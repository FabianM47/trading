/**
 * Trading Bot Trades Sync API
 *
 * POST /api/trading-bot/trades/sync - Sync Bot-Trades mit dem Portfolio
 *
 * Wenn include_in_portfolio aktiviert wird: Bot-Trades werden in die trades-Tabelle gespiegelt.
 * Wenn deaktiviert: Gespiegelte Trades werden entfernt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const SyncSchema = z.object({
  action: z.enum(['enable', 'disable']),
});

export async function POST(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = SyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    if (parsed.data.action === 'enable') {
      // Get all bot trades that are not yet synced
      const { data: botTrades, error: fetchError } = await supabase
        .from('bot_trades')
        .select('*')
        .eq('user_id', userId)
        .is('synced_trade_id', null);

      if (fetchError) throw fetchError;

      let syncedCount = 0;
      for (const bt of botTrades || []) {
        const portfolioTradeId = `bot-${bt.trade_id}`;

        // Create trade in main portfolio
        const { error: insertError } = await supabase
          .from('trades')
          .insert({
            user_id: userId,
            trade_id: portfolioTradeId,
            isin: bt.isin,
            ticker: bt.ticker,
            name: `[Bot] ${bt.name}`,
            buy_price: bt.buy_price,
            quantity: bt.quantity,
            invested_eur: bt.invested_amount,
            buy_date: bt.buy_date,
            currency: bt.currency,
            is_closed: bt.is_closed,
            closed_at: bt.closed_at,
            sell_price: bt.sell_price,
            sell_total: bt.sell_total,
            realized_pnl: bt.realized_pnl,
            is_demo: false,
          });

        if (!insertError) {
          // Update bot trade with synced reference
          await supabase
            .from('bot_trades')
            .update({ synced_trade_id: portfolioTradeId })
            .eq('id', bt.id);
          syncedCount++;
        }
      }

      // Update config
      await supabase
        .from('bot_user_configs')
        .update({ include_in_portfolio: true })
        .eq('user_id', userId);

      logInfo(`Synced ${syncedCount} bot trades to portfolio for user ${userId}`);
      return NextResponse.json({ success: true, syncedCount });

    } else {
      // Disable: Remove all synced trades from portfolio
      const { data: botTrades } = await supabase
        .from('bot_trades')
        .select('synced_trade_id')
        .eq('user_id', userId)
        .not('synced_trade_id', 'is', null);

      const syncedIds = (botTrades || [])
        .map(t => t.synced_trade_id)
        .filter(Boolean);

      if (syncedIds.length > 0) {
        await supabase
          .from('trades')
          .delete()
          .eq('user_id', userId)
          .in('trade_id', syncedIds);
      }

      // Clear synced references
      await supabase
        .from('bot_trades')
        .update({ synced_trade_id: null })
        .eq('user_id', userId);

      // Update config
      await supabase
        .from('bot_user_configs')
        .update({ include_in_portfolio: false })
        .eq('user_id', userId);

      logInfo(`Removed ${syncedIds.length} synced bot trades from portfolio for user ${userId}`);
      return NextResponse.json({ success: true, removedCount: syncedIds.length });
    }
  } catch (error) {
    logError('POST /api/trading-bot/trades/sync failed', error);
    return NextResponse.json({ error: 'Fehler beim Sync der Bot-Trades' }, { status: 500 });
  }
}
