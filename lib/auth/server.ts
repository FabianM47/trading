/**
 * Server-Side Authentication Helpers
 * 
 * Use these functions in:
 * - Server Components
 * - Server Actions
 * - API Routes
 * 
 * Auth bypass for development:
 * Set DISABLE_AUTH=true in .env.local to bypass authentication
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cache } from 'react';

// Feature flag to disable auth (for development only)
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

// Mock user for development when auth is disabled
const MOCK_USER = {
  id: 'dev-user-id',
  email: 'dev@example.com',
  name: 'Development User',
  image: null,
  emailVerified: null,
} as const;

/**
 * Get current session (cached per request)
 * Returns null if not authenticated
 * 
 * Usage in Server Component:
 * ```tsx
 * const session = await getSession();
 * if (!session) redirect('/auth/signin');
 * ```
 */
export const getSession = cache(async () => {
  if (DISABLE_AUTH) {
    return { user: MOCK_USER, expires: new Date(Date.now() + 86400000).toISOString() };
  }
  return await auth();
});

/**
 * Get current user (cached per request)
 * Returns null if not authenticated
 * 
 * Usage in Server Component:
 * ```tsx
 * const user = await getCurrentUser();
 * if (!user) redirect('/auth/signin');
 * console.log(user.email, user.id);
 * ```
 */
export const getCurrentUser = cache(async () => {
  if (DISABLE_AUTH) {
    return MOCK_USER;
  }
  const session = await getSession();
  return session?.user ?? null;
});

/**
 * Require authentication - throws if not authenticated
 * Automatically redirects to signin page
 * 
 * Usage in Server Component:
 * ```tsx
 * const user = await requireAuth();
 * // user is guaranteed to be defined here
 * ```
 */
export async function requireAuth() {
  if (DISABLE_AUTH) {
    return MOCK_USER;
  }

  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return session.user;
}

/**
 * Require authentication with custom redirect
 * 
 * Usage in Server Action:
 * ```tsx
 * const user = await requireAuth('/auth/signin?error=unauthorized');
 * ```
 */
export async function requireAuthWithRedirect(redirectTo: string) {
  if (DISABLE_AUTH) {
    return MOCK_USER;
  }

  const session = await getSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  return session.user;
}

/**
 * Check if user is authenticated (boolean)
 * 
 * Usage in Server Component:
 * ```tsx
 * const isAuthenticated = await isAuth();
 * if (isAuthenticated) { ... }
 * ```
 */
export async function isAuth(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Get user ID (shorthand)
 * Returns null if not authenticated
 * 
 * Usage in Server Component:
 * ```tsx
 * const userId = await getUserId();
 * if (!userId) return null;
 * const portfolios = await getPortfoliosByUserId(userId);
 * ```
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Require user ID - throws if not authenticated
 * 
 * Usage in Server Action:
 * ```tsx
 * const userId = await requireUserId();
 * // userId is guaranteed to be a string here
 * await createPortfolio({ userId, ...data });
 * ```
 */
export async function requireUserId(): Promise<string> {
  const user = await requireAuth();
  return user.id!;
}
