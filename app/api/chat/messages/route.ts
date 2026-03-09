/**
 * Global Chat Messages API
 *
 * GET  /api/chat/messages?before=timestamp&limit=50 — Nachrichten laden
 * POST /api/chat/messages — Nachricht senden
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getMessages, sendMessage, getUsernameByUserId } from '@/lib/chatStore';
import { checkRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const before = request.nextUrl.searchParams.get('before') || undefined;
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50') || 50, 100);

    const result = await getMessages(limit, before);

    if (result.error) {
      return NextResponse.json({ error: 'Nachrichten konnten nicht geladen werden' }, { status: 500 });
    }

    return NextResponse.json({ messages: result.messages });
  } catch (error) {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting: max 5 Nachrichten pro 10 Sekunden pro User
    const rateCheck = checkRateLimit(`chat:${context.claims.sub}`, { interval: 10_000, maxRequests: 5 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Zu viele Nachrichten. Bitte warte einen Moment.' }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungueltige JSON-Daten' }, { status: 400 });
    }

    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten' }, { status: 400 });
    }

    // Username aus chat_users lesen (wurde beim Auth-Flow/Username-Setup angelegt)
    const senderUsername = await getUsernameByUserId(context.claims.sub);
    if (!senderUsername) {
      return NextResponse.json({ error: 'Kein Username gesetzt' }, { status: 400 });
    }

    const result = await sendMessage(context.claims.sub, parsed.data.content, senderUsername);

    if (result.error) {
      return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden' }, { status: 500 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('[Chat POST] Unerwarteter Fehler:', error);
    const details = process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: 'Serverfehler', ...(details && { details }) }, { status: 500 });
  }
}
