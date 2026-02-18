/**
 * Logto Sign-In Route
 * 
 * Initiiert den OIDC Login Flow.
 * GET /api/logto/sign-in?returnTo=/me (optional)
 * 
 * WICHTIG: Prüft zuerst, ob bereits eine aktive Session existiert.
 * → Bereits angemeldet: Redirect zu returnTo oder /me
 * → Nicht angemeldet: Startet OIDC Auth Flow
 */

import { logtoConfig } from '@/lib/auth/logto-config';
import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate Limit: 10 Requests/Minute pro IP
  const clientId = getClientIdentifier(request);
  const { allowed } = checkRateLimit(clientId, { interval: 60000, maxRequests: 10 });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const client = new LogtoClient(logtoConfig);
  
  // ✅ CHECK: Gibt es bereits eine aktive Session?
  try {
    const context = await client.getLogtoContext();
    
    if (context.isAuthenticated) {
      // User ist bereits angemeldet → Redirect zur gewünschten Seite
      const returnTo = request.nextUrl.searchParams.get('returnTo') || '/me';
      
      // Security: Validiere returnTo (nur relative Pfade)
      const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') 
        ? returnTo 
        : '/me';
      
      console.log('✅ Session bereits aktiv, redirect zu:', safeReturnTo);
      return NextResponse.redirect(new URL(safeReturnTo, request.url));
    }
  } catch (error) {
    // Kein Problem, wenn getLogtoContext() fehlschlägt → dann einfach neu anmelden
    console.log('ℹ️ Keine aktive Session gefunden, starte Login Flow');
  }
  
  // Keine aktive Session → Starte OIDC Login Flow
  const { url } = await client.handleSignIn(request.nextUrl.origin + '/callback');
  
  return NextResponse.redirect(url);
}
