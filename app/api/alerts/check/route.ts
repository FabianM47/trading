/**
 * Alert Check API Route
 * 
 * POST /api/alerts/check
 * 
 * Wird vom externen Python-Script aufgerufen (jede Minute).
 * Prüft alle aktiven Alerts gegen die aktuellen Kurse
 * und sendet Push-Notifications bei Treffer.
 * 
 * Authentifizierung: API-Key über Authorization Header
 * (kein User-Auth, da Server-zu-Server Kommunikation)
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
 * Prüft den API-Key aus dem Authorization Header
 */
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const apiKey = authHeader.substring(7);
  const expectedKey = process.env.ALERTS_API_KEY;
  
  if (!expectedKey) {
    logError('ALERTS_API_KEY not configured', new Error('Missing ALERTS_API_KEY'));
    return false;
  }
  
  // Timing-safe Vergleich gegen Timing-Attacks
  try {
    const a = Buffer.from(apiKey, 'utf8');
    const b = Buffer.from(expectedKey, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/alerts/check
 * 
 * 1. Lädt alle aktiven Alerts
 * 2. Holt aktuelle Kurse für alle betroffenen ISINs
 * 3. Prüft Bedingungen
 * 4. Sendet Push-Notifications bei Treffern
 * 5. Markiert Alerts als triggered
 */
export async function POST(request: NextRequest) {
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

    // API-Key Validierung
    if (!validateApiKey(request)) {
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
    const quotes = await fetchBatchWithWaterfall(uniqueIsins);
    
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
