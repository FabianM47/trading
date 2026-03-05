/**
 * Alert Check API Route
 *
 * GET  /api/alerts/check — Vercel Cron (CRON_SECRET) oder externer Cron-Service (API-Key)
 * POST /api/alerts/check — Python-Script oder externer Cron-Service (API-Key)
 *
 * Prüft alle aktiven Alerts gegen die aktuellen Kurse
 * und sendet Push-Notifications bei Treffer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchBatchWithWaterfall } from '@/lib/smartQuoteProvider';
import { getCachedExchangeRates, convertToEUR } from '@/lib/currencyService';
import { sendPushToUser, type PushSubscription } from '@/lib/webPush';
import { logError, logInfo } from '@/lib/logger';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

/**
 * Timing-safe Vergleich zweier Strings
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Prüft Authentifizierung:
 * 1. Vercel Cron: CRON_SECRET Header
 * 2. API-Key: Authorization Bearer Header
 */
function validateAuth(request: NextRequest): boolean {
  // Vercel Cron sendet CRON_SECRET automatisch
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (headerSecret && safeCompare(headerSecret, cronSecret)) return true;
  }

  // Fallback: API-Key (für externen Cron-Service / Python-Script)
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const apiKey = authHeader.substring(7);
  const expectedKey = process.env.ALERTS_API_KEY;
  if (!expectedKey) {
    logError('ALERTS_API_KEY not configured', new Error('Missing ALERTS_API_KEY'));
    return false;
  }

  return safeCompare(apiKey, expectedKey);
}

/**
 * Gemeinsame Alert-Check Logik für GET und POST
 */
async function handleAlertCheck(request: NextRequest) {
  try {
    // Rate-Limiting: Max 5 Requests pro Minute pro IP (Brute-Force-Schutz)
    const clientId = getClientIdentifier(request);
    const { allowed } = checkRateLimit(`alerts-check:${clientId}`, {
      interval: 60_000,
      maxRequests: 5
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Authentifizierung (API-Key oder Vercel CRON_SECRET)
    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. Alle aktiven Alerts laden (über alle User hinweg)
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true);
    
    if (alertsError) {
      logError('Failed to load active alerts', alertsError);
      return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
    }
    
    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ 
        checked: 0, 
        triggered: 0,
        message: 'No active alerts' 
      });
    }
    
    // 2. Eindeutige ISINs sammeln
    const uniqueIsins = [...new Set(alerts.map(a => a.isin))];
    
    logInfo(`Checking ${alerts.length} alerts for ${uniqueIsins.length} symbols`);
    
    // 3. Aktuelle Kurse holen
    const { quotes } = await fetchBatchWithWaterfall(uniqueIsins);
    
    // Wechselkurse für EUR-Konvertierung
    let exchangeRates: Record<string, number> = {};
    try {
      exchangeRates = await getCachedExchangeRates();
    } catch (e) {
      logError('Failed to get exchange rates for alert check', e);
    }
    
    // 4. Alerts prüfen
    const triggeredAlerts: Array<{
      alert: any;
      currentPrice: number;
    }> = [];
    
    const now = new Date().toISOString();
    
    for (const alert of alerts) {
      const quote = quotes.get(alert.isin);
      if (!quote || !quote.price) continue;
      
      // Preis in EUR konvertieren falls nötig
      let priceEUR = quote.price;
      if (quote.currency && quote.currency !== 'EUR') {
        priceEUR = convertToEUR(quote.price, quote.currency, exchangeRates);
      }
      
      const targetPrice = parseFloat(alert.target_price);
      const isTriggered =
        (alert.direction === 'above' && priceEUR >= targetPrice) ||
        (alert.direction === 'below' && priceEUR <= targetPrice);

      // Letzten geprüften Preis immer aktualisieren
      await supabase
        .from('price_alerts')
        .update({
          last_checked_price: priceEUR,
          last_checked_at: now,
        })
        .eq('id', alert.id);

      if (isTriggered) {
        // Bei Repeat-Alerts: 60-Minuten Cooldown, um Notification-Spam zu verhindern
        if (alert.repeat && alert.triggered_at) {
          const cooldownMs = 60 * 60 * 1000; // 1 Stunde
          if (Date.now() - new Date(alert.triggered_at).getTime() < cooldownMs) {
            continue; // Noch im Cooldown, keine erneute Notification
          }
        }
        triggeredAlerts.push({ alert, currentPrice: priceEUR });
      }
    }
    
    // 5. Für jeden getriggerten Alert: Push senden
    let notificationsSent = 0;
    
    for (const { alert, currentPrice } of triggeredAlerts) {
      // Push Subscriptions des Users laden
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', alert.user_id);
      
      if (subs && subs.length > 0) {
        const pushSubscriptions: PushSubscription[] = subs.map(s => ({
          endpoint: s.endpoint,
          keys: {
            p256dh: s.p256dh,
            auth: s.auth,
          },
        }));
        
        const directionText = alert.direction === 'above' ? '↑ über' : '↓ unter';
        const formattedPrice = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(currentPrice);
        const formattedTarget = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(parseFloat(alert.target_price));
        
        const expiredEndpoints = await sendPushToUser(pushSubscriptions, {
          title: `🔔 ${alert.name}`,
          body: `Kurs ${directionText} ${formattedTarget}: Aktuell ${formattedPrice}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          url: '/',
          tag: `alert-${alert.id}`,
        });
        
        notificationsSent++;
        
        // Abgelaufene Subscriptions aufräumen
        for (const endpoint of expiredEndpoints) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', alert.user_id)
            .eq('endpoint', endpoint);
        }
      }
      
      // Alert als triggered markieren
      if (alert.repeat) {
        // Bei Wiederholung: triggered_at setzen aber aktiv lassen
        await supabase
          .from('price_alerts')
          .update({ triggered_at: now })
          .eq('id', alert.id);
      } else {
        // Einmalig: deaktivieren
        await supabase
          .from('price_alerts')
          .update({ 
            is_active: false, 
            triggered_at: now,
          })
          .eq('id', alert.id);
      }
      
      logInfo(`Alert triggered: ${alert.name} (${alert.isin}) ${alert.direction} ${alert.target_price} - Current: ${currentPrice}`);
    }
    
    return NextResponse.json({
      checked: alerts.length,
      triggered: triggeredAlerts.length,
      notificationsSent,
      timestamp: now,
    });
    
  } catch (error) {
    logError('Alert check error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET /api/alerts/check — Vercel Cron + externe Cron-Services */
export async function GET(request: NextRequest) {
  return handleAlertCheck(request);
}

/** POST /api/alerts/check — Python-Script + externe Cron-Services */
export async function POST(request: NextRequest) {
  return handleAlertCheck(request);
}
