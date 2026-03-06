/**
 * Logto Management API Client
 *
 * Server-seitiger Helper für Logto Management API.
 * Nutzt M2M (Machine-to-Machine) Credentials für API-Zugriff.
 *
 * Voraussetzung: M2M App in Logto Console erstellen und Credentials in ENV setzen.
 */

import { logError } from '@/lib/logger';

const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT?.replace(/\/+$/, '');
const M2M_APP_ID = process.env.LOGTO_M2M_APP_ID;
const M2M_APP_SECRET = process.env.LOGTO_M2M_APP_SECRET;

// Token Cache (with dedup for concurrent requests)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenPromise: Promise<string> | null = null;

interface LogtoUserProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  primaryEmail: string | null;
}

/**
 * M2M Access Token für Management API holen (mit Cache + Dedup)
 */
async function getManagementToken(): Promise<string> {
  if (!LOGTO_ENDPOINT) {
    throw new Error('LOGTO_ENDPOINT muss gesetzt sein');
  }
  if (!M2M_APP_ID || !M2M_APP_SECRET) {
    throw new Error('LOGTO_M2M_APP_ID und LOGTO_M2M_APP_SECRET muessen gesetzt sein');
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  // Deduplicate concurrent token requests
  if (!tokenPromise) {
    tokenPromise = fetchManagementToken().finally(() => { tokenPromise = null; });
  }
  return tokenPromise;
}

async function fetchManagementToken(): Promise<string> {
  const response = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${M2M_APP_ID}:${M2M_APP_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      resource: `${LOGTO_ENDPOINT}/api`,
      scope: 'all',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`M2M Token Fehler (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  return cachedToken!;
}

/**
 * User-Profil aus Logto lesen
 */
export async function getLogtoUser(userId: string): Promise<LogtoUserProfile> {
  const token = await getManagementToken();

  const response = await fetch(`${LOGTO_ENDPOINT}/api/users/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    logError('Logto getUser failed', { status: response.status, error: errorText });
    throw new Error(`Logto User abrufen fehlgeschlagen (${response.status})`);
  }

  return response.json();
}

/**
 * User-Profil in Logto aktualisieren
 */
export async function updateLogtoUser(
  userId: string,
  data: { username?: string; name?: string }
): Promise<LogtoUserProfile> {
  const token = await getManagementToken();

  const response = await fetch(`${LOGTO_ENDPOINT}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');

    // Check for specific Logto error codes
    if (response.status === 422) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code === 'user.username_already_in_use') {
          throw new Error('USERNAME_TAKEN');
        }
      } catch (e) {
        if (e instanceof Error && e.message === 'USERNAME_TAKEN') throw e;
      }
    }

    logError('Logto updateUser failed', { status: response.status, error: errorText });
    throw new Error(`Logto User aktualisieren fehlgeschlagen (${response.status})`);
  }

  return response.json();
}
