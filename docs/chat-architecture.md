# Chat-Architektur

Globaler Chat-Raum fuer alle authentifizierten Benutzer mit Echtzeit-Updates.

## Uebersicht

```
Browser                          Server                         Supabase
┌─────────────┐     REST API     ┌──────────────┐    SQL/RLS    ┌──────────────┐
│ chat/page   │ ───────────────► │ /api/chat/*  │ ────────────► │ chat_users   │
│             │                  │              │               │ chat_messages│
│ Realtime WS │ ◄═══════════════════════════════════════════════│ Publication  │
└─────────────┘    Supabase WS   └──────────────┘               └──────────────┘
```

## Datenbankschema

**`chat_users`** — Benutzerverzeichnis (sync mit Logto)

| Spalte         | Typ                        | Beschreibung       |
|----------------|----------------------------|--------------------|
| `user_id`      | TEXT (PK)                  | Logto User ID      |
| `username`     | TEXT (UNIQUE, NOT NULL)     | Anzeigename        |
| `last_seen_at` | TIMESTAMP WITH TIME ZONE   | Letzte Aktivitaet  |
| `created_at`   | TIMESTAMP WITH TIME ZONE   | Erstellt           |

**`chat_messages`** — Globale Nachrichten

| Spalte       | Typ                        | Beschreibung               |
|--------------|----------------------------|----------------------------|
| `id`         | UUID (PK)                  | Auto-generiert             |
| `sender_id`  | TEXT (FK → chat_users)     | Absender                   |
| `content`    | TEXT (1–2000 Zeichen)      | Nachrichteninhalt          |
| `created_at` | TIMESTAMP WITH TIME ZONE   | Zeitstempel                |

**RLS-Policies:**
- SELECT: offen (noetig fuer Realtime + Anon-Key)
- INSERT/UPDATE: nur `service_role` (Server-seitige API-Routes)

**Realtime:** `chat_messages` ist zur `supabase_realtime`-Publication hinzugefuegt.

Schema-Migration: `scripts/chat-migration.sql`

## Dateien

### Frontend (Hooks + Components)

| Datei | Zweck |
|-------|-------|
| `app/chat/page.tsx` | Chat-Page Orchestrator (~260 Zeilen) |
| `hooks/useChatAuth.ts` | Auth-Check, Username-State, Redirect |
| `hooks/useChatMessages.ts` | Messages-State, Pagination, Optimistic Updates, Fehlerbehandlung |
| `hooks/useChatRealtime.ts` | Supabase WebSocket Subscription + Username-Refetch |
| `hooks/useChatScroll.ts` | Auto-Scroll + Infinite Scroll |
| `hooks/useMentionAutocomplete.ts` | @Mention-Erkennung, Navigation, Einfuegen |
| `components/chat/MessageContent.tsx` | Nachrichtentext mit Links, @Mentions, URL-Sanitierung |
| `components/UsernameModal.tsx` | Modal zum Setzen des Benutzernamens |

### Backend (API + Data)

| Datei | Zweck |
|-------|-------|
| `app/api/chat/messages/route.ts` | GET (Nachrichten laden) + POST (senden, mit Rate Limiting) |
| `app/api/chat/users/route.ts` | GET (User-Liste fuer @Mention) |
| `app/api/logto/user/route.ts` | GET (Auth-Check) + PATCH (Username setzen) |
| `lib/chatStore.ts` | Daten-Zugriff (Supabase oder In-Memory-Fallback) |
| `lib/chat.ts` | Re-Export von `upsertChatUser` |
| `lib/rateLimit.ts` | In-Memory Rate Limiter (Sliding Window) |
| `lib/supabaseClient.ts` | Browser-seitiger Supabase-Client fuer Realtime |
| `lib/auth/logto-management.ts` | Logto Management API (M2M) fuer Username-Sync |

## Ablauf

### 1. Authentifizierung & Username

```
Login → GET /api/logto/user
  ├─ username vorhanden → Chat laden
  └─ username fehlt → UsernameModal anzeigen
       └─ PATCH /api/logto/user { username }
            ├─ Logto Management API: Username setzen
            └─ Supabase: chat_users upsert
```

### 2. Nachrichten laden (Pagination)

```
GET /api/chat/messages?limit=50
GET /api/chat/messages?limit=50&before=<aeltester_timestamp>  (Scroll nach oben)
```

- Neueste 50 Nachrichten beim Laden
- Infinite Scroll nach oben laedt aeltere Nachrichten
- Scroll-Position bleibt beim Nachladen erhalten
- Datums-Trennlinien ("Heute", "Gestern", "DD.MM.YYYY") zwischen Tagen

### 3. Nachricht senden

```
Eingabe → Optimistic Update (temp-ID) → POST /api/chat/messages { content }
  ├─ Erfolg: temp-Nachricht durch echte ersetzen
  └─ Fehler: temp-Nachricht entfernen, Eingabe wiederherstellen, Fehlermeldung anzeigen
```

Server-seitig beim POST:
1. Rate Limiting pruefen (max 5 Nachrichten / 10 Sekunden pro User)
2. Username aus `chat_users` lesen (kein externer API-Call)
3. Nachricht in `chat_messages` einfuegen (1 DB-Query)
4. Supabase Realtime broadcastet automatisch an alle Subscriber

### 4. Echtzeit-Updates (WebSocket)

```typescript
supabase
  .channel('chat_messages_realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, callback)
  .subscribe();
```

- Browser subscribed ueber Supabase Anon-Key
- Eigene Nachrichten werden ignoriert (bereits via Optimistic Update angezeigt)
- Deduplizierung ueber `message.id`
- Auto-Scroll nur wenn User am Ende des Chats ist (< 150px)
- Bei unbekanntem Sender: User-Liste automatisch neu laden (throttled, max 1x/10s)

### 5. @Mention-Autocomplete

- `GET /api/chat/users` laedt alle Benutzer
- `@`-Zeichen loest Autocomplete aus
- Filtert User-Liste nach Praefix (case-insensitive)
- Max. 5 Vorschlaege, Navigation mit Pfeiltasten
- Tab/Enter fuegt `@username ` ein

## Frontend-Architektur

### Hook-Komposition

```
ChatPage (Orchestrator)
  ├─ useChatAuth()          → Auth-State, Username, Redirect
  ├─ useChatMessages()      → Messages[], Pagination, Optimistic Send
  │   ├─ messagesRef        → Synchroner Zugriff auf aktuelle Nachrichten
  │   └─ isLoadingMoreRef   → Guard gegen parallele Loads
  ├─ useChatRealtime()      → Supabase WS, Username-Refetch bei "Unbekannt"
  ├─ useChatScroll()        → Auto-Scroll + Infinite Scroll Trigger
  └─ useMentionAutocomplete() → @Mention-Erkennung, Keyboard-Nav, Insert
```

### State-Management Patterns

- **Ref-basierte Guards:** `isLoadingMoreRef` und `messagesRef` verhindern Race Conditions bei Scroll-Events, da `useCallback`-Closures sonst stale State lesen wuerden
- **Optimistic Updates:** Temp-Nachrichten (`temp-xxx` ID) werden sofort angezeigt und nach Server-Response durch echte ersetzt oder bei Fehler entfernt
- **Throttled Refetch:** Bei unbekannten Sendern in Realtime-Nachrichten wird die User-Liste max 1x/10s neu geladen und bestehende "Unbekannt"-Eintraege retroaktiv gepatcht
- **Auto-Grow Textarea:** Hoehe passt sich dynamisch an (max 4 Zeilen / 96px), Reset nach Senden

### Eingabe

- `<textarea>` mit `rows={1}`, Auto-Grow via `scrollHeight`
- Shift+Enter fuer Zeilenumbruch, Enter zum Senden
- Max 2000 Zeichen (Client + Server validiert)

## Daten-Zugriff (chatStore.ts)

Dual-Mode Architektur:

| Modus | Wann | Persistenz |
|-------|------|------------|
| **Supabase** | Supabase konfiguriert + `chat_users`-Tabelle vorhanden | Dauerhaft |
| **In-Memory** | Kein Supabase oder Tabelle fehlt | Nur zur Laufzeit (max 1000 Nachrichten) |

Modus wird beim ersten Zugriff automatisch erkannt und gecacht.

### API-Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| `upsertUser(userId, username)` | User anlegen/aktualisieren (Auth-Flow) |
| `getUsernameByUserId(userId)` | Username fuer einen User lesen (POST-Handler) |
| `getMessages(limit, before?)` | Nachrichten mit Pagination + Username-Join |
| `sendMessage(senderId, content, senderUsername)` | Nachricht einfuegen (1 Query, Username wird uebergeben) |
| `getChatUsers()` | Alle User laden (fuer @Mention) |

## Sicherheit

- **API-Routes:** Alle Endpoints pruefen Logto-Authentifizierung
- **Rate Limiting:** Max 5 Nachrichten pro 10 Sekunden pro User (In-Memory Sliding Window)
- **RLS:** Schreibzugriff nur mit `service_role`-Key (Server-seitig)
- **Validierung:** Zod-Schema fuer Nachrichteninhalt (1–2000 Zeichen)
- **URL-Sanitierung:** URLs in Nachrichten werden via `new URL()` + Protokoll-Whitelist validiert
- **Username:** Regex `/^[a-zA-Z0-9_]{3,20}$/`, Unique-Constraint in Logto + Supabase
- **M2M-Token:** Gecacht mit 60s Buffer, Deduplizierung bei parallelen Requests
