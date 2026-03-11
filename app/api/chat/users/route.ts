/**
 * Chat Users API
 *
 * GET /api/chat/users — Alle Chat-User laden (fuer @mention)
 */

import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { getChatUsers } from '@/lib/chatStore';

export async function GET() {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;

    const result = await getChatUsers();

    if (result.error) {
      return NextResponse.json({ error: 'User konnten nicht geladen werden' }, { status: 500 });
    }

    return NextResponse.json({ users: result.users });
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
