/// <reference lib="webworker" />

/**
 * Service Worker für Trading Portfolio PWA
 * 
 * Funktionen:
 * 1. Push-Benachrichtigungen empfangen und anzeigen
 * 2. Notification-Klicks behandeln (App öffnen)
 * 3. Basis-Caching für Offline-Fähigkeit
 */

const SW_VERSION = '1.0.0';
const CACHE_NAME = `trading-cache-v${SW_VERSION}`;

// Assets die vorab gecacht werden sollen
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ==========================================
// INSTALL: Service Worker installieren
// ==========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + SW_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ==========================================
// ACTIVATE: Alte Caches aufräumen
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + SW_VERSION);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// FETCH: Network-first mit Cache-Fallback
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Nur GET-Requests cachen
  if (request.method !== 'GET') return;
  
  // API-Requests nicht cachen
  if (request.url.includes('/api/')) return;

  // Nur http(s) cachen — chrome-extension:// etc. verursacht Fehler
  if (!request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Erfolgreiche Antwort im Cache speichern
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Bei Netzwerkfehler: aus Cache laden
        return caches.match(request).then(cached => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// ==========================================
// PUSH: Push-Benachrichtigungen empfangen
// ==========================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Trading Alert',
    body: 'Ein Preisalarm wurde ausgelöst!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    url: '/',
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }
  
  // iOS Safari unterstützt: icon, badge, tag, renotify, data
  // iOS Safari ignoriert/kennt nicht: vibrate, requireInteraction, actions
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    tag: data.tag || 'price-alert',
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ==========================================
// NOTIFICATION CLICK: App öffnen bei Klick
// ==========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Falls App bereits offen ist, fokussieren
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Sonst neues Fenster öffnen
        return self.clients.openWindow(urlToOpen);
      })
  );
});
