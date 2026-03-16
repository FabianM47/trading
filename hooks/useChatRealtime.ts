'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface ChatUser {
  user_id: string;
  username: string;
}

interface UseChatRealtimeOptions {
  isAuthenticated: boolean;
  initialLoaded: boolean;
  userIdRef: React.RefObject<string>;
  chatUsersRef: React.RefObject<ChatUser[]>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatUsers: (users: ChatUser[]) => void;
}

export function useChatRealtime({
  isAuthenticated,
  initialLoaded,
  userIdRef,
  chatUsersRef,
  setMessages,
  setChatUsers,
}: UseChatRealtimeOptions) {
  const lastUserRefetchRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !initialLoaded) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.warn('[Chat] Supabase Realtime nicht verfügbar, kein Live-Update');
      return;
    }

    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; content: string; created_at: string };

          if (row.sender_id === userIdRef.current) return;

          const user = (chatUsersRef.current || []).find(u => u.user_id === row.sender_id);
          const senderUsername = user?.username || 'Unbekannt';

          setMessages(prev => {
            if (prev.some(m => m.id === row.id)) return prev;

            const newMsg: ChatMessage = {
              id: row.id,
              sender_id: row.sender_id,
              sender_username: senderUsername,
              content: row.content,
              created_at: row.created_at,
            };

            return [...prev, newMsg];
          });

          // Bei unbekanntem Sender: User-Liste neu laden (throttled, max 1x/10s)
          if (!user) {
            const now = Date.now();
            if (now - lastUserRefetchRef.current > 10_000) {
              lastUserRefetchRef.current = now;
              fetch('/api/chat/users')
                .then(r => r.json())
                .then(data => {
                  if (data.users) {
                    setChatUsers(data.users);
                    // "Unbekannt"-Nachrichten retroaktiv patchen
                    setMessages(prev => prev.map(m => {
                      if (m.sender_username === 'Unbekannt') {
                        const found = (data.users as ChatUser[]).find(u => u.user_id === m.sender_id);
                        if (found) return { ...m, sender_username: found.username };
                      }
                      return m;
                    }));
                  }
                })
                .catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, initialLoaded, userIdRef, chatUsersRef, setMessages, setChatUsers]);
}
