'use client';

import { useState, useEffect, useRef } from 'react';

interface UseChatAuthReturn {
  isAuthChecking: boolean;
  isAuthenticated: boolean;
  needsUsername: boolean;
  userId: string;
  username: string;
  userIdRef: React.RefObject<string>;
  onUsernameSet: (newUsername: string) => void;
}

export function useChatAuth(): UseChatAuthReturn {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const userIdRef = useRef('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/logto/user');
        const data = await response.json();

        // Nur bei echtem 401 redirecten, nicht bei Server-Fehlern
        if (!data.isAuthenticated) {
          if (response.status === 401) {
            window.location.replace('/api/logto/sign-in');
            return;
          }
          // Server-Fehler: Middleware hat authentifiziert, Fehler anzeigen
          setIsAuthChecking(false);
          return;
        }

        setUserId(data.claims.sub);
        userIdRef.current = data.claims.sub;
        if (data.claims.username) {
          setUsername(data.claims.username);
          setIsAuthenticated(true);
        } else {
          setNeedsUsername(true);
        }
        setIsAuthChecking(false);
      } catch {
        // Netzwerk-Fehler: Nicht redirecten
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const onUsernameSet = (newUsername: string) => {
    setUsername(newUsername);
    setNeedsUsername(false);
    setIsAuthenticated(true);
  };

  return { isAuthChecking, isAuthenticated, needsUsername, userId, username, userIdRef, onUsernameSet };
}
