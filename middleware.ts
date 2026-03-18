import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { logError } from '@/lib/logger';

/**
 * Next.js Middleware für:
 * 1. Serverseitige Auth-Checks auf ALLEN Routen (außer /api/logto/*, /callback)
 * 2. Content Security Policy (CSP)
 * 
 * Protected Routes: /, /me, /api/* (außer /api/logto/*)
 * Public Routes: /api/logto/*, /callback
 */

/**
 * Generiert Content Security Policy
 * 
 * HINWEIS: Next.js App Router benötigt 'unsafe-inline' für inline scripts.
 * Alternativen (nonce-based CSP) sind in Next.js 14 noch experimentell.
 * 
 * Siehe: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
function generateCSP(isDev: boolean) {
  const csp = [
    "default-src 'self'",
    // Next.js App Router benötigt 'unsafe-inline' für React Hydration
    // In Dev zusätzlich 'unsafe-eval' für Hot Module Replacement
    // TradingView: Erlaube Scripts von s3.tradingview.com
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com"
      : "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
    "style-src 'self' 'unsafe-inline'", // Tailwind benötigt inline styles
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // connect-src: API-Endpunkte für fetch/XHR (inkl. Supabase + TradingView)
    isDev
      ? "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de https://*.supabase.co wss://*.supabase.co https://s3.tradingview.com https://*.tradingview.com https://symbol-search.tradingview.com ws://localhost:*"
      : "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de https://*.supabase.co wss://*.supabase.co https://s3.tradingview.com https://*.tradingview.com https://symbol-search.tradingview.com",
    // frame-src: TradingView Widget lädt iframes
    "frame-src 'self' https://s.tradingview.com https://www.tradingview.com",
    "frame-ancestors 'none'", // Verhindert Clickjacking
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self'", // Service Worker (PWA)
  ];

  if (!isDev) {
    csp.push("upgrade-insecure-requests"); // Force HTTPS in Production
  }

  return csp.join('; ');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';

  // CSP Header
  const cspHeader = generateCSP(isDev);

  // Public Paths: Kein Auth-Check (nur Callback und Logto-Routes)
  const publicPaths = [
    '/callback',
  ];

  if (publicPaths.some(path => pathname === path)) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Alle /api/logto/* Routes sind public (self-managed auth)
  if (pathname.startsWith('/api/logto/')) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Server-to-Server API: Cron Endpoints (Bearer Token Auth, kein Logto)
  if (
    pathname === '/api/alerts/check' ||
    pathname === '/api/news/fetch' ||
    pathname === '/api/news/analyze' ||
    pathname === '/api/macro/fetch' ||
    pathname === '/api/technicals/calculate' ||
    pathname === '/api/predictions/verify'
  ) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Redirect-Loop-Schutz: Prüfe ob bereits zu viele Auth-Redirects stattfanden
  // Mobile-Browser können in Loops geraten wenn Cookies nicht persistiert werden
  const authRedirectCount = parseInt(request.cookies.get('auth_redirect_count')?.value || '0', 10);

  // Auth-Check für alle anderen Routen (inkl. Homepage)
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    // Guard: Nicht authentifiziert → Redirect (mit Loop-Schutz)
    if (!context.isAuthenticated) {
      // Loop-Schutz: Nach 5 Redirects innerhalb kurzer Zeit abbrechen
      if (authRedirectCount >= 5) {
        const errorHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anmeldung fehlgeschlagen</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a0a0a0; margin-bottom: 1.5rem; line-height: 1.5; }
    a { display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 500; }
    a:active { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Anmeldung fehlgeschlagen</h1>
    <p>Die Anmeldung konnte nicht abgeschlossen werden. Moegliche Ursachen: Cookies sind deaktiviert oder der Browser blockiert sie.</p>
    <p>Bitte stelle sicher, dass Cookies aktiviert sind und versuche es erneut.</p>
    <a href="/api/logto/sign-in">Erneut anmelden</a>
  </div>
</body>
</html>`;
        const errorResponse = new NextResponse(errorHtml, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
        // Reset counter
        errorResponse.cookies.set('auth_redirect_count', '0', {
          maxAge: 120,
          httpOnly: true,
          sameSite: 'lax',
          secure: !isDev,
        });
        errorResponse.headers.set('Content-Security-Policy', cspHeader);
        return errorResponse;
      }

      const signInUrl = new URL('/api/logto/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname);
      const redirectResponse = NextResponse.redirect(signInUrl);
      // Redirect-Counter incrementieren (Cookie lebt 2 Minuten)
      redirectResponse.cookies.set('auth_redirect_count', String(authRedirectCount + 1), {
        maxAge: 120,
        httpOnly: true,
        sameSite: 'lax',
        secure: !isDev,
      });
      return redirectResponse;
    }

    // Authenticated: Proceed und Redirect-Counter zuruecksetzen
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    if (authRedirectCount > 0) {
      response.cookies.set('auth_redirect_count', '0', {
        maxAge: 0, // Sofort loeschen
        httpOnly: true,
        sameSite: 'lax',
        secure: !isDev,
      });
    }
    return response;
  } catch (error) {
    logError('🔒 Middleware Auth Error', error);

    // Loop-Schutz auch bei Fehlern: Nach 3 fehlgeschlagenen Auth-Checks
    // eine Fehlerseite zeigen statt weiter zu redirecten
    if (authRedirectCount >= 3) {
      const errorHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentifizierung fehlgeschlagen</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a0a0a0; margin-bottom: 1.5rem; line-height: 1.5; }
    a { display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 500; }
    a:active { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authentifizierung fehlgeschlagen</h1>
    <p>Es gab ein Problem bei der Anmeldung. Bitte versuche es in einem Moment erneut.</p>
    <a href="/api/logto/sign-in">Erneut anmelden</a>
  </div>
</body>
</html>`;
      const errorResponse = new NextResponse(errorHtml, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      errorResponse.cookies.set('auth_redirect_count', '0', {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: !isDev,
      });
      errorResponse.headers.set('Content-Security-Policy', cspHeader);
      return errorResponse;
    }

    const redirectResponse = NextResponse.redirect(new URL('/api/logto/sign-in', request.url));
    redirectResponse.cookies.set('auth_redirect_count', String(authRedirectCount + 1), {
      maxAge: 120,
      httpOnly: true,
      sameSite: 'lax',
      secure: !isDev,
    });
    return redirectResponse;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.* (favicon.svg, favicon.png, favicon-48.png)
     * - robots.txt
     * - sw.js, manifest.json (PWA)
     * - icons/* (PWA icons)
     * - app-icon.png (PWA source icon)
     */
    '/((?!_next/static|_next/image|favicon[^/]*|robots\\.txt|sw\\.js|manifest\\.json|icons/|app-icon\\.png).*)',
  ],
};
