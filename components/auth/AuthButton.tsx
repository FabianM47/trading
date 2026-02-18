/**
 * AuthButton Component
 * 
 * Zeigt Login oder Logout Button basierend auf Auth-Status.
 * 
 * Usage:
 * ```tsx
 * <AuthButton />
 * ```
 */

'use client';

import { useAuth } from './RequireAuth';

export function AuthButton() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Loading State
  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-background-card border border-border rounded-lg font-medium text-text-secondary cursor-not-allowed opacity-50"
      >
        Laden...
      </button>
    );
  }

  // Authenticated: Show Logout
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        {user?.name && (
          <span className="text-sm text-text-secondary hidden sm:inline">
            {user.name}
          </span>
        )}
        {user?.email && !user?.name && (
          <span className="text-sm text-text-secondary hidden sm:inline">
            {user.email}
          </span>
        )}
        <a
          href="/api/logto/sign-out"
          className="px-4 py-2 bg-background-card border border-border rounded-lg font-medium hover:bg-background-elevated transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </a>
      </div>
    );
  }

  // Not Authenticated: Show Login
  return (
    <a
      href="/api/logto/sign-in"
      className="px-6 py-2 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-all flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      <span>Login</span>
    </a>
  );
}

/**
 * Kompakte Version für Mobile
 */
export function AuthButtonCompact() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <a
        href="/api/logto/sign-out"
        className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
        title="Logout"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </a>
    );
  }

  return (
    <a
      href="/api/logto/sign-in"
      className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
      title="Login"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    </a>
  );
}
