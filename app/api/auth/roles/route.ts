/**
 * User Roles API Route
 *
 * GET /api/auth/roles — Gibt die Rollen des aktuellen Users zurueck.
 */

import { NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getUserRolesDebug } from '@/lib/auth/roles';

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;
    const { roles, debug } = await getUserRolesDebug(userId);
    const isAdmin = roles.includes('admin');
    const isTrader = roles.includes('trading') || isAdmin;

    return NextResponse.json({ roles, isAdmin, isTrader, debug: { userId, ...debug } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}
