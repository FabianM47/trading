/**
 * Web Push Helper
 * 
 * Konfiguriert web-push mit VAPID-Keys und stellt
 * Hilfsfunktionen zum Senden von Notifications bereit.
 */

import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@trading-portfolio.app';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
}

// VAPID konfigurieren
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Sendet eine Push-Notification an eine Subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60, // 1 Stunde Time-to-Live
        urgency: 'high',
      }
    );
    return true;
  } catch (error: any) {
    // 410 Gone = Subscription abgelaufen
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('[Push] Subscription expired, should be removed:', subscription.endpoint.substring(0, 50));
      return false;
    }
    console.error('[Push] Error sending notification:', error.message);
    return false;
  }
}

/**
 * Sendet Push-Notifications an alle Subscriptions eines Users
 * Gibt die Endpunkte zurück die nicht mehr gültig sind (zum Aufräumen)
 */
export async function sendPushToUser(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<string[]> {
  const expiredEndpoints: string[] = [];
  
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const success = await sendPushNotification(sub, payload);
      if (!success) {
        expiredEndpoints.push(sub.endpoint);
      }
    })
  );
  
  return expiredEndpoints;
}

export { VAPID_PUBLIC_KEY };
