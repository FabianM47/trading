/**
 * Admin Users API
 *
 * GET /api/admin/users — Alle Benutzer mit Rollen und Trade-Statistiken
 * Nur für Admins zugänglich.
 */

import { NextResponse } from 'next/server';
import { requireApiRole, getUserRoles } from '@/lib/auth/roles';
import { getManagementToken, LOGTO_ENDPOINT } from '@/lib/auth/logto-management';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

interface LogtoUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  primaryEmail: string | null;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface AdminUserInfo {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
  roles: string[];
  lastSignInAt: string | null;
  createdAt: string;
  openTrades: number;
  closedTrades: number;
  totalInvested: number;
  totalRealizedPnL: number;
}

export async function GET() {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;

    // 1. Alle User aus Logto holen
    const token = await getManagementToken();
    if (!LOGTO_ENDPOINT) {
      return NextResponse.json({ error: 'Logto not configured' }, { status: 500 });
    }

    const usersResponse = await fetch(
      `${LOGTO_ENDPOINT}/api/users?page=1&page_size=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!usersResponse.ok) {
      logError('Failed to fetch users from Logto', { status: usersResponse.status });
      return NextResponse.json({ error: 'Benutzer konnten nicht geladen werden' }, { status: 500 });
    }

    const logtoUsers: LogtoUser[] = await usersResponse.json();

    // 2. Trade-Statistiken aus Supabase holen (alle User auf einmal)
    const { data: allTrades, error: tradesError } = await supabase
      .from('trades')
      .select('user_id, is_closed, invested_eur, realized_pnl');

    if (tradesError) {
      logError('Failed to fetch trades for admin', tradesError);
    }

    // Trade-Stats pro User aggregieren
    const tradeStats = new Map<string, { open: number; closed: number; invested: number; realizedPnL: number }>();
    if (allTrades) {
      for (const trade of allTrades) {
        const stats = tradeStats.get(trade.user_id) || { open: 0, closed: 0, invested: 0, realizedPnL: 0 };
        if (trade.is_closed) {
          stats.closed++;
          stats.realizedPnL += trade.realized_pnl || 0;
        } else {
          stats.open++;
          stats.invested += trade.invested_eur || 0;
        }
        tradeStats.set(trade.user_id, stats);
      }
    }

    // 3. Rollen für jeden User holen
    const users: AdminUserInfo[] = await Promise.all(
      logtoUsers.map(async (user) => {
        const roles = await getUserRoles(user.id);
        const stats = tradeStats.get(user.id) || { open: 0, closed: 0, invested: 0, realizedPnL: 0 };

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.primaryEmail,
          avatar: user.avatar,
          roles,
          lastSignInAt: user.lastSignInAt,
          createdAt: user.createdAt,
          openTrades: stats.open,
          closedTrades: stats.closed,
          totalInvested: Math.round(stats.invested * 100) / 100,
          totalRealizedPnL: Math.round(stats.realizedPnL * 100) / 100,
        };
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    logError('Admin users API error', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
