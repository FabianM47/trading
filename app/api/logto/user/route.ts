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
    const message = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? `Username-Fehler: ${error.message}`
      : 'Username konnte nicht aktualisiert werden';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
