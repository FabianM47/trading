import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { logError } from '@/lib/logger';

/**
 * Next.js Middleware für serverseitige Auth-Checks
 * 
 * Protected Routes: /me, /api/quotes (außer /api/logto/*)
 * Public Routes: /, /api/logto/*, /callback
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public Paths: Kein Auth-Check
  // Alle Logto Auth-Routes sind public (sie managen selbst Auth-Status)
  const publicPaths = [
    '/',
    '/callback',
  ];

  if (publicPaths.some(path => pathname === path)) {
    return NextResponse.next();
  }

  // Alle /api/logto/* Routes sind public (self-managed auth)
  if (pathname.startsWith('/api/logto/')) {
    return NextResponse.next();
  }

  // Auth-Check für geschützte Routen
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    // Guard: Nicht authentifiziert → Redirect
    if (!context.isAuthenticated) {
      const signInUrl = new URL('/api/logto/sign-in', request.url);
      // Optional: returnTo für Post-Login Redirect
      signInUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated: Proceed
    return NextResponse.next();
  } catch (error) {
    logError('🔒 Middleware Auth Error', error);
    
    // Bei Auth-Fehler: Safe-Fail zu Login
    return NextResponse.redirect(new URL('/api/logto/sign-in', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
