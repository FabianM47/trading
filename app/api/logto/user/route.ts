/**
 * User Info API Route
 *
 * GET  /api/logto/user — Gibt User Claims + Username zurück
 * PATCH /api/logto/user — Username setzen/ändern
 */

import LogtoClient from '@logto/next/server-actions';
import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getLogtoUser, updateLogtoUser } from '@/lib/auth/logto-management';
import { USERNAME_REGEX, USERNAME_RULES } from '@/lib/validation';
import { logError } from '@/lib/logger';
import { upsertChatUser } from '@/lib/chat';

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json(
        { isAuthenticated: false, claims: null },
        { status: 401 }
      );
    }

    // Username aus Management API holen (claims enthalten nicht immer username)
    let username: string | null = null;
    try {
      const logtoUser = await getLogtoUser(context.claims.sub);
      username = logtoUser.username;
    } catch (e) {
      // M2M nicht konfiguriert oder Fehler — username bleibt null
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to fetch username from Logto:', e instanceof Error ? e.message : e);
      }
    }

    // Chat-User Verzeichnis aktualisieren (fire-and-forget)
    if (username) {
      upsertChatUser(context.claims.sub, username).catch(() => {});
    }

    return NextResponse.json({
      isAuthenticated: true,
      claims: {
        ...context.claims,
        username,
      },
    });
  } catch (error) {
    logError('User info error', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username ist erforderlich' }, { status: 400 });
    }

    const trimmed = username.trim();

    if (!USERNAME_REGEX.test(trimmed)) {
      return NextResponse.json(
        { error: USERNAME_RULES },
        { status: 400 }
      );
    }

    try {
      const updatedUser = await updateLogtoUser(context.claims.sub, { username: trimmed });

      // Chat-User Verzeichnis aktualisieren
      await upsertChatUser(context.claims.sub, trimmed).catch(() => {});

      return NextResponse.json({
        success: true,
        username: updatedUser.username,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        return NextResponse.json(
          { error: 'Dieser Username ist bereits vergeben' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    logError('Username update error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Username konnte nicht aktualisiert werden',
        // Include error detail (no secrets) to help diagnose
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
