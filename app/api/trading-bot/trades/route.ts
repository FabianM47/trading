/**
 * Trading Bot Trades API
 *
 * GET    /api/trading-bot/trades - Laedt Bot-Trades (Filter: isin, status)
 * POST   /api/trading-bot/trades - Erstellt einen neuen Bot-Trade
 * PUT    /api/trading-bot/trades - Aktualisiert einen Bot-Trade (z.B. schliessen)
 * DELETE /api/trading-bot/trades?id=... - Loescht einen Bot-Trade
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToTrade, tradeToDbRow } from '@/lib/trading-bot/mappers';

const CreateTradeSchema = z.object({
  tradeId: z.string().min(1).max(100),
  isin: z.string().min(1).max(30),
  ticker: z.string().max(30).optional(),
  name: z.string().min(1).max(200),
  buyPrice: z.number().positive(),
  quantity: z.number().positive(),
  investedAmount: z.number().positive(),
  buyDate: z.string(),
  currency: z.enum(['EUR', 'USD']).optional().default('EUR'),
  signalType: z.enum(['manual', 'bot_signal', 'bot_auto']).optional().default('manual'),
  strategyId: z.string().uuid().optional(),
  entryReason: z.string().max(2000).optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  riskRewardRatio: z.number().positive().optional(),
});

const UpdateTradeSchema = z.object({
  id: z.string().uuid(),
  currentPrice: z.number().positive().optional(),
  isClosed: z.boolean().optional(),
  closedAt: z.string().optional(),
  sellPrice: z.number().positive().optional(),
  sellTotal: z.number().optional(),
  realizedPnL: z.number().optional(),
  exitReason: z.string().max(2000).optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin');
  const status = searchParams.get('status') || 'all'; // open, closed, all

  try {
    let query = supabase
      .from('bot_trades')
      .select('*')
      .eq('user_id', userId)
      .order('buy_date', { ascending: false });

    if (isin) {
      query = query.eq('isin', isin);
    }
    if (status === 'open') {
      query = query.eq('is_closed', false);
    } else if (status === 'closed') {
      query = query.eq('is_closed', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ trades: (data || []).map(dbRowToTrade) });
  } catch (error) {
    logError('GET /api/trading-bot/trades failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Bot-Trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = CreateTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const dbRow = tradeToDbRow({ ...parsed.data, userId });

    const { data, error } = await supabase
      .from('bot_trades')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ein Trade mit dieser ID existiert bereits' }, { status: 409 });
      }
      throw error;
    }

    // Update remaining budget
    await updateRemainingBudget(userId);

    return NextResponse.json({ trade: dbRowToTrade(data) }, { status: 201 });
  } catch (error) {
    logError('POST /api/trading-bot/trades failed', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Bot-Trades' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;
    const dbRow = tradeToDbRow(updates);

    const { data, error } = await supabase
      .from('bot_trades')
      .update(dbRow)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Update remaining budget if trade was closed
    if (updates.isClosed) {
      await updateRemainingBudget(userId);
    }

    return NextResponse.json({ trade: dbRowToTrade(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/trades failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Bot-Trades' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id Parameter fehlt' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('bot_trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    await updateRemainingBudget(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE /api/trading-bot/trades failed', error);
    return NextResponse.json({ error: 'Fehler beim Loeschen des Bot-Trades' }, { status: 500 });
  }
}

/**
 * Berechnet das verbleibende Budget neu basierend auf offenen Trades.
 */
async function updateRemainingBudget(userId: string) {
  try {
    // Get config
    const { data: config } = await supabase
      .from('bot_user_configs')
      .select('virtual_budget')
      .eq('user_id', userId)
      .single();

    if (!config) return;

    // Sum invested amounts of open trades
    const { data: openTrades } = await supabase
      .from('bot_trades')
      .select('invested_amount')
      .eq('user_id', userId)
      .eq('is_closed', false);

    const investedTotal = (openTrades || []).reduce(
      (sum, t) => sum + parseFloat(t.invested_amount),
      0
    );

    // Sum realized P&L of closed trades
    const { data: closedTrades } = await supabase
      .from('bot_trades')
      .select('realized_pnl')
      .eq('user_id', userId)
      .eq('is_closed', true);

    const totalRealizedPnL = (closedTrades || []).reduce(
      (sum, t) => sum + (t.realized_pnl ? parseFloat(t.realized_pnl) : 0),
      0
    );

    const remainingBudget = parseFloat(config.virtual_budget) + totalRealizedPnL - investedTotal;

    await supabase
      .from('bot_user_configs')
      .update({ remaining_budget: Math.max(0, remainingBudget) })
      .eq('user_id', userId);
  } catch (error) {
    logError('updateRemainingBudget failed', error);
  }
}
