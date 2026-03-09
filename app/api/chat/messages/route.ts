/**
 * Global Chat Messages API
 *
 * GET  /api/chat/messages?before=timestamp&limit=50 — Nachrichten laden
 * POST /api/chat/messages — Nachricht senden
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getMessages, sendMessage, upsertUser } from '@/lib/chatStore';
import { getLogtoUser } from '@/lib/auth/logto-management';
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

    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten' }, { status: 400 });
    }

    // Erst User in chat_users sicherstellen, dann Nachricht senden
    try {
      const logtoUser = await getLogtoUser(context.claims.sub);
      if (logtoUser.username) {
        await upsertUser(context.claims.sub, logtoUser.username);
      } else {
        console.error('[Chat POST] Logto User hat keinen Username:', context.claims.sub);
        return NextResponse.json({ error: 'Kein Username gesetzt' }, { status: 400 });
      }
    } catch (upsertErr) {
      console.error('[Chat POST] User-Setup fehlgeschlagen:', upsertErr);
      return NextResponse.json({ error: 'User-Setup fehlgeschlagen' }, { status: 500 });
    }

    const result = await sendMessage(context.claims.sub, parsed.data.content);

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
