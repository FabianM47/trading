/**
 * User Profile / Debug Page
 * 
 * Zeigt alle User Claims (ID Token) an.
 * Geschützte Route - nur für authentifizierte User.
 */

'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';

interface UserClaims {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
  picture?: string;
  [key: string]: unknown;
}

export default function UserProfilePage() {
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/logto/user');
        const data = await response.json();
        
        if (data.isAuthenticated) {
          setClaims(data.claims);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserInfo();
  }, []);

  return (
    <RequireAuth>
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <a 
              href="/" 
              className="text-sm text-accent hover:underline mb-4 inline-block"
            >
              ← Zurück zum Portfolio
            </a>
            <h1 className="text-3xl font-bold mb-2">Benutzerprofil</h1>
            <p className="text-text-secondary">
              OIDC Claims aus dem ID Token
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="bg-background-card rounded-lg p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
              <p className="text-text-secondary">Lade Benutzerdaten...</p>
            </div>
          )}

          {/* User Info */}
          {!isLoading && claims && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-background-card rounded-lg p-6 border border-border">
                <div className="flex items-center gap-4 mb-6">
                  {claims.picture ? (
                    <img 
                      src={claims.picture as string} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-3xl font-bold text-accent">
                        {(claims.name as string || claims.email as string || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">
                      {claims.name || 'Unbenannt'}
                    </h2>
                    <p className="text-text-secondary">{claims.email}</p>
                    {claims.email_verified && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">
                        ✓ Email verifiziert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Claims Table */}
              <div className="bg-background-card rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-background-elevated">
                  <h3 className="font-semibold">ID Token Claims (Debug)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                          Claim
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                          Wert
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                          Typ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(claims).map(([key, value]) => (
                        <tr key={key} className="hover:bg-background-elevated transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-accent">
                            {key}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono max-w-md truncate">
                            {typeof value === 'object' 
                              ? JSON.stringify(value)
                              : String(value)
                            }
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">
                            {typeof value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw JSON */}
              <details className="bg-background-card rounded-lg border border-border">
                <summary className="px-6 py-4 cursor-pointer hover:bg-background-elevated transition-colors font-semibold">
                  Raw JSON anzeigen
                </summary>
                <div className="px-6 py-4 border-t border-border">
                  <pre className="bg-background p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(claims, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
