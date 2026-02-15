/**
 * Middleware for Protected Routes
 * 
 * IMPORTANT: Uses Node.js runtime (not Edge) for Auth.js compatibility
 * 
 * Strategy:
 * - Root (/) redirects to /dashboard
 * - All routes except /auth/* require authentication
 * - Unauthenticated users are redirected to /auth/signin
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Force Node.js runtime (required for Auth.js)
export const runtime = 'nodejs';

// Public paths that don't require authentication
const publicPaths = [
  '/auth/signin',
  '/auth/error',
  '/auth/verify-request',
  '/api/auth', // Auth.js API routes
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check if path is public (starts with any public path)
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Root path: redirect to dashboard
  if (pathname === '/') {
    // If not authenticated, middleware will catch it and redirect to signin
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow public paths (auth pages and API routes)
  if (isPublicPath) {
    // If user is authenticated and tries to access signin, redirect to dashboard
    if (req.auth && pathname === '/auth/signin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // All other paths require authentication
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

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
