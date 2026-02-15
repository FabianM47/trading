/**
 * Middleware for Protected Routes
 * 
 * DEACTIVATED: Authentication is currently disabled for testing
 * 
 * Original Strategy (when enabled):
 * - Root (/) redirects to /dashboard
 * - All routes except /auth/* require authentication
 * - Unauthenticated users are redirected to /auth/signin
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root path: redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow all other requests (authentication disabled)
  return NextResponse.next();
}

// Matcher configuration - specify which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
