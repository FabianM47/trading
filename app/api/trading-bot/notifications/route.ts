/**
 * Trading Bot Notifications API
 *
 * GET /api/trading-bot/notifications - Laedt Notification-Config
 * PUT /api/trading-bot/notifications - Aktualisiert Notification-Config (upsert)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { dbRowToNotificationConfig, notificationConfigToDbRow } from '@/lib/trading-bot/mappers';

const UpdateNotificationSchema = z.object({
  notifyOnSignal: z.boolean().optional(),
  notifyOnTradeOpen: z.boolean().optional(),
  notifyOnTradeClose: z.boolean().optional(),
  notifyOnStopLoss: z.boolean().optional(),
  notifyViaPush: z.boolean().optional(),
  notifyViaChat: z.boolean().optional(),
});

export async function GET() {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabase
      .from('bot_notifications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ notifications: null });
    }
    if (error) throw error;

    return NextResponse.json({ notifications: dbRowToNotificationConfig(data) });
  } catch (error) {
    logError('GET /api/trading-bot/notifications failed', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benachrichtigungen' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireApiRole('admin');
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await request.json();
    const parsed = UpdateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
    }

    const dbRow = notificationConfigToDbRow({ ...parsed.data, userId });

    const { data, error } = await supabase
      .from('bot_notifications')
      .upsert(dbRow, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notifications: dbRowToNotificationConfig(data) });
  } catch (error) {
    logError('PUT /api/trading-bot/notifications failed', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Benachrichtigungen' }, { status: 500 });
  }
}
