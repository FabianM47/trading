# Supabase Integration für Trading Portfolio

Dieses Dokument beschreibt die Integration von Supabase als Datenbank-Backend für benutzerspezifische Trade-Speicherung.

## Übersicht

Die Anwendung verwendet Supabase als zentrale Datenbank, um Trades benutzerspezifisch zu speichern. Jeder Benutzer sieht nur seine eigenen Trades, gesichert durch Row Level Security (RLS).

## Setup-Anleitung

### 1. Supabase-Projekt erstellen

1. Gehe zu [Supabase](https://supabase.com) und erstelle ein neues Projekt
2. Wähle eine Region in deiner Nähe
3. Setze ein sicheres Datenbankpasswort

### 2. Datenbank-Schema einrichten

Führe die SQL-Migration in deinem Supabase-Projekt aus:

1. Öffne den SQL Editor in Supabase Dashboard
2. Kopiere den Inhalt der Datei `scripts/supabase-migration.sql`
3. Führe das SQL aus

Die Migration erstellt:
- ✅ `trades` Tabelle mit allen notwendigen Feldern
- ✅ Indizes für schnellere Abfragen
- ✅ Row Level Security (RLS) Policies
- ✅ Automatische `updated_at` Trigger

### 3. Umgebungsvariablen konfigurieren

#### Lokale Entwicklung (.env.local)

Erstelle eine `.env.local` Datei im Projektverzeichnis:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Logto Configuration (bestehend)
LOGTO_ENDPOINT=...
LOGTO_APP_ID=...
LOGTO_APP_SECRET=...
LOGTO_COOKIE_SECRET=...
```

**Wo finde ich die Supabase-Werte?**

1. Gehe zu deinem Supabase-Projekt
2. Klicke auf "Settings" > "API"
3. Kopiere:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Wichtig:** Der `service_role` Key hat Admin-Rechte und sollte **NIE** im Frontend verwendet werden!

#### Vercel Deployment

Füge die Umgebungsvariablen in Vercel hinzu:

1. Gehe zu deinem Vercel-Projekt
2. Navigiere zu "Settings" > "Environment Variables"
3. Füge die folgenden Variablen hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Wähle "Production", "Preview" und "Development" aus
5. Klicke auf "Save"

### 4. Vercel-Supabase Integration (Optional)

Alternativ kannst du die Supabase-Integration in Vercel nutzen:

1. Gehe zu deinem Vercel-Projekt
2. Klicke auf "Integrations"
3. Suche nach "Supabase" und klicke auf "Add"
4. Verbinde dein Supabase-Projekt
5. Die Umgebungsvariablen werden automatisch gesetzt

## Architektur

### Datenfluss

```
Frontend (page.tsx)
    ↓
API Storage Layer (lib/apiStorage.ts)
    ↓
API Routes (/api/trades/route.ts)
    ↓
Logto Authentication
    ↓
Supabase Client (lib/supabase.ts)
    ↓
Supabase Database (RLS-gesichert)
```

### API Endpoints

#### GET /api/trades
Lädt alle Trades des authentifizierten Benutzers.

**Response:**
```json
{
  "trades": [
    {
      "id": "uuid",
      "isin": "DE000...",
      "name": "Apple Inc.",
      "buyPrice": 150.00,
      "quantity": 10,
      ...
    }
  ]
}
```

#### POST /api/trades
Erstellt einen neuen Trade.

**Request Body:**
```json
{
  "id": "uuid",
  "isin": "DE000...",
  "name": "Apple Inc.",
  "buyPrice": 150.00,
  "quantity": 10,
  "investedEur": 1500.00,
  "buyDate": "2024-01-15T10:00:00Z"
}
```

#### PUT /api/trades
Aktualisiert einen bestehenden Trade.

**Request Body:** Vollständiges Trade-Objekt

#### DELETE /api/trades?id={tradeId}
Löscht einen Trade.

**Query Parameter:** `id` (Trade ID)

### Row Level Security (RLS)

Die Datenbank verwendet RLS, um sicherzustellen, dass Benutzer nur ihre eigenen Trades sehen und bearbeiten können:

```sql
-- Beispiel-Policy
CREATE POLICY "Users can view their own trades"
  ON trades
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));
```

**Wichtig:** Der `user_id` wird automatisch aus dem Logto-Token extrahiert und mit jedem Request gesetzt.

## Datenmigration von localStorage

Wenn du bereits Trades im localStorage hast, kannst du diese migrieren:

1. Exportiere deine Trades (falls eine Export-Funktion verfügbar ist)
2. Melde dich in der Anwendung an
3. Importiere die Trades über die Import-Funktion

Die Trades werden dann in der Datenbank gespeichert.

## Sicherheit

### Best Practices

✅ **Service Role Key** wird nur server-seitig verwendet
✅ **RLS Policies** verhindern Cross-User-Zugriffe
✅ **Logto Authentication** sichert alle API-Endpoints
✅ **HTTPS** für alle Verbindungen (Supabase & Vercel)

### Wichtige Hinweise

⚠️ **NIE** den `SUPABASE_SERVICE_ROLE_KEY` im Frontend-Code verwenden!
⚠️ Alle API Routes prüfen die Authentifizierung vor jedem Datenzugriff
⚠️ RLS ist auf Datenbankebene aktiv als zusätzliche Sicherheitsebene

## Troubleshooting

### Fehler: "Unauthorized" beim Laden der Trades

**Lösung:** Stelle sicher, dass du eingeloggt bist. Die Trades-API erfordert eine gültige Logto-Session.

### Fehler: "Failed to fetch trades"

**Lösung:** 
1. Prüfe die Umgebungsvariablen in Vercel
2. Stelle sicher, dass die Supabase-Migration ausgeführt wurde
3. Überprüfe die Supabase-Logs im Dashboard

### Trades werden nicht angezeigt

**Lösung:**
1. Öffne die Browser-DevTools (F12) und prüfe die Console
2. Prüfe die Network-Tab für API-Fehler
3. Stelle sicher, dass RLS-Policies korrekt eingerichtet sind

### Performance-Probleme

**Lösung:**
1. Prüfe ob die Indizes in der Datenbank existieren
2. Verwende die Supabase-Performance-Insights im Dashboard
3. Erwäge Caching mit SWR (bereits implementiert für Quotes)

## Support

Bei Problemen:
1. Prüfe die Supabase-Logs im Dashboard
2. Prüfe die Vercel-Logs
3. Kontaktiere den Support

## Weiterführende Links

- [Supabase Dokumentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Logto Dokumentation](https://docs.logto.io)
