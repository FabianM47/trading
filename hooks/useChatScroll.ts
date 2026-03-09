'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseChatScrollOptions {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesCount: number;
  initialLoaded: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadOlder: () => Promise<void>;
}

export function useChatScroll({
  messagesContainerRef,
  messagesEndRef,
  messagesCount,
  initialLoaded,
  hasMore,
  isLoadingMore,
  loadOlder,
}: UseChatScrollOptions) {
  // Auto-scroll bei neuen Nachrichten (nur wenn schon unten)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messagesCount > prevCountRef.current && initialLoaded) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom || prevCountRef.current === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? 'instant' : 'smooth' });
        }
      }
    }
    prevCountRef.current = messagesCount;
  }, [messagesCount, initialLoaded, messagesContainerRef, messagesEndRef]);

  // Scroll-Handler fuer infinite scroll (mit Throttle)
  const scrollThrottleRef = useRef(false);
  const handleScroll = useCallback(() => {
    if (scrollThrottleRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      scrollThrottleRef.current = true;
      loadOlder();
      setTimeout(() => { scrollThrottleRef.current = false; }, 500);
    }
  }, [loadOlder, hasMore, isLoadingMore, messagesContainerRef]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, messagesContainerRef]);
}
