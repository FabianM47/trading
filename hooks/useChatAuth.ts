'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';

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
  const { userId: cachedUserId, username: cachedUsername, isLoading, isAuthenticated, needsUsername } = useUser();
  const [username, setUsername] = useState('');
  const userIdRef = useRef('');

  // Sync aus useUser()
  useEffect(() => {
    if (cachedUsername) {
      setUsername(cachedUsername);
    }
    if (cachedUserId) {
      userIdRef.current = cachedUserId;
    }
  }, [cachedUsername, cachedUserId]);

  const onUsernameSet = (newUsername: string) => {
    setUsername(newUsername);
  };

  return {
    isAuthChecking: isLoading && !isAuthenticated,
    isAuthenticated: isAuthenticated && !!cachedUsername,
    needsUsername,
    userId: cachedUserId ?? '',
    username,
    userIdRef,
    onUsernameSet,
  };
}
