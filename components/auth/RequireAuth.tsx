/**
 * RequireAuth Component
 * 
 * Guard Component für geschützte Routen.
 * Leitet nicht-authentifizierte User zum Login um.
 * 
 * Usage:
 * ```tsx
 * <RequireAuth>
 *   <ProtectedContent />
 * </RequireAuth>
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserClaims {
  sub?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

interface UserInfo {
  isAuthenticated: boolean;
  claims: UserClaims | null;
}

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/logto/user');
        const data: UserInfo = await response.json();

        setUserInfo(data);

        // Guard: Nicht authentifiziert → Redirect zum Login
        if (!data.isAuthenticated) {
          window.location.href = '/api/logto/sign-in';
          return;
        }

        setIsLoading(false);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Auth check failed:', error);
        }
        window.location.href = '/api/logto/sign-in';
      }
    }

    checkAuth();
  }, [router]);

  // Loading State
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-text-secondary">Authentifizierung wird geprüft...</p>
          </div>
        </div>
      )
    );
  }

  // Guard: Nicht authentifiziert (sollte nicht erreicht werden, da Redirect)
  if (!userInfo?.isAuthenticated) {
    return null;
  }

  // Authentifiziert: Kinder rendern
  return <>{children}</>;
}

/**
 * Hook für Auth Status in Client Components
 */
export function useAuth() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/logto/user');
        const data: UserInfo = await response.json();
        setUserInfo(data);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Failed to fetch user:', error);
        }
        setUserInfo({ isAuthenticated: false, claims: null });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  return {
    user: userInfo?.claims,
    isAuthenticated: userInfo?.isAuthenticated ?? false,
    isLoading,
  };
}
