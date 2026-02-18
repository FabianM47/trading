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
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'", // Tailwind benötigt inline styles
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // connect-src: API-Endpunkte für fetch/XHR (inkl. Supabase)
    isDev
      ? "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de https://*.supabase.co ws://localhost:*"
      : "connect-src 'self' https://jmmn7z.logto.app https://finnhub.io https://api.coingecko.com https://wertpapiere.ing.de https://*.supabase.co",
    "frame-ancestors 'none'", // Verhindert Clickjacking
    "base-uri 'self'",
    "form-action 'self'",
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

  // Auth-Check für alle anderen Routen (inkl. Homepage)
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    // Guard: Nicht authentifiziert → Redirect
    if (!context.isAuthenticated) {
      const signInUrl = new URL('/api/logto/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated: Proceed
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  } catch (error) {
    logError('🔒 Middleware Auth Error', error);
    return NextResponse.redirect(new URL('/api/logto/sign-in', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.svg, robots.txt
     */
    '/((?!_next/static|_next/image|favicon\\.svg|robots\\.txt).*)',
  ],
};
