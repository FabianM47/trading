/**
 * User Roles API Route
 *
 * GET /api/auth/roles — Gibt die Rollen des aktuellen Users zurück.
 */

import { NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getUserRoles } from '@/lib/auth/roles';

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await getUserRoles(context.claims.sub);
    const isAdmin = roles.includes('admin');
    const isTrader = roles.includes('trading') || isAdmin;

    return NextResponse.json({ roles, isAdmin, isTrader });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
