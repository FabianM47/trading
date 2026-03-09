# Push Notifications & Preis-Alerts

## Uebersicht

Die App unterstuetzt Web Push Notifications fuer Preis-Alerts. Nutzer koennen Zielpreise fuer Wertpapiere setzen und werden per Push-Benachrichtigung informiert, wenn der Kurs den Schwellwert erreicht. Die Pruefung erfolgt ueber einen Cron-Endpunkt.

## Architektur

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Browser    │     │    Next.js API    │     │    Supabase DB   │
│             │     │                  │     │                  │
│  usePush-   │────>│ /api/push/       │────>│ push_            │
│  Notifications│   │   subscribe      │     │   subscriptions  │
│             │     │   vapid-key      │     │                  │
│  PriceAlert │────>│ /api/alerts      │────>│ price_alerts     │
│  Modal      │     │                  │     │                  │
└─────────────┘     └──────────────────┘     └──────────────────┘
                           │
                    ┌──────┴──────┐
                    │ /api/alerts │     ┌──────────────┐
                    │   /check    │────>│  web-push    │
                    │  (Cron)     │     │  Library     │
                    └─────────────┘     └──────┬───────┘
                                               │
                                        ┌──────┴───────┐
                                        │ Push Service │
                                        │ (FCM/APNs)   │
                                        └──────┬───────┘
                                               │
                                        ┌──────┴───────┐
                                        │  Service     │
                                        │  Worker      │
                                        │  (sw.js)     │
                                        └──────────────┘
```

## Ablauf

### 1. Push-Subscription

```
Nutzer aktiviert Push-Benachrichtigungen:
  1. usePushNotifications Hook registriert Service Worker
  2. Browser fragt Notification-Permission ab
  3. Hook holt VAPID Public Key von /api/push/vapid-key
  4. PushManager.subscribe() erstellt Subscription
  5. POST /api/push/subscribe speichert Subscription in DB
```

### 2. Alert-Erstellung

```
Nutzer erstellt Preis-Alert:
  1. PriceAlertModal: ISIN, Ticker, Name, Zielpreis, Richtung, Wiederholung
  2. POST /api/alerts speichert Alert in DB
```

### 3. Alert-Pruefung (Cron)

```
Cron ruft /api/alerts/check auf:
  1. Alle aktiven Alerts aus DB laden
  2. Aktuelle Kurse fuer alle ISINs abrufen (Waterfall-Provider)
  3. Preise in EUR umrechnen (Wechselkurs-Cache)
  4. Pruefen: Kurs ueber/unter Zielpreis?
  5. Bei Trigger:
     a. Push-Subscriptions des Nutzers laden
     b. Push-Notification senden via web-push
     c. Abgelaufene Subscriptions bereinigen
     d. Alert-Status aktualisieren
```

## Dateien

### Client-Side

#### `lib/usePushNotifications.ts` - React Hook

**Exportierter State:**

| Property | Typ | Beschreibung |
|----------|-----|-------------|
| `isSupported` | boolean | Browser unterstuetzt Push |
| `isSubscribed` | boolean | Aktuell abonniert |
| `isPending` | boolean | Operation laeuft |
| `permission` | NotificationPermission | `granted` / `denied` / `default` |
| `needsInstall` | boolean | iOS: App muss erst als PWA installiert werden |
| `subscribe()` | async function | Push-Abo aktivieren |
| `unsubscribe()` | async function | Push-Abo deaktivieren |

**Browser-Kompatibilitaet:**

Prueft auf Verfuegbarkeit von:
- `navigator.serviceWorker`
- `window.PushManager`
- `window.Notification`

**iOS-Erkennung:**

Erkennt ob die App als PWA auf iOS installiert ist ueber `window.matchMedia('(display-mode: standalone)')`. Push-Notifications funktionieren auf iOS nur im PWA-Modus.

#### `public/sw.js` - Service Worker Push Handler

**Push Event:**
- Empfaengt Push-Payload (JSON oder Text)
- Zeigt Notification mit Titel, Body, Icon, Badge
- Standard-Tag: `price-alert` (gruppiert Benachrichtigungen)

**Notification Click:**
- Schliesst Notification
- Oeffnet/fokussiert App-Fenster
- Navigiert zu URL aus Notification-Daten (falls vorhanden)

#### `components/PriceAlertModal.tsx` - Alert-UI

- Modal zum Erstellen und Verwalten von Preis-Alerts
- Zeigt aktive und inaktive Alerts
- Formular: ISIN, Ticker, Name, Zielpreis, Richtung (ueber/unter), Wiederholung
- Prefill-Support bei Erstellung aus Positions-Detail

### Server-Side

#### `lib/webPush.ts` - Push-Versand

**Konfiguration:**
```
VAPID Details:
  - Subject: VAPID_SUBJECT (mailto:...)
  - Public Key: NEXT_PUBLIC_VAPID_PUBLIC_KEY
  - Private Key: VAPID_PRIVATE_KEY
```

**Funktionen:**

| Funktion | Beschreibung |
|----------|-------------|
| `sendPushNotification(subscription, payload)` | Einzelne Notification senden |
| `sendPushToUser(userId, payload)` | Alle Subscriptions eines Nutzers benachrichtigen |

**Payload-Interface:**
```typescript
{
  title: string;       // Pflicht
  body: string;        // Pflicht
  icon?: string;       // App-Icon
  badge?: string;      // Badge-Icon
  url?: string;        // Ziel-URL bei Klick
  tag?: string;        // Gruppierung
}
```

**Fehlerbehandlung:**
- HTTP 410 Gone / 404: Subscription als abgelaufen markiert -> wird bereinigt
- Andere Fehler: Geloggt mit statusCode und Body

**Push-Optionen:**
- TTL: 3600 Sekunden (1 Stunde)
- Urgency: `high`

#### `app/api/push/subscribe/route.ts` - Subscription-API

**POST** - Subscription speichern:
- Auth: Logto (authentifizierter Nutzer erforderlich)
- Validierung: Zod-Schema (endpoint, p256dh, auth, userAgent)
- Upsert: Aktualisiert bestehende Subscription falls Endpoint bereits existiert

**DELETE** - Subscription loeschen:
- Auth: Logto
- Loescht nach user_id + endpoint

#### `app/api/push/vapid-key/route.ts` - VAPID Key

**GET** - Oeffentlicher VAPID Key:
- Kein Auth erforderlich
- Gibt `{ publicKey: string }` zurueck

#### `app/api/alerts/check/route.ts` - Cron-Pruefung

**GET** - Alerts pruefen und Notifications senden:

**Authentifizierung** (eines von beiden):
- `x-vercel-cron-secret` Header (Vercel Cron)
- `x-api-key` Header (ALERTS_API_KEY, Timing-Safe-Vergleich)

**Rate Limiting:** Max 5 Requests/Minute pro IP

**Cooldown:** 60 Minuten fuer wiederholende Alerts (verhindert Spam)

**Notification-Inhalt:**
```
Titel: "🔔 {alert.name}"
Body:  "Kurs ↑ ueber {target}: Aktuell {currentPrice}"
       "Kurs ↓ unter {target}: Aktuell {currentPrice}"
Tag:   "alert-{alertId}"
```

**Response:**
```json
{
  "checked": 10,
  "triggered": 2,
  "notificationsSent": 2
}
```

#### `app/api/alerts/route.ts` - Alert CRUD

- **GET**: Alle Alerts des Nutzers laden
- **POST**: Neuen Alert erstellen
- **PATCH**: Alert aktualisieren (z.B. aktivieren/deaktivieren)
- **DELETE**: Alert loeschen

## Datenbank

### Tabelle: `push_subscriptions`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primary Key |
| user_id | TEXT | Logto User ID (Index) |
| endpoint | TEXT | Push Service URL |
| p256dh | TEXT | Kryptografischer Schluessel |
| auth | TEXT | Kryptografischer Schluessel |
| user_agent | TEXT | Browser/Geraet |
| created_at | TIMESTAMPTZ | Erstellt am |
| updated_at | TIMESTAMPTZ | Aktualisiert am |

**Unique Constraint:** `(user_id, endpoint)` - Ein Endpoint pro Nutzer pro Geraet.

**RLS:** Nutzer koennen nur eigene Subscriptions lesen/schreiben.

### Tabelle: `price_alerts`

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID | Primary Key |
| user_id | TEXT | Logto User ID (Index) |
| isin | TEXT | Wertpapier-ISIN |
| ticker | TEXT | Ticker-Symbol |
| name | TEXT | Alert-Name |
| target_price | DECIMAL | Zielpreis |
| direction | TEXT | `above` oder `below` |
| is_active | BOOLEAN | Aktiv/Inaktiv |
| triggered_at | TIMESTAMPTZ | Letzter Trigger |
| last_checked_price | DECIMAL | Letzter gepruefter Kurs |
| last_checked_at | TIMESTAMPTZ | Letzte Pruefung |
| repeat | BOOLEAN | Wiederholend (mit Cooldown) |
| created_at | TIMESTAMPTZ | Erstellt am |
| updated_at | TIMESTAMPTZ | Auto-Update via Trigger |

**Indizes:** `user_id`, `(user_id, is_active)`, `isin`

**RLS:** Nutzer koennen nur eigene Alerts lesen/schreiben.

**Migration:** `scripts/pwa-migration.sql`

## Umgebungsvariablen

| Variable | Sichtbarkeit | Beschreibung |
|----------|-------------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + Server | VAPID Public Key |
| `VAPID_PRIVATE_KEY` | Nur Server | VAPID Private Key (geheim!) |
| `VAPID_SUBJECT` | Nur Server | mailto: fuer Push Service |
| `ALERTS_API_KEY` | Nur Server | API-Key fuer Cron-Endpunkt |
| `CRON_SECRET` | Nur Server | Vercel Cron Secret |

**VAPID Keys generieren:**
```bash
npx web-push generate-vapid-keys
```

## TypeScript-Typen (`types/index.ts`)

```typescript
interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

interface PriceAlert {
  id: string;
  userId: string;
  isin: string;
  ticker: string;
  name: string;
  targetPrice: number;
  direction: 'above' | 'below';
  isActive: boolean;
  triggeredAt: string | null;
  lastCheckedPrice: number | null;
  lastCheckedAt: string | null;
  repeat: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreatePriceAlertInput {
  isin: string;
  ticker: string;
  name: string;
  targetPrice: number;
  direction: 'above' | 'below';
  repeat: boolean;
}
```

## UI-Integration (`app/page.tsx`)

- **Push-Toggle:** Ein/Aus-Schalter in den Einstellungen
- **iOS Install-Hinweis:** Zeigt Anleitung wenn `needsInstall` aktiv ist
- **Status-Anzeige:** Gruen wenn aktiv, Grau wenn inaktiv
- **Loading-State:** Waehrend Subscribe/Unsubscribe-Vorgang
