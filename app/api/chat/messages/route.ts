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

    // Sicherstellen dass der User in chat_users existiert (FK-Constraint)
    if (context.claims.username) {
      await upsertUser(context.claims.sub, context.claims.username as string);
    }

    const result = await sendMessage(context.claims.sub, parsed.data.content);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
