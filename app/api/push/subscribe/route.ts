/**
 * Push Subscription API Route
 * 
 * POST /api/push/subscribe - Speichert eine Web Push Subscription
 * DELETE /api/push/subscribe - Löscht eine Subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
});

/**
 * POST /api/push/subscribe
 * Speichert eine Web Push Subscription für den aktuellen User
 */
export async function POST(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = context.claims.sub;
    const body = await request.json();
    const parsed = SubscribeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid subscription data', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const { endpoint, p256dh, auth, userAgent } = parsed.data;
    
    // Upsert: Falls Endpunkt schon existiert, aktualisieren
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent || null,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );
    
    if (error) {
      logError('Failed to save push subscription', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }
    
    logInfo(`Push subscription saved for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Push subscribe error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Löscht eine Push Subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = context.claims.sub;
    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    
    if (error) {
      logError('Failed to delete push subscription', error);
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Push unsubscribe error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
