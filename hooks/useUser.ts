/**
 * useUser Hook
 *
 * Zentraler SWR-Hook fuer User-Daten (Claims, Username).
 * Cached mit dedupingInterval - beim Seitenwechsel ist der State sofort da.
 *
 * HINWEIS: Die Middleware prueft bereits serverseitig ob der User authentifiziert ist.
 * Dieser Hook laedt nur die User-Daten (Username, Claims) fuer die UI.
 */

import useSWR from 'swr';

interface UserClaims {
  sub?: string;
  email?: string;
  name?: string;
  username?: string | null;
  [key: string]: unknown;
}

interface UserResponse {
  isAuthenticated: boolean;
  claims: UserClaims | null;
}

const fetcher = async (url: string): Promise<UserResponse> => {
  const res = await fetch(url);

  if (res.status === 401) {
    // Echte Session-Ablauf: Zur Anmeldung weiterleiten
    window.location.replace('/api/logto/sign-in');
    // Werfe Fehler damit SWR nicht cached
    throw new Error('Session expired');
  }

  if (!res.ok) {
    // Server-Fehler: Middleware hat authentifiziert, Fallback
    return { isAuthenticated: true, claims: null };
  }

  const data = await res.json();

  if (!data.isAuthenticated) {
    // API sagt nicht authentifiziert aber kein 401 - Fallback
    return { isAuthenticated: true, claims: null };
  }

  return data;
};

export function useUser() {
  const { data, error, isLoading } = useSWR<UserResponse>(
    '/api/logto/user',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // 5 Minuten - kein Re-Fetch beim Seitenwechsel
      refreshInterval: 0,
      errorRetryCount: 1,
      // Beim ersten Laden optimistisch: Middleware hat bereits authentifiziert
      fallbackData: undefined,
    }
  );

  return {
    user: data?.claims ?? null,
    username: (data?.claims?.username as string | null) ?? null,
    userId: (data?.claims?.sub as string | null) ?? null,
    isAuthenticated: data?.isAuthenticated ?? !error,
    isLoading,
    needsUsername: data?.isAuthenticated === true && !data?.claims?.username,
  };
}
