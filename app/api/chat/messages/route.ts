/**
 * Global Chat Messages API
 *
 * GET  /api/chat/messages?before=timestamp&limit=50 — Nachrichten laden
 * POST /api/chat/messages — Nachricht senden
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { getMessages, sendMessage, getUsernameByUserId } from '@/lib/chatStore';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendPushToUser, PushSubscription } from '@/lib/webPush';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;

    const before = request.nextUrl.searchParams.get('before') || undefined;
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50') || 50, 100);

    const result = await getMessages(limit, before);

    if (result.error) {
      return NextResponse.json({ error: 'Nachrichten konnten nicht geladen werden' }, { status: 500 });
    }

    return NextResponse.json({ messages: result.messages });
  } catch (error) {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // Rate Limiting: max 5 Nachrichten pro 10 Sekunden pro User
    const rateCheck = checkRateLimit(`chat:${userId}`, { interval: 10_000, maxRequests: 5 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Zu viele Nachrichten. Bitte warte einen Moment.' }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungültige JSON-Daten' }, { status: 400 });
    }

    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }

    // Username aus chat_users lesen (wurde beim Auth-Flow/Username-Setup angelegt)
    const senderUsername = await getUsernameByUserId(userId);
    if (!senderUsername) {
      return NextResponse.json({ error: 'Kein Username gesetzt' }, { status: 400 });
    }

    const result = await sendMessage(userId, parsed.data.content, senderUsername);

    if (result.error) {
      return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden' }, { status: 500 });
    }

    // Push-Notifications an erwähnte User senden (fire-and-forget)
    sendMentionNotifications(
      parsed.data.content,
      senderUsername,
      userId,
      result.message?.id
    ).catch((err) => console.error('[Chat] Mention notification error:', err));

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('[Chat POST] Unerwarteter Fehler:', error);
    const details = process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: 'Serverfehler', ...(details && { details }) }, { status: 500 });
  }
}

/**
 * Parst @mentions aus einer Nachricht und sendet Push-Notifications
 * an die erwähnten User (außer den Sender selbst).
 */
const BROADCAST_MENTIONS = new Set(['all', 'everyone', 'here']);

async function sendMentionNotifications(
  content: string,
  senderUsername: string,
  senderUserId: string,
  messageId?: string
) {
  const mentionMatches = content.match(/@(\w+)/g);
  if (!mentionMatches) return;

  // Deduplizierte Usernames (ohne @-Prefix, Originalschreibweise beibehalten)
  const usernames = [...new Set(mentionMatches.map((m) => m.slice(1)))];
  const isBroadcast = usernames.some((u) => BROADCAST_MENTIONS.has(u.toLowerCase()));

  console.log('[Chat Mention] Detected mentions:', usernames, 'broadcast:', isBroadcast);

  let targetUsers: { user_id: string }[];

  if (isBroadcast) {
    // @all/@everyone/@here → alle Chat-User benachrichtigen
    const { data, error } = await supabase
      .from('chat_users')
      .select('user_id')
      .neq('user_id', senderUserId);
    if (error) {
      console.error('[Chat Mention] Failed to load broadcast users:', error);
      return;
    }
    targetUsers = data || [];
  } else {
    // Einzelne @username-Mentions auflösen (case-insensitive)
    const { data, error } = await supabase
      .from('chat_users')
      .select('user_id, username')
      .in('username', usernames);

    if (error) {
      console.error('[Chat Mention] Failed to resolve usernames:', error);
      return;
    }

    // Falls exakter Match fehlschlägt, case-insensitive nachschlagen
    let resolved = data || [];
    if (resolved.length === 0) {
      const lowerUsernames = usernames.map((u) => u.toLowerCase());
      const { data: allUsers } = await supabase
        .from('chat_users')
        .select('user_id, username');
      resolved = (allUsers || []).filter((u: { username: string }) =>
        lowerUsernames.includes(u.username.toLowerCase())
      );
    }

    targetUsers = resolved.filter((u) => u.user_id !== senderUserId);
  }

  console.log('[Chat Mention] Target users:', targetUsers.length);
  if (!targetUsers.length) return;

  for (const user of targetUsers) {
    // Push-Subscriptions des erwähnten Users laden
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.user_id);

    if (!subs?.length) {
      console.log('[Chat Mention] No push subscriptions for user:', user.user_id);
      continue;
    }

    const subscriptions: PushSubscription[] = subs.map((s) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }));

    const bodyPreview = content.length > 100 ? content.slice(0, 100) + '...' : content;

    console.log('[Chat Mention] Sending push to user:', user.user_id, 'subscriptions:', subs.length);

    const expiredEndpoints = await sendPushToUser(subscriptions, {
      title: `💬 ${senderUsername}`,
      body: bodyPreview,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: '/chat',
      tag: `chat-mention-${messageId || Date.now()}`,
    });

    // Abgelaufene Subscriptions bereinigen
    for (const endpoint of expiredEndpoints) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.user_id)
        .eq('endpoint', endpoint);
    }
  }
}
