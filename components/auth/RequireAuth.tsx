/**
 * RequireAuth Component
 *
 * Guard Component fuer geschuetzte Routen.
 * Nutzt den zentralen useUser()-Hook (SWR-cached).
 * Kein blockierender Auth-Spinner - Middleware hat bereits geprueft.
 *
 * Usage:
 * ```tsx
 * <RequireAuth>
 *   <ProtectedContent />
 * </RequireAuth>
 * ```
 */

'use client';

import { useUser } from '@/hooks/useUser';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useUser();

  // Nur beim allerersten Laden (kein SWR-Cache) kurz warten
  if (isLoading && !isAuthenticated) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      )
    );
  }

  // Middleware hat authentifiziert - Content rendern
  return <>{children}</>;
}

/**
 * Hook fuer Auth Status in Client Components
 * Re-exportiert useUser() fuer Rueckwaertskompatibilitaet
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading } = useUser();

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}
