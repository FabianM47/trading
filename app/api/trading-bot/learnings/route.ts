/**
 * Trading Bot Learnings API
 *
 * GET    /api/trading-bot/learnings - Laedt Learnings (optional: ?isin=...)
 * POST   /api/trading-bot/learnings - Erstellt ein Learning
 * PUT    /api/trading-bot/learnings - Aktualisiert ein Learning
 * DELETE /api/trading-bot/learnings?id=... - Loescht ein Learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToLearning, learningToDbRow } from '@/lib/trading-bot/mappers';

const CreateLearningSchema = z.object({
  botTradeId: z.string().uuid(),
  isin: z.string().min(1).max(30),
  ticker: z.string().max(30).optional(),
  outcome: z.enum(['win', 'loss', 'breakeven']),
  pnlAmount: z.number().optional(),
  pnlPercent: z.number().optional(),
  holdingDays: z.number().int().min(0).optional(),
  marketConditions: z.string().max(2000).optional(),
  whatWorked: z.string().max(2000).optional(),
  whatFailed: z.string().max(2000).optional(),
  lessonSummary: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  strategyId: z.string().uuid().optional(),
  strategyName: z.string().max(200).optional(),
});

const UpdateLearningSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(['win', 'loss', 'breakeven']).optional(),
  marketConditions: z.string().max(2000).optional(),
  whatWorked: z.string().max(2000).optional(),
  whatFailed: z.string().max(2000).optional(),
  lessonSummary: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin');

  try {
    let query = supabase
      .from('bot_trade_learnings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (isin) {
      query = query.eq('isin', isin);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ learnings: (data || []).map(dbRowToLearning) });
  } catch (error) {
    logError('GET /api/trading-bot/learnings failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Learnings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = CreateLearningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const dbRow = learningToDbRow({ ...parsed.data, userId });

    const { data, error } = await supabase
      .from('bot_trade_learnings')
      .insert(dbRow)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ learning: dbRowToLearning(data) }, { status: 201 });
  } catch (error) {
    logError('POST /api/trading-bot/learnings failed', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Learnings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateLearningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;
    const dbRow = learningToDbRow(updates);

    const { data, error } = await supabase
      .from('bot_trade_learnings')
      .update(dbRow)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ learning: dbRowToLearning(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/learnings failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Learnings' }, { status: 500 });
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
      .from('bot_trade_learnings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE /api/trading-bot/learnings failed', error);
    return NextResponse.json({ error: 'Fehler beim Loeschen des Learnings' }, { status: 500 });
  }
}
