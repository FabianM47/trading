/**
 * Sankey API Route
 *
 * Speichert und lädt Sankey-Konfigurationen benutzerspezifisch in Supabase.
 *
 * GET  /api/sankey - Lädt die Sankey-Config des Users
 * PUT  /api/sankey - Speichert / aktualisiert die Sankey-Config
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

// Max. erlaubte Größe der Sankey-Config (100 KB)
const MAX_CONFIG_SIZE = 100_000;

// Validation Schema für Sankey-Einträge
const SankeyItemSchema = z.object({
  label: z.string().min(1).max(100),
  amount: z.number().min(0),
}).passthrough(); // Erlaube zusätzliche Felder für Zukunftskompatibilität

const SankeyConfigSchema = z.object({
  incomes: z.array(SankeyItemSchema).max(50),
  expenses: z.array(SankeyItemSchema).max(100),
  savings: z.array(SankeyItemSchema).max(50).optional().default([]),
}).passthrough();

// ── GET ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;

    const { data, error } = await supabase
      .from('sankey_configs')
      .select('config')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      logError('Sankey GET error', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ config: data.config });
  } catch (error) {
    logError('Sankey GET unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;
    const body = await request.json();

    // Size-Limit: Verhindere DoS durch riesige Payloads
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > MAX_CONFIG_SIZE) {
      return NextResponse.json(
        { error: `Config zu groß (max. ${MAX_CONFIG_SIZE / 1000} KB)` },
        { status: 413 }
      );
    }

    // Schema-Validierung
    const parsed = SankeyConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid config', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const config = parsed.data;

    // Upsert: Insert or Update
    const { error } = await supabase
      .from('sankey_configs')
      .upsert(
        {
          user_id: userId,
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logError('Sankey PUT error', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    logInfo(`Sankey config saved for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Sankey PUT unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
