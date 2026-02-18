/**
 * Logto Callback Route
 * 
 * Behandelt den OIDC Callback nach erfolgreicher Authentifizierung.
 * GET /callback?code=...&state=...
 * 
 * WICHTIG: Diese Route MUSS öffentlich zugänglich sein (kein Auth Guard).
 * 
 * Diese Route ist bei /callback statt /api/logto/callback, weil das Logto SDK
 * standardmäßig ${baseUrl}/callback als Redirect URI verwendet.
 */

import LogtoClient from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';
import { logError } from '@/lib/logger';

/**
 * Validiert, ob ein Redirect-Pfad sicher ist (nur relative Pfade, keine Protocol-Relative URLs)
 */
function isSafeRedirectPath(path: string | null): boolean {
  if (!path) return false;
  
  // Guard: Muss mit / starten, aber NICHT mit //
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  
  // Guard: Keine absolute URLs (http://, https://, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false;
  }
  
  // Allowlist bekannter Routen (optional, aber empfohlen)
  const allowedPaths = ['/me', '/'];
  return allowedPaths.some(allowed => path === allowed || path.startsWith(allowed + '/'));
}

export async function GET(request: NextRequest) {
  const client = new LogtoClient(logtoConfig);
  
  try {
    // handleSignInCallback verarbeitet code+state und speichert Session in Cookies
    await client.handleSignInCallback(request.url);
  } catch (error) {
    // Log Error (safe, filtert PII/Tokens)
    logError('❌ Callback Error', error);
    // Bei Fehler zum Login zurück
    redirect('/api/logto/sign-in');
  }
  
  // Post-Login Redirect mit Allowlist
  const { searchParams } = request.nextUrl;
  const returnTo = searchParams.get('returnTo');
  
  const safeRedirect = isSafeRedirectPath(returnTo) ? returnTo! : '/';
  
  redirect(safeRedirect);
}
