'use client';

import { useEffect, useState, useCallback } from 'react';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isPending: boolean;
  permission: NotificationPermission | 'default';
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  /** iOS Safari, aber App ist nicht als PWA installiert → Push nicht verfügbar */
  needsInstall: boolean;
}

/**
 * Hook für Web Push Notification Management
 * 
 * 1. Registriert den Service Worker
 * 2. Verwaltet Push-Subscription (subscribe/unsubscribe)
 * 3. Sendet Subscription an den Server
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // iOS als PWA installiert? (nur dann funktioniert Push auf iOS)
  let needsInstall = false;
  try {
    needsInstall =
      typeof window !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    // matchMedia kann auf manchen iOS-Versionen fehlschlagen
  }

  // Service Worker registrieren und Status prüfen
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (!supported) return;
    
    setPermission(Notification.permission);
    
    // Service Worker registrieren
    navigator.serviceWorker.register('/sw.js')
      .then(async (reg) => {
        setRegistration(reg);
        
        // Prüfe ob bereits subscribed
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch((err) => {
        console.error('[Push] Service Worker registration failed:', err);
      });
  }, []);

  // Subscribe für Push Notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!registration) return false;
    
    setIsPending(true);
    
    try {
      // Permission anfordern
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        setIsPending(false);
        return false;
      }
      
      // VAPID Key vom Server holen
      const vapidRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await vapidRes.json();
      
      if (!publicKey) {
        console.error('[Push] No VAPID key available');
        setIsPending(false);
        return false;
      }
      
      // Push Subscription erstellen
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      
      // Subscription an Server senden
      const subJSON = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
          userAgent: navigator.userAgent,
        }),
      });
      
      if (res.ok) {
        setIsSubscribed(true);
        setIsPending(false);
        return true;
      } else {
        console.error('[Push] Failed to save subscription on server');
        setIsPending(false);
        return false;
      }
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      setIsPending(false);
      return false;
    }
  }, [registration]);

  // Unsubscribe von Push Notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration) return false;
    
    setIsPending(true);
    
    try {
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Auf Server löschen
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        // Lokal unsubscribe
        await subscription.unsubscribe();
      }
      
      setIsSubscribed(false);
      setIsPending(false);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setIsPending(false);
      return false;
    }
  }, [registration]);

  return {
    isSupported,
    isSubscribed,
    isPending,
    permission,
    subscribe,
    unsubscribe,
    needsInstall,
  };
}

/**
 * Konvertiert einen Base64-String zu Uint8Array
 * (benötigt für applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
