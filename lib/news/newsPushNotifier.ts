/**
 * News Brief Push Notifier
 *
 * Sendet Push-Notifications an alle berechtigten User
 * wenn ein neuer täglicher Marktbericht generiert wurde.
 *
 * Folgt dem gleichen Muster wie app/api/alerts/check/route.ts
 */

import { supabase } from '@/lib/supabase';
import { sendPushToUser, type PushSubscription } from '@/lib/webPush';
import { logError, logInfo } from '@/lib/logger';

export interface BriefNotificationData {
  title: string;
  overallSentiment: string;
  firstHeadline?: string;
}

const SENTIMENT_EMOJI: Record<string, string> = {
  bullish: '📈',
  bearish: '📉',
  neutral: '➡️',
  mixed: '↕️',
};

/**
 * Sendet Push-Notifications für einen neuen Marktbericht an alle berechtigten User.
 *
 * Berechtigt = hat Push-Subscription UND news_notifications !== false.
 * (Default ist true, auch wenn kein user_settings-Eintrag existiert.)
 */
export async function sendNewsBriefNotifications(
  data: BriefNotificationData
): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  try {
    // 1. Alle User-IDs mit aktiven Push-Subscriptions holen
    const { data: allSubs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth');

    if (subsError || !allSubs || allSubs.length === 0) {
      logInfo('No push subscriptions found, skipping news notifications');
      return { sent: 0, errors: 0 };
    }

    // 2. User die explizit news_notifications = false gesetzt haben
    const { data: optOuts } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('news_notifications', false);

    const optOutUserIds = new Set((optOuts || []).map((o) => o.user_id));

    // 3. Subscriptions nach User gruppieren (ohne Opt-outs)
    const subsByUser = new Map<string, PushSubscription[]>();
    for (const sub of allSubs) {
      if (optOutUserIds.has(sub.user_id)) continue;

      const existing = subsByUser.get(sub.user_id) || [];
      existing.push({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      });
      subsByUser.set(sub.user_id, existing);
    }

    if (subsByUser.size === 0) {
      logInfo('All users opted out of news notifications');
      return { sent: 0, errors: 0 };
    }

    // 4. Notification-Payload bauen
    const sentimentEmoji = SENTIMENT_EMOJI[data.overallSentiment] || '📊';
    const today = new Date().toISOString().split('T')[0];

    const payload = {
      title: '📰 Täglicher Marktbericht',
      body: `${sentimentEmoji} ${data.firstHeadline || data.title}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: '/news',
      tag: `news-brief-${today}`,
    };

    // 5. Push an alle berechtigten User senden
    for (const [userId, subscriptions] of subsByUser) {
      try {
        const expiredEndpoints = await sendPushToUser(subscriptions, payload);

        // Abgelaufene Subscriptions aufraeumen
        for (const endpoint of expiredEndpoints) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', endpoint);
        }

        sent++;
      } catch (error) {
        logError(`Failed to send news push to user ${userId}`, error);
        errors++;
      }
    }

    logInfo(`News brief push: ${sent} users notified, ${errors} errors`);
  } catch (error) {
    logError('sendNewsBriefNotifications failed', error);
    errors++;
  }

  return { sent, errors };
}
