/**
 * Trading Bot Watchlist API
 *
 * GET    /api/trading-bot/watchlist - Laedt die Watchlist des Users
 * POST   /api/trading-bot/watchlist - Fuegt eine Aktie hinzu
 * PUT    /api/trading-bot/watchlist - Aktualisiert einen Eintrag
 * DELETE /api/trading-bot/watchlist?id=... - Entfernt einen Eintrag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToWatchlistItem, watchlistItemToDbRow } from '@/lib/trading-bot/mappers';

const AddWatchlistSchema = z.object({
  isin: z.string().min(1).max(30),
  ticker: z.string().max(30).optional(),
  name: z.string().min(1).max(200),
  currency: z.enum(['EUR', 'USD']).optional().default('EUR'),
  notes: z.string().max(500).optional(),
});

const UpdateWatchlistSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabase
      .from('bot_watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ watchlist: (data || []).map(dbRowToWatchlistItem) });
  } catch (error) {
    logError('GET /api/trading-bot/watchlist failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Watchlist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = AddWatchlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const dbRow = watchlistItemToDbRow({ ...parsed.data, userId });

    const { data, error } = await supabase
      .from('bot_watchlist')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Diese Aktie ist bereits in der Watchlist' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ item: dbRowToWatchlistItem(data) }, { status: 201 });
  } catch (error) {
    logError('POST /api/trading-bot/watchlist failed', error);
    return NextResponse.json({ error: 'Fehler beim Hinzufuegen zur Watchlist' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateWatchlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;
    const dbRow = watchlistItemToDbRow(updates);

    const { data, error } = await supabase
      .from('bot_watchlist')
      .update(dbRow)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: dbRowToWatchlistItem(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/watchlist failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
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
      .from('bot_watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE /api/trading-bot/watchlist failed', error);
    return NextResponse.json({ error: 'Fehler beim Entfernen aus der Watchlist' }, { status: 500 });
  }
}
