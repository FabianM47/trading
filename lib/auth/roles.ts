/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * Holt User-Rollen von Logto Management API mit LRU-Cache.
 * Admin-Rolle impliziert Trading-Rolle.
 */

import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getManagementToken, LOGTO_ENDPOINT } from '@/lib/auth/logto-management';
import { logError, logInfo } from '@/lib/logger';

// ==========================================
// Cache
// ==========================================

const roleCache = new LRUCache<string, string[]>({
  max: 200,
  ttl: 5 * 60 * 1000, // 5 Minuten
});

// ==========================================
// Core Functions
// ==========================================

/**
 * Holt die Rollen eines Users aus Logto (mit Cache).
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const cached = roleCache.get(userId);
  if (cached) return cached;

  if (!LOGTO_ENDPOINT) {
    logError('LOGTO_ENDPOINT not configured', new Error('Missing env'));
    return [];
  }

  try {
    const token = await getManagementToken();
    const response = await fetch(
      `${LOGTO_ENDPOINT}/api/users/${encodeURIComponent(userId)}/roles`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logError(`Failed to fetch roles for ${userId}`, { status: response.status, error: errorText });
      return [];
    }

    const roles: Array<{ id: string; name: string; description: string }> = await response.json();
    const roleNames = roles.map((r) => r.name);

    roleCache.set(userId, roleNames);
    logInfo(`Roles for ${userId}: [${roleNames.join(', ')}]`);
    return roleNames;
  } catch (error) {
    logError('getUserRoles failed', error);
    return [];
  }
}

/**
 * Prueft ob ein User eine bestimmte Rolle hat.
 * Admin impliziert Trading.
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  if (roles.includes(role)) return true;
  // Admin impliziert Trading
  if (role === 'trading' && roles.includes('admin')) return true;
  return false;
}

/**
 * Debug-Version von getUserRoles — gibt zusaetzliche Infos zurueck.
 * TEMPORAER: Nach Debugging wieder entfernen!
 */
export async function getUserRolesDebug(userId: string): Promise<{ roles: string[]; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};

  if (!LOGTO_ENDPOINT) {
    return { roles: [], debug: { error: 'LOGTO_ENDPOINT not configured' } };
  }
  debug.endpoint = LOGTO_ENDPOINT;

  try {
    const token = await getManagementToken();
    debug.tokenOk = true;
    debug.tokenPreview = token.substring(0, 10) + '...';

    const url = `${LOGTO_ENDPOINT}/api/users/${encodeURIComponent(userId)}/roles`;
    debug.url = url;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    debug.status = response.status;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      debug.errorBody = errorText;
      return { roles: [], debug };
    }

    const data = await response.json();
    debug.rawResponse = data;
    const roleNames = Array.isArray(data) ? data.map((r: { name: string }) => r.name) : [];

    roleCache.set(userId, roleNames);
    return { roles: roleNames, debug };
  } catch (error) {
    debug.exception = String(error);
    return { roles: [], debug };
  }
}

/**
 * Cache fuer einen User invalidieren (z.B. nach Rollenaenderung).
 */
export function invalidateRoleCache(userId: string): void {
  roleCache.delete(userId);
}

// ==========================================
// API Route Helper
// ==========================================

/**
 * Kombinierter Auth + Rollen-Check fuer API Routes.
 * Ersetzt die 4-Zeilen Auth-Boilerplate in jeder Route.
 *
 * @returns { userId } bei Erfolg, NextResponse bei Fehler (401/403)
 */
export async function requireApiRole(
  requiredRole: string
): Promise<{ userId: string } | NextResponse> {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;
    const userHasRole = await hasRole(userId, requiredRole);

    if (!userHasRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { userId };
  } catch (error) {
    logError('requireApiRole failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
