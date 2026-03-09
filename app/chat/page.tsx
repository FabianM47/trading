'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { ChatMessage } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const PAGE_SIZE = 50;

// URL-Regex fuer klickbare Links
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;
// @mention Regex
const MENTION_REGEX = /@(\w+)/g;

interface ChatUser {
  user_id: string;
  username: string;
}

/** Rendert Nachrichtentext mit klickbaren Links und hervorgehobenen @mentions */
function MessageContent({ content, isMine }: { content: string; isMine: boolean }) {
  const parts = useMemo(() => {
    // Alle Matches (URLs und @mentions) sammeln mit Position
    const tokens: { start: number; end: number; type: 'url' | 'mention'; value: string }[] = [];

    let match: RegExpExecArray | null;

    URL_REGEX.lastIndex = 0;
    while ((match = URL_REGEX.exec(content)) !== null) {
      tokens.push({ start: match.index, end: match.index + match[0].length, type: 'url', value: match[0] });
    }

    MENTION_REGEX.lastIndex = 0;
    while ((match = MENTION_REGEX.exec(content)) !== null) {
      // Nicht einfuegen wenn innerhalb einer URL
      const inUrl = tokens.some(t => t.type === 'url' && match!.index >= t.start && match!.index < t.end);
      if (!inUrl) {
        tokens.push({ start: match.index, end: match.index + match[0].length, type: 'mention', value: match[0] });
      }
    }

    tokens.sort((a, b) => a.start - b.start);

    const result: { type: 'text' | 'url' | 'mention'; value: string }[] = [];
    let cursor = 0;

    for (const token of tokens) {
      if (token.start > cursor) {
        result.push({ type: 'text', value: content.slice(cursor, token.start) });
      }
      result.push({ type: token.type, value: token.value });
      cursor = token.end;
    }

    if (cursor < content.length) {
      result.push({ type: 'text', value: content.slice(cursor) });
    }

    return result.length > 0 ? result : [{ type: 'text' as const, value: content }];
  }, [content]);

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.type === 'url') {
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all ${isMine ? 'text-blue-700 hover:text-blue-900' : 'text-blue-400 hover:text-blue-300'}`}
            >
              {part.value}
            </a>
          );
        }
        if (part.type === 'mention') {
          return (
            <span
              key={i}
              className={`font-semibold ${isMine ? 'text-blue-700' : 'text-blue-400'}`}
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </p>
  );
}

export default function ChatPage() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // @mention
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0); // Cursor-Position des @

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auth-Check
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/logto/user');
        const data = await response.json();
        if (data.isAuthenticated && data.claims?.username) {
          setIsAuthenticated(true);
          setIsAuthChecking(false);
          setUserId(data.claims.sub);
          setUsername(data.claims.username);
        } else {
          window.location.href = '/api/logto/sign-in';
        }
      } catch {
        window.location.href = '/api/logto/sign-in';
      }
    }
    checkAuth();
  }, []);

  // Chat-User laden fuer @mention
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/chat/users')
      .then(r => r.json())
      .then(data => {
        if (data.users) setChatUsers(data.users);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Initiale Nachrichten laden
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages?limit=${PAGE_SIZE}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setHasMore(data.messages.length >= PAGE_SIZE);
        setInitialLoaded(true);
      }
    } catch {
      // Fehler ignorieren
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadMessages();
  }, [isAuthenticated, loadMessages]);

  // Supabase Realtime: Neue Nachrichten per WebSocket empfangen
  useEffect(() => {
    if (!isAuthenticated || !initialLoaded) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Fallback: kein Realtime verfuegbar (lokale Entwicklung ohne Supabase)
      console.warn('[Chat] Supabase Realtime nicht verfuegbar, kein Live-Update');
      return;
    }

    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; content: string; created_at: string };

          // Eigene Nachrichten ignorieren (haben wir schon per optimistic update)
          setMessages(prev => {
            // Duplikat-Check (auch fuer optimistic updates)
            if (prev.some(m => m.id === row.id)) return prev;

            // Username aus chatUsers-Liste holen
            const user = chatUsers.find(u => u.user_id === row.sender_id);
            const newMsg: ChatMessage = {
              id: row.id,
              sender_id: row.sender_id,
              sender_username: user?.username || 'Unbekannt',
              content: row.content,
              created_at: row.created_at,
            };

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, initialLoaded, chatUsers]);

  // Auto-scroll bei neuen Nachrichten (nur wenn schon unten)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current && initialLoaded) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom || prevCountRef.current === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? 'instant' : 'smooth' });
        }
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length, initialLoaded]);

  // Aeltere Nachrichten laden beim Hochscrollen
  const loadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    const oldestMsg = messages[0];
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res = await fetch(`/api/chat/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldestMsg.created_at)}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => [...data.messages, ...prev]);
        setHasMore(data.messages.length >= PAGE_SIZE);

        // Scroll-Position beibehalten
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
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages]);

  // Scroll-Handler fuer infinite scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      loadOlder();
    }
  }, [loadOlder, hasMore, isLoadingMore]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // @mention Autocomplete Logik
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return chatUsers
      .filter(u => u.username.toLowerCase().startsWith(q) && u.user_id !== userId)
      .slice(0, 5);
  }, [mentionQuery, chatUsers, userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // @mention Detection
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (mentionUsername: string) => {
    const before = messageInput.slice(0, mentionStart);
    const cursorPos = inputRef.current?.selectionStart || messageInput.length;
    const after = messageInput.slice(cursorPos);
    // Ersetze den partiellen @query mit dem vollstaendigen @username
    const afterMention = after.startsWith(' ') ? after : ' ' + after;
    setMessageInput(before + '@' + mentionUsername + afterMention);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    setMessageInput('');
    setMentionQuery(null);
    setIsSending(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      sender_username: username,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        // Temp-Nachricht durch echte ersetzen
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
      } else {
        // Temp entfernen, Input zurueck
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setMessageInput(content);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setMessageInput(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // @mention Navigation
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) +
      ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-accent"></div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background-card flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-text-primary">Chat</h1>
          <span className="text-xs text-text-secondary ml-auto">
            {username}
          </span>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {/* Lade-Indikator fuer aeltere Nachrichten */}
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-text-secondary"></div>
            </div>
          )}
          {!hasMore && messages.length > 0 && (
            <p className="text-center text-text-secondary/40 text-xs py-2">Keine aelteren Nachrichten</p>
          )}

          {messages.length === 0 && initialLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-16 h-16 text-text-secondary/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <p className="text-text-secondary text-sm">Noch keine Nachrichten</p>
              <p className="text-text-secondary/60 text-xs mt-1">Schreibe die erste Nachricht!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.sender_id === userId;
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              return (
                <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && !isMine && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor(msg.sender_username)}`}>
                        <span className="text-xs font-bold text-white">
                          {msg.sender_username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isMine && (
                      <p className="text-xs text-text-secondary mb-0.5 ml-1">{msg.sender_username}</p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl ${
                      isMine
                        ? 'bg-white text-black rounded-br-md'
                        : 'bg-background-elevated text-text-primary rounded-bl-md'
                    }`}>
                      <MessageContent content={msg.content} isMine={isMine} />
                      <p className={`text-[10px] mt-0.5 ${
                        isMine ? 'text-black/40 text-right' : 'text-text-secondary/50'
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background-card flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* @mention Autocomplete */}
          {mentionSuggestions.length > 0 && (
            <div className="mb-2 bg-background-elevated border border-border rounded-xl overflow-hidden shadow-lg">
              {mentionSuggestions.map((user, i) => (
                <button
                  key={user.user_id}
                  onClick={() => insertMention(user.username)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    i === mentionIndex
                      ? 'bg-white/10 text-text-primary'
                      : 'text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getAvatarColor(user.username)}`}>
                    <span className="text-[10px] font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>@{user.username}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben... (@Name zum Erwaehnen)"
              maxLength={2000}
              autoFocus
              className="flex-1 px-4 py-2.5 bg-background-elevated border border-border rounded-full text-white text-sm focus:outline-none focus:ring-1 focus:ring-white"
            />
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              className="p-2.5 bg-white text-black rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
