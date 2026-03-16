/**
 * Trading Bot Strategies API
 *
 * GET    /api/trading-bot/strategies - Laedt alle Strategien des Users
 * POST   /api/trading-bot/strategies - Erstellt eine neue Strategie
 * PUT    /api/trading-bot/strategies - Aktualisiert eine Strategie
 * DELETE /api/trading-bot/strategies?id=... - Loescht eine Strategie
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToStrategy, strategyToDbRow } from '@/lib/trading-bot/mappers';

const CreateStrategySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  markdownContent: z.string().min(1).max(50000),
  isActive: z.boolean().optional(),
});

const UpdateStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  markdownContent: z.string().min(1).max(50000).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabase
      .from('bot_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ strategies: (data || []).map(dbRowToStrategy) });
  } catch (error) {
    logError('GET /api/trading-bot/strategies failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Strategien' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = CreateStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    // If this strategy should be active, deactivate all others first
    if (parsed.data.isActive) {
      await supabase
        .from('bot_strategies')
        .update({ is_active: false })
        .eq('user_id', userId);
    }

    const dbRow = strategyToDbRow({ ...parsed.data, userId });

    const { data, error } = await supabase
      .from('bot_strategies')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Eine Strategie mit diesem Slug existiert bereits' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ strategy: dbRowToStrategy(data) }, { status: 201 });
  } catch (error) {
    logError('POST /api/trading-bot/strategies failed', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Strategie' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    // If activating this strategy, deactivate all others first
    if (updates.isActive) {
      await supabase
        .from('bot_strategies')
        .update({ is_active: false })
        .eq('user_id', userId);
    }

    const dbRow = strategyToDbRow(updates);

    const { data, error } = await supabase
      .from('bot_strategies')
      .update(dbRow)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ strategy: dbRowToStrategy(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/strategies failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Strategie' }, { status: 500 });
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
      .from('bot_strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE /api/trading-bot/strategies failed', error);
    return NextResponse.json({ error: 'Fehler beim Loeschen der Strategie' }, { status: 500 });
  }
}
