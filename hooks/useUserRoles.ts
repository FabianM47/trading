/**
 * User Roles Hook
 *
 * SWR-Hook fuer Rollen-Abfrage. Cached mit 5min dedupingInterval.
 */

import useSWR from 'swr';

interface RolesResponse {
  roles: string[];
  isAdmin: boolean;
  isTrader: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Roles fetch failed: ${res.status}`);
  return res.json();
});

export function useUserRoles() {
  const { data, error, isLoading } = useSWR<RolesResponse>(
    '/api/auth/roles',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // 5 Minuten
      refreshInterval: 0,
    }
  );

  return {
    roles: data?.roles || [],
    isAdmin: data?.isAdmin || false,
    isTrader: data?.isTrader || false,
    isLoading,
    error,
  };
}
