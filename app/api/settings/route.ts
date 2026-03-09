/**
 * User Settings API
 *
 * GET  /api/settings — Einstellungen laden (erstellt Default-Eintrag falls nötig)
 * PATCH /api/settings — Einzelne Einstellungen aktualisieren
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { supabase } from '@/lib/supabase';

export interface UserSettings {
  tradeNotifications: boolean;
}

const DEFAULTS: UserSettings = {
  tradeNotifications: true,
};

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;

    const { data, error } = await supabase
      .from('user_settings')
      .select('trade_notifications')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Kein Eintrag → Default-Werte zurückgeben (Eintrag wird beim ersten PATCH erstellt)
      return NextResponse.json({ settings: DEFAULTS });
    }

    return NextResponse.json({
      settings: {
        tradeNotifications: data.trade_notifications ?? DEFAULTS.tradeNotifications,
      } satisfies UserSettings,
    });
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;
    const body = await request.json();

    // Nur erlaubte Felder übernehmen
    const updates: Record<string, unknown> = {};
    if (typeof body.tradeNotifications === 'boolean') {
      updates.trade_notifications = body.tradeNotifications;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Einstellungen' }, { status: 400 });
    }

    // Upsert: Erstellt Eintrag falls noch keiner existiert
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, ...updates },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[Settings] Update error:', error);
      return NextResponse.json({ error: 'Einstellungen konnten nicht gespeichert werden' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
