/**
 * Chat Storage — Global Chat
 *
 * Ein einziger Chat-Raum fuer alle Benutzer.
 * Nutzt Supabase wenn verfuegbar, sonst In-Memory (lokale Entwicklung).
 */

import { logError } from '@/lib/logger';

interface ChatUserRow {
  user_id: string;
  username: string;
}

interface ChatMessageRow {
  id: string;
  sender_id: string;
  sender_username?: string;
  content: string;
  created_at: string;
}

// ── In-Memory Store (Dev/Fallback) ──────────────────────────────────

const memUsers = new Map<string, ChatUserRow>();
const memMessages: ChatMessageRow[] = [];
let memIdCounter = 0;

// ── Lazy Supabase Client ────────────────────────────────────────────

function getSupabase() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabase } = require('@/lib/supabase');
    return supabase;
  } catch {
    return null;
  }
}

// ── Mode Detection ──────────────────────────────────────────────────

let mode: 'supabase' | 'memory' | null = null;

async function getMode(): Promise<'supabase' | 'memory'> {
  if (mode) return mode;

  const sb = getSupabase();
  if (!sb) {
    console.warn('[Chat] Supabase nicht konfiguriert, nutze In-Memory Speicher');
    mode = 'memory';
    return mode;
  }

  try {
    const { error } = await sb.from('chat_users').select('user_id').limit(1);
    mode = error ? 'memory' : 'supabase';
    if (error) console.warn('[Chat] chat_users Tabelle nicht gefunden, nutze In-Memory Speicher');
  } catch {
    mode = 'memory';
  }

  return mode;
}

function sb() {
  return getSupabase()!;
}

// ── Public API ──────────────────────────────────────────────────────

export async function upsertUser(userId: string, username: string): Promise<void> {
  const m = await getMode();

  if (m === 'memory') {
    memUsers.set(userId, { user_id: userId, username });
    return;
  }

  const { error } = await sb()
    .from('chat_users')
    .upsert(
      { user_id: userId, username, last_seen_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    logError('Chat user upsert failed', { userId, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw new Error('Chat user upsert failed');
  }
}

/**
 * Globale Chat-Nachrichten laden (neueste zuerst, mit Pagination)
 */
export async function getMessages(limit: number, before?: string) {
  const m = await getMode();

  if (m === 'memory') {
    let msgs = [...memMessages].reverse(); // neueste zuerst
    if (before) {
      msgs = msgs.filter(msg => new Date(msg.created_at) < new Date(before));
    }
    const page = msgs.slice(0, limit);

    // Username anhaengen
    return {
      messages: page.reverse().map(msg => ({
        ...msg,
        sender_username: memUsers.get(msg.sender_id)?.username || 'Unbekannt',
      })),
      error: false,
    };
  }

  // Supabase: Nachrichten + Username via Join
  let query = sb()
    .from('chat_messages')
    .select('id, sender_id, content, created_at, chat_users!sender_id(username)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before && !isNaN(Date.parse(before))) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    logError('Chat messages fetch failed', error);
    return { messages: [], error: true };
  }

  // Ergebnis transformieren (Join-Format auflösen)
  const messages = (data || []).reverse().map((row: Record<string, unknown>) => {
    const chatUser = row.chat_users as { username: string } | null;
    return {
      id: row.id as string,
      sender_id: row.sender_id as string,
      sender_username: chatUser?.username || 'Unbekannt',
      content: row.content as string,
      created_at: row.created_at as string,
    };
  });

  return { messages, error: false };
}

/**
 * Alle Chat-User laden (fuer @mention Autocomplete)
 */
export async function getChatUsers(): Promise<{ users: { user_id: string; username: string }[]; error: boolean }> {
  const m = await getMode();

  if (m === 'memory') {
    return {
      users: Array.from(memUsers.values()),
      error: false,
    };
  }

  const { data, error } = await sb()
    .from('chat_users')
    .select('user_id, username')
    .order('username');

  if (error) {
    logError('Chat users fetch failed', error);
    return { users: [], error: true };
  }

  return { users: data || [], error: false };
}

/**
 * Nachricht in den globalen Chat senden
 */
export async function sendMessage(senderId: string, content: string) {
  const m = await getMode();

  if (m === 'memory') {
    const msg: ChatMessageRow = {
      id: `mem-${++memIdCounter}`,
      sender_id: senderId,
      sender_username: memUsers.get(senderId)?.username || 'Unbekannt',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    memMessages.push(msg);
    // Speicher begrenzen: aelteste Nachrichten entfernen
    if (memMessages.length > 1000) memMessages.splice(0, 500);
    return { message: msg, error: null };
  }

  const { data: message, error } = await sb()
    .from('chat_messages')
    .insert({ sender_id: senderId, content: content.trim() })
    .select('id, sender_id, content, created_at')
    .single();

  if (error) {
    logError('Chat message insert failed', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return { message: null, error: 'Nachricht konnte nicht gesendet werden' };
  }

  // Username holen
  const { data: user } = await sb()
    .from('chat_users')
    .select('username')
    .eq('user_id', senderId)
    .single();

  return {
    message: { ...message, sender_username: user?.username || 'Unbekannt' },
    error: null,
  };
}
