/**
 * Price Alerts API Route
 * 
 * GET /api/alerts - Lädt alle Alerts des Users
 * POST /api/alerts - Erstellt einen neuen Alert
 * PUT /api/alerts - Aktualisiert einen Alert
 * DELETE /api/alerts?id=xxx - Löscht einen Alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const CreateAlertSchema = z.object({
  isin: z.string().min(1).max(30),
  ticker: z.string().optional(),
  name: z.string().min(1).max(100),
  targetPrice: z.number().positive(),
  direction: z.enum(['above', 'below']),
  repeat: z.boolean().optional().default(false),
});

const UpdateAlertSchema = z.object({
  id: z.string().uuid(),
  targetPrice: z.number().positive().optional(),
  direction: z.enum(['above', 'below']).optional(),
  isActive: z.boolean().optional(),
  repeat: z.boolean().optional(),
});

function dbRowToAlert(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    isin: row.isin,
    ticker: row.ticker,
    name: row.name,
    targetPrice: parseFloat(row.target_price),
    direction: row.direction,
    isActive: row.is_active,
    triggeredAt: row.triggered_at,
    lastCheckedPrice: row.last_checked_price ? parseFloat(row.last_checked_price) : null,
    lastCheckedAt: row.last_checked_at,
    repeat: row.repeat,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/alerts
 */
export async function GET() {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      logError('Failed to load alerts', error);
      return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
    }
    
    return NextResponse.json({ alerts: (data || []).map(dbRowToAlert) });
  } catch (error) {
    logError('Alerts GET error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/alerts
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const body = await request.json();
    const parsed = CreateAlertSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid alert data', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const { isin, ticker, name, targetPrice, direction, repeat } = parsed.data;
    
    // Max 20 aktive Alerts pro User
    const { count } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (count && count >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 aktive Alerts erlaubt' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: userId,
        isin,
        ticker: ticker || null,
        name,
        target_price: targetPrice,
        direction,
        repeat,
      })
      .select()
      .single();
    
    if (error) {
      logError('Failed to create alert', error);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
    
    logInfo(`Alert created for ${name} (${isin}) at ${targetPrice} EUR (${direction})`);
    return NextResponse.json({ alert: dbRowToAlert(data) }, { status: 201 });
  } catch (error) {
    logError('Alerts POST error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/alerts
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const body = await request.json();
    const parsed = UpdateAlertSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const { id, ...updates } = parsed.data;
    
    const updateData: any = {};
    if (updates.targetPrice !== undefined) updateData.target_price = updates.targetPrice;
    if (updates.direction !== undefined) updateData.direction = updates.direction;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.repeat !== undefined) updateData.repeat = updates.repeat;
    
    // Wenn der Alert wieder aktiviert wird, triggeredAt zurücksetzen
    if (updates.isActive === true) {
      updateData.triggered_at = null;
    }
    
    const { data, error } = await supabase
      .from('price_alerts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      logError('Failed to update alert', error);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
    
    return NextResponse.json({ alert: dbRowToAlert(data) });
  } catch (error) {
    logError('Alerts PUT error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    
    if (!alertId) {
      return NextResponse.json({ error: 'Missing alert id' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId);
    
    if (error) {
      logError('Failed to delete alert', error);
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Alerts DELETE error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
