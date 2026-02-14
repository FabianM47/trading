/**
 * Middleware for Protected Routes
 * 
 * IMPORTANT: Uses Node.js runtime (not Edge) because Auth.js with Nodemailer
 * requires Node.js modules like 'stream', 'crypto', etc.
 * 
 * Protects all /app/* routes (except public paths)
 * Redirects unauthenticated users to /auth/signin
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Force Node.js runtime (required for Nodemailer)
export const runtime = 'nodejs';

// Public paths that don't require authentication
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-request',
  '/api/auth',
];

// Paths that require authentication
const protectedPaths = [
  '/app',
  '/dashboard',
  '/trades',
  '/groups',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Check if path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check if path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // If path is protected and user is not authenticated, redirect to signin
  if (isProtectedPath && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and tries to access signin page, redirect to app
  if (req.auth && pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/app', req.url));
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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
