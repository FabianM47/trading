'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types';

const PAGE_SIZE = 50;

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialLoaded: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  sendError: string | null;
  setSendError: React.Dispatch<React.SetStateAction<string | null>>;
  isSending: boolean;
  loadMessages: () => Promise<void>;
  loadOlder: () => Promise<void>;
  sendMessage: (content: string, userId: string, username: string) => Promise<void>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function useChatMessages(): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isLoadingMoreRef = useRef(false);

  // messagesRef synchron halten
  const setMessagesTracked: typeof setMessages = (action) => {
    setMessages(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      messagesRef.current = next;
      return next;
    });
  };

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?limit=${PAGE_SIZE}`);
      const data = await res.json();
      if (data.messages) {
        setMessagesTracked(data.messages);
        setHasMore(data.messages.length >= PAGE_SIZE);
        setInitialLoaded(true);
      }
    } catch {
      // Fehler ignorieren
    }
  }, []);

  const loadOlder = useCallback(async () => {
    // Refs für synchrone Guards nutzen (kein stale closure)
    if (isLoadingMoreRef.current) return;
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const oldestMsg = currentMessages[0];
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res = await fetch(`/api/chat/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldestMsg.created_at)}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessagesTracked(prev => [...data.messages, ...prev]);
        setHasMore(data.messages.length >= PAGE_SIZE);

        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch {
      // Fehler ignorieren
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, userId: string, username: string) => {
    setIsSending(true);
    setSendError(null);

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      sender_username: username,
      content,
      created_at: new Date().toISOString(),
    };
    setMessagesTracked(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessagesTracked(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
      } else {
        setMessagesTracked(prev => prev.filter(m => m.id !== tempMsg.id));
        setSendError('Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.');
        throw new Error('send-failed');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'send-failed') throw err;
      setMessagesTracked(prev => prev.filter(m => m.id !== tempMsg.id));
      setSendError('Netzwerkfehler. Bitte pruefe deine Verbindung.');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    messages, setMessages, initialLoaded, isLoadingMore, hasMore,
    sendError, setSendError, isSending,
    loadMessages, loadOlder, sendMessage,
    messagesContainerRef, messagesEndRef,
  };
}
