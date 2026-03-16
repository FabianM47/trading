/**
 * Trading Bot Config API
 *
 * GET  /api/trading-bot/config - Laedt die Bot-Config des eingeloggten Users
 * POST /api/trading-bot/config - Erstellt initiale Config mit Defaults
 * PUT  /api/trading-bot/config - Aktualisiert die Config
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToConfig, configToDbRow } from '@/lib/trading-bot/mappers';

const UpdateConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  virtualBudget: z.number().positive().optional(),
  remainingBudget: z.number().min(0).optional(),
  includeInPortfolio: z.boolean().optional(),
  activeStrategyId: z.string().uuid().optional(),
  maxPositions: z.number().int().min(1).max(50).optional(),
  maxPositionSizePct: z.number().min(1).max(100).optional(),
});

export async function GET() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabase
      .from('bot_user_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No config yet - return null
      return NextResponse.json({ config: null });
    }
    if (error) throw error;

    return NextResponse.json({ config: dbRowToConfig(data) });
  } catch (error) {
    logError('GET /api/trading-bot/config failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Bot-Config' }, { status: 500 });
  }
}

export async function POST() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabase
      .from('bot_user_configs')
      .upsert(
        { user_id: userId },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: dbRowToConfig(data) }, { status: 201 });
  } catch (error) {
    logError('POST /api/trading-bot/config failed', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Bot-Config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const dbRow = configToDbRow(parsed.data);

    const { data, error } = await supabase
      .from('bot_user_configs')
      .update(dbRow)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: dbRowToConfig(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/config failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Bot-Config' }, { status: 500 });
  }
}
