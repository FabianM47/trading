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
  // Rate Limit: 30 Requests/Minute pro IP
  // Erhöht von 10 auf 30, da Mobile-Nutzer oft IPs via Carrier-NAT teilen
  // und der OIDC-Flow selbst mehrere Redirects erzeugt
  const clientId = getClientIdentifier(request);
  const { allowed } = checkRateLimit(clientId, { interval: 60000, maxRequests: 30 });

  if (!allowed) {
    // HTML-Antwort statt JSON, damit Mobile-Browser eine nutzbare Seite zeigen
    const retryHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zu viele Anfragen</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a0a0a0; margin-bottom: 1.5rem; }
    a { display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 500; }
    a:active { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Zu viele Anfragen</h1>
    <p>Bitte warte einen Moment und versuche es dann erneut.</p>
    <a href="/api/logto/sign-in">Erneut versuchen</a>
  </div>
</body>
</html>`;
    return new NextResponse(retryHtml, {
      status: 429,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '60',
      },
    });
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
