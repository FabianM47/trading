# Login-Pflicht für Trading Portfolio

## Änderungen

Die Trading-Portfolio-Anwendung erfordert jetzt eine Authentifizierung für **alle** Routen, einschließlich der Homepage.

## Was wurde geändert?

### 1. Middleware (`middleware.ts`)

**Vorher:**
- Homepage (`/`) war öffentlich zugänglich
- Nur `/me` und API-Routes waren geschützt

**Nachher:**
- **Alle** Routen erfordern Authentifizierung (außer `/api/logto/*` und `/callback`)
- Homepage (`/`) ist jetzt geschützt
- Nicht authentifizierte Benutzer werden automatisch zu `/api/logto/sign-in` umgeleitet
- CSP um Supabase-Domain erweitert (`https://*.supabase.co`)

### 2. Homepage (`app/page.tsx`)

**Neue Features:**
- ✅ Client-seitiger Auth-Check beim Laden
- ✅ Loading-Spinner während der Authentifizierung
- ✅ Trades werden nur geladen, wenn Benutzer authentifiziert ist
- ✅ Automatische Umleitung zum Login bei fehlender Authentifizierung

## Benutzer-Flow

```
1. Benutzer ruft http://localhost:3000/ auf
   ↓
2. Middleware prüft Authentifizierung
   ↓
3a. ❌ Nicht authentifiziert
   → Redirect zu /api/logto/sign-in
   → Logto Login-Seite
   → Nach erfolgreicher Anmeldung zurück zur Homepage
   
3b. ✅ Authentifiziert
   → Homepage lädt
   → Client-seitiger Auth-Check (für UX)
   → Loading-Spinner wird angezeigt
   → Trades werden geladen
   → Portfolio wird angezeigt
```

## Sicherheitsebenen

Die Anwendung hat jetzt **drei Sicherheitsebenen**:

### 1. Middleware-Ebene (Server-seitig)
- Prüft Authentifizierung **vor** dem Rendern der Seite
- Leitet nicht authentifizierte Benutzer um
- **Verhindert** Zugriff auf geschützte Routen

### 2. API-Ebene (Server-seitig)
- Jede API-Route (`/api/trades`) prüft die Authentifizierung
- Extrahiert `user_id` aus Logto-Token
- **Verhindert** Datenzugriff ohne gültiges Token

### 3. Datenbank-Ebene (Supabase)
- Row Level Security (RLS) Policies
- **Verhindert** Cross-User-Zugriffe auch bei kompromittierten Tokens

## Öffentliche Routen

Nur folgende Routen sind öffentlich zugänglich:

| Route | Zweck |
|-------|-------|
| `/api/logto/sign-in` | Login initiieren |
| `/api/logto/sign-out` | Logout initiieren |
| `/api/logto/callback` | OAuth-Callback |
| `/api/logto/user` | User-Info abfragen |
| `/callback` | Legacy-Callback-Route |

**Alle anderen Routen** erfordern eine gültige Logto-Session.

## Testing

### Lokales Testing

1. **Als nicht authentifizierter Benutzer:**
   ```bash
   # Im Inkognito-Modus öffnen
   http://localhost:3000/
   ```
   ✅ Erwartet: Automatische Weiterleitung zur Logto-Login-Seite

2. **Als authentifizierter Benutzer:**
   ```bash
   # Nach Login
   http://localhost:3000/
   ```
   ✅ Erwartet: 
   - Loading-Spinner erscheint kurz
   - Portfolio wird geladen
   - Trades werden angezeigt

3. **API-Zugriff ohne Auth:**
   ```bash
   curl http://localhost:3000/api/trades
   ```
   ✅ Erwartet: 401 Unauthorized

### Production Testing

Nach dem Deployment auf Vercel:

1. Öffne https://your-domain.com im Inkognito-Modus
2. Erwarte Weiterleitung zur Logto-Login-Seite
3. Nach Login sollte Portfolio sichtbar sein

## Troubleshooting

### Problem: Redirect-Loop

**Symptom:** Seite lädt endlos neu oder springt zwischen Login und Homepage

**Lösung:**
1. Prüfe Logto-Konfiguration in `.env.local`:
   ```env
   LOGTO_ENDPOINT=https://jmmn7z.logto.app/
   LOGTO_APP_ID=...
   LOGTO_APP_SECRET=...
   LOGTO_COOKIE_SECRET=... (min. 64 Zeichen)
   ```

2. Stelle sicher, dass die Redirect-URIs in Logto Console korrekt sind:
   - Development: `http://localhost:3000/api/logto/callback`
   - Production: `https://your-domain.com/api/logto/callback`

3. Lösche Browser-Cookies und versuche erneut

### Problem: "Unauthorized" trotz Login

**Symptom:** Nach erfolgreichem Login wird "401 Unauthorized" angezeigt

**Lösung:**
1. Prüfe ob Logto-Session-Cookie gesetzt ist (DevTools > Application > Cookies)
2. Stelle sicher, dass `LOGTO_COOKIE_SECRET` korrekt gesetzt ist
3. Prüfe Middleware-Logs in Vercel Function Logs

### Problem: Trades werden nicht geladen

**Symptom:** Loading-Spinner verschwindet, aber keine Trades werden angezeigt

**Lösung:**
1. Prüfe Browser-Console auf API-Fehler
2. Stelle sicher, dass Supabase-Variablen korrekt gesetzt sind:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Prüfe ob Supabase-Migration ausgeführt wurde

## Migration von bestehenden Deployments

Wenn du bereits eine Version ohne Login-Pflicht deployed hast:

1. **Code aktualisieren:**
   ```bash
   git pull origin main
   ```

2. **Umgebungsvariablen prüfen:**
   - Vercel Dashboard > Settings > Environment Variables
   - Stelle sicher, dass alle Logto- und Supabase-Variablen gesetzt sind

3. **Neu deployen:**
   ```bash
   git push
   ```

4. **Benutzer informieren:**
   - Alle Benutzer müssen sich beim nächsten Besuch neu anmelden
   - Ihre Trades bleiben in der Datenbank erhalten

## Security Best Practices

✅ **Verwende HTTPS in Production**
- Logto erfordert HTTPS für OAuth-Callback
- Vercel stellt automatisch HTTPS bereit

✅ **Sichere Cookie-Secrets**
- `LOGTO_COOKIE_SECRET` sollte min. 64 Zeichen haben
- Verwende `node scripts/generate-secrets.js` zum Generieren

✅ **Vertrauenswürdige Domains**
- Nur deine Vercel-Domain in Logto-Console eintragen
- Keine Wildcard-Domains verwenden

✅ **Regelmäßige Updates**
- Halte `@logto/next` auf dem neuesten Stand
- Prüfe regelmäßig auf Sicherheitsupdates

## Weiterführende Dokumentation

- [Logto Next.js Integration](https://docs.logto.io/docs/recipes/integrate-logto/next-js/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Zusammenfassung

🔒 **Alle Routen sind jetzt geschützt** - Benutzer müssen sich anmelden, um das Portfolio zu sehen

🚀 **Bessere UX** - Loading-Spinner während der Authentifizierung

🛡️ **Dreifache Sicherheit** - Middleware + API + Datenbank-Ebene

✅ **Production-Ready** - Getestet mit Logto und Supabase
