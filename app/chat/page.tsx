'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { ChatMessage } from '@/types';
import UsernameModal from '@/components/UsernameModal';
import MessageContent from '@/components/chat/MessageContent';
import { useChatAuth } from '@/hooks/useChatAuth';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';

interface ChatUser {
  user_id: string;
  username: string;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Gestern ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) +
    ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Heute';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Gestern';

  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ChatPage() {
  const auth = useChatAuth();
  const chat = useChatMessages();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const chatUsersRef = useRef<ChatUser[]>([]);

  const updateChatUsers = useCallback((users: ChatUser[]) => {
    setChatUsers(users);
    chatUsersRef.current = users;
  }, []);

  const mention = useMentionAutocomplete({ chatUsers, userId: auth.userId });

  // Chat-User laden für @mention
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    fetch('/api/chat/users')
      .then(r => r.json())
      .then(data => { if (data.users) updateChatUsers(data.users); })
      .catch(() => {});
  }, [auth.isAuthenticated, updateChatUsers]);

  // Initiale Nachrichten laden
  useEffect(() => {
    if (auth.isAuthenticated) chat.loadMessages();
  }, [auth.isAuthenticated, chat.loadMessages]);

  // Realtime-Subscription
  useChatRealtime({
    isAuthenticated: auth.isAuthenticated,
    initialLoaded: chat.initialLoaded,
    userIdRef: auth.userIdRef,
    chatUsersRef,
    setMessages: chat.setMessages,
    setChatUsers: updateChatUsers,
  });

  // Auto-Scroll + Infinite Scroll
  useChatScroll({
    messagesContainerRef: chat.messagesContainerRef,
    messagesEndRef: chat.messagesEndRef,
    messagesCount: chat.messages.length,
    initialLoaded: chat.initialLoaded,
    hasMore: chat.hasMore,
    isLoadingMore: chat.isLoadingMore,
    loadOlder: chat.loadOlder,
  });

  const handleSend = useCallback(async () => {
    const content = mention.messageInput.trim();
    if (!content || chat.isSending) return;

    mention.resetInput();

    try {
      await chat.sendMessage(content, auth.userId, auth.username);
    } catch {
      mention.setMessageInput(content);
    }
  }, [mention.messageInput, mention.resetInput, mention.setMessageInput, chat.isSending, chat.sendMessage, auth.userId, auth.username]);

  // --- Render ---

  if (auth.isAuthChecking) {
    return (
      <main className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-accent"></div>
      </main>
    );
  }

  if (auth.needsUsername) {
    return <UsernameModal onUsernameSet={auth.onUsernameSet} />;
  }

  if (!auth.isAuthenticated) return null;

  return (
    <main className="h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background-card flex-shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-text-primary">Chat</h1>
          <span className="text-xs text-text-secondary ml-auto">{auth.username}</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={chat.messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {chat.isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-text-secondary"></div>
            </div>
          )}
          {!chat.hasMore && chat.messages.length > 0 && (
            <p className="text-center text-text-secondary/40 text-xs py-2">Keine aelteren Nachrichten</p>
          )}

          {chat.messages.length === 0 && chat.initialLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-16 h-16 text-text-secondary/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <p className="text-text-secondary text-sm">Noch keine Nachrichten</p>
              <p className="text-text-secondary/60 text-xs mt-1">Schreibe die erste Nachricht!</p>
            </div>
          ) : (
            chat.messages.map((msg: ChatMessage, i: number) => {
              const isMine = msg.sender_id === auth.userId;
              const prevMsg = i > 0 ? chat.messages[i - 1] : null;
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              // Datums-Trennlinie wenn Tag wechselt
              const showDateSep = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 border-t border-border/40" />
                      <span className="text-[10px] text-text-secondary/50 font-medium">{formatDateSeparator(msg.created_at)}</span>
                      <div className="flex-1 border-t border-border/40" />
                    </div>
                  )}
                  <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && !isMine && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor(msg.sender_username)}`}>
                        <span className="text-xs font-bold text-white">
                          {msg.sender_username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isMine && (
                      <p className="text-xs text-text-secondary mb-0.5 ml-1">{msg.sender_username}</p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl ${
                      isMine ? 'bg-white text-black rounded-br-md' : 'bg-background-elevated text-text-primary rounded-bl-md'
                    }`}>
                      <MessageContent content={msg.content} isMine={isMine} />
                      <p className={`text-[10px] mt-0.5 ${isMine ? 'text-black/40 text-right' : 'text-text-secondary/50'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              );
            })
          )}
          <div ref={chat.messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background-card flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Fehler-Anzeige */}
          {chat.sendError && (
            <div className="mb-2 flex items-center gap-2 text-red-400 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{chat.sendError}</span>
              <button onClick={() => chat.setSendError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* @mention Autocomplete */}
          {mention.mentionSuggestions.length > 0 && (
            <div className="mb-2 bg-background-elevated border border-border rounded-xl overflow-hidden shadow-lg">
              {mention.mentionSuggestions.map((user, i) => (
                <button
                  key={user.user_id}
                  onClick={() => mention.insertMention(user.username)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    i === mention.mentionIndex ? 'bg-white/10 text-text-primary' : 'text-text-secondary hover:bg-white/5'
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
            <textarea
              ref={mention.inputRef}
              value={mention.messageInput}
              onChange={mention.handleInputChange}
              onKeyDown={(e) => mention.handleKeyDown(e, handleSend)}
              placeholder="Nachricht schreiben... (@Name zum Erwaehnen)"
              maxLength={2000}
              rows={1}
              autoFocus
              className="flex-1 px-4 py-2.5 bg-background-elevated border border-border rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-white resize-none overflow-hidden"
              style={{ maxHeight: '96px' }}
            />
            <button
              onClick={handleSend}
              disabled={!mention.messageInput.trim() || chat.isSending}
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
