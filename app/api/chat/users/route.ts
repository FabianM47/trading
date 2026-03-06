/**
 * Chat Users API
 *
 * GET /api/chat/users — Alle Chat-User laden (fuer @mention)
 */

import { NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getChatUsers } from '@/lib/chatStore';

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getChatUsers();

    if (result.error) {
      return NextResponse.json({ error: 'User konnten nicht geladen werden' }, { status: 500 });
    }

    return NextResponse.json({ users: result.users });
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
