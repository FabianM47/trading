# PWA (Progressive Web App)

## Uebersicht

Die Trading-App ist als Progressive Web App konfiguriert und kann auf mobilen Geraeten wie eine native App installiert werden. Sie unterstuetzt Offline-Caching, einen Standalone-Modus und responsive Icons fuer alle Geraetegroessen.

## Architektur

```
public/manifest.json         -> App-Metadaten, Icons, Display-Modus
public/sw.js                 -> Service Worker (Caching, Offline, Push)
public/icons/                -> App-Icons (72px - 512px)
app/layout.tsx               -> PWA-Metadaten im HTML <head>
next.config.mjs              -> Service-Worker-Scope & Cache-Headers
middleware.ts                -> CSP-Headers, SW-Exclusion von Auth
lib/usePushNotifications.ts  -> Service Worker Registration
```

## Komponenten

### Manifest (`public/manifest.json`)

| Eigenschaft | Wert |
|-------------|------|
| Name | Trading Portfolio |
| Short Name | Trading |
| Display Mode | `standalone` (Fallback: `minimal-ui`) |
| Orientation | `portrait-primary` |
| Theme Color | `#3b82f6` (Blau) |
| Background Color | `#0a0a0a` (Dunkel) |
| Kategorien | Finance, Utilities |
| Scope / Start URL | `/` |

### Icons (`public/icons/`)

| Datei | Groesse | Zweck |
|-------|---------|-------|
| icon-72x72.png | 72x72 | Standard |
| icon-96x96.png | 96x96 | Standard |
| icon-128x128.png | 128x128 | Standard |
| icon-144x144.png | 144x144 | Standard |
| icon-152x152.png | 152x152 | Standard |
| icon-192x192.png | 192x192 | Standard + Maskable |
| icon-384x384.png | 384x384 | Standard |
| icon-512x512.png | 512x512 | Standard + Maskable |
| apple-touch-icon.png | 180x180 | Apple/iOS |

Maskable Icons haben dynamische Hintergruende und werden auf Android-Geraeten mit adaptiven Icon-Formen dargestellt.

### Service Worker (`public/sw.js`)

**Version:** 1.0.0 (mit Cache-Versionierung)

#### Caching-Strategie: Network-First

1. Netzwerk-Request wird zuerst versucht
2. Bei Erfolg: Antwort wird gecacht und zurueckgegeben
3. Bei Fehler: Cache-Fallback wird verwendet
4. Kein Cache vorhanden: HTTP 503 "Offline" Antwort

**Ausnahmen:** API-Aufrufe (`/api/`) werden NICHT gecacht.

#### Precaching bei Installation

Folgende Assets werden beim SW-Install vorgeladen:
- `/manifest.json`
- `/favicon.ico`
- Alle App-Icons

#### Cache-Bereinigung

Bei SW-Aktivierung werden alte Cache-Versionen automatisch geloescht.

### Layout-Metadaten (`app/layout.tsx`)

```tsx
// PWA-relevante Metadata
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Trading',
  },
  viewport: {
    themeColor: '#3b82f6',
    viewportFit: 'cover',  // Nutzt Notch-Bereich
  },
};
```

### Next.js-Konfiguration (`next.config.mjs`)

- **Header:** `Service-Worker-Allowed: /` erlaubt SW-Kontrolle ueber gesamte App
- **Cache-Control:** `no-cache, no-store, must-revalidate` fuer `/sw.js` (verhindert veraltete SW-Versionen)

### Middleware (`middleware.ts`)

- **CSP:** `worker-src 'self'` erlaubt Service Worker vom gleichen Origin
- **Auth-Exclusion:** `sw.js` und `manifest.json` sind von der Auth-Middleware ausgenommen

## Installation

### Android / Chrome

1. App im Browser oeffnen
2. Browser zeigt automatisch "Zum Startbildschirm hinzufuegen" Banner
3. Alternativ: Menue (drei Punkte) -> "App installieren"

### iOS / Safari

1. App im Browser oeffnen
2. Teilen-Button antippen
3. "Zum Home-Bildschirm" waehlen

Die App erkennt iOS-Geraete und zeigt eine Installationsanleitung an, wenn die App noch nicht als PWA installiert ist (`usePushNotifications` Hook mit `needsInstall` Flag).

## Offline-Verhalten

| Ressource | Offline-Verfuegbarkeit |
|-----------|----------------------|
| Statische Seiten | Ja (nach erstem Besuch gecacht) |
| App-Shell (HTML/CSS/JS) | Ja |
| Icons & Manifest | Ja (precached) |
| API-Daten (`/api/*`) | Nein (nicht gecacht) |
| Kursdaten | Nein (erfordert Netzwerk) |

## Einschraenkungen

- Kein Periodic Background Sync
- Kein Workbox (manueller Service Worker)
- Keine IndexedDB fuer Offline-Daten
- Keine Web App Shortcuts
- Keine Share Target API
- API-Daten sind offline nicht verfuegbar
