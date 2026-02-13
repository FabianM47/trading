/**
 * Client-Side Authentication Hooks
 * 
 * Use these hooks in Client Components
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Get current session in Client Component
 * 
 * Usage:
 * ```tsx
 * 'use client';
 * 
 * export function ProfileButton() {
 *   const { data: session, status } = useAuth();
 *   
 *   if (status === 'loading') return <Spinner />;
 *   if (!session) return <SignInButton />;
 *   
 *   return <div>Hello {session.user.name}</div>;
 * }
 * ```
 */
export function useAuth() {
  return useSession();
}

/**
 * Get current user in Client Component
 * 
 * Usage:
 * ```tsx
 * const { user, isLoading } = useCurrentUser();
 * if (isLoading) return <Spinner />;
 * if (!user) return <SignInButton />;
 * return <div>{user.email}</div>;
 * ```
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

/**
 * Require authentication in Client Component
 * Automatically redirects to signin if not authenticated
 * 
 * Usage:
 * ```tsx
 * export function ProtectedPage() {
 *   const { user, isLoading } = useRequireAuth();
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   // user is guaranteed to be defined here (or user will be redirected)
 *   return <div>Hello {user.name}</div>;
 * }
 * ```
 */
export function useRequireAuth(redirectTo = '/auth/signin') {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      const url = new URL(redirectTo, window.location.origin);
      url.searchParams.set('callbackUrl', window.location.pathname);
      router.push(url.toString());
    }
  }, [session, status, router, redirectTo]);

  return {
    user: session?.user ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

/**
 * Check if user is authenticated
 * 
 * Usage:
 * ```tsx
 * const isAuthenticated = useIsAuth();
 * if (!isAuthenticated) return <SignInPrompt />;
 * ```
 */
export function useIsAuth(): boolean {
  const { status } = useSession();
  return status === 'authenticated';
}
