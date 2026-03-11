'use client';

/**
 * RoleGate — UI-Wrapper fuer rollenbasierte Zugriffskontrolle
 *
 * Zeigt Content nur an wenn der User die erforderliche Rolle hat.
 * Waehrend des Ladens wird ein Skeleton angezeigt.
 * Bei fehlender Rolle wird eine informative Meldung gezeigt.
 */

import { useUserRoles } from '@/hooks/useUserRoles';

interface RoleGateProps {
  role: 'trading' | 'admin';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ROLE_MESSAGES: Record<string, { title: string; description: string }> = {
  trading: {
    title: 'Kein Zugriff',
    description:
      'Du hast noch keine Trading-Rolle. Bitte wende dich an einen Administrator, um Zugriff zu erhalten.',
  },
  admin: {
    title: 'Nur fuer Administratoren',
    description:
      'Dieser Bereich ist nur fuer Administratoren zugaenglich.',
  },
};

export default function RoleGate({ role, children, fallback }: RoleGateProps) {
  const { isAdmin, isTrader, isLoading, error } = useUserRoles();

  // Loading-Zustand
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400" />
      </div>
    );
  }

  // Rollen-Check
  const hasAccess =
    role === 'admin' ? isAdmin : role === 'trading' ? isTrader : false;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Fehler oder fehlende Rolle
  if (fallback) return <>{fallback}</>;

  const message = ROLE_MESSAGES[role] || ROLE_MESSAGES.trading;

  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          {message.title}
        </h2>
        <p className="text-zinc-400 text-sm">
          {error ? 'Fehler beim Laden der Berechtigungen. Bitte versuche es spaeter erneut.' : message.description}
        </p>
      </div>
    </div>
  );
}
