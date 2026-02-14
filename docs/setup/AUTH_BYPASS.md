# 🔓 Auth Bypass für Entwicklung

## Übersicht

Für die lokale Entwicklung kann die Authentifizierung komplett deaktiviert werden. Dies ist nützlich, wenn Sie schnell Features testen möchten, ohne sich jedes Mal einloggen zu müssen.

## ⚠️ WICHTIG

**Dieser Feature-Flag sollte NIE in der Produktion aktiviert werden!**

## Aktivierung

### 1. Erstellen Sie eine `.env.local` Datei

```bash
cp .env.example .env.local
```

### 2. Setzen Sie den `DISABLE_AUTH` Flag

Fügen Sie in `.env.local` hinzu:

```bash
DISABLE_AUTH=true
```

### 3. Starten Sie den Development Server neu

```bash
pnpm dev
```

## Was passiert?

Wenn `DISABLE_AUTH=true` gesetzt ist:

- ✅ Alle Auth-Checks werden übersprungen
- ✅ Ein Mock-User wird verwendet:
  ```typescript
  {
    id: 'dev-user-id',
    email: 'dev@example.com',
    name: 'Development User'
  }
  ```
- ✅ Redirects zur Login-Seite werden verhindert
- ✅ Alle Server Actions und API Routes funktionieren ohne Login

## Betroffene Funktionen

Die folgenden Auth-Helper in `lib/auth/server.ts` werden beeinflusst:

- `getSession()` - Gibt eine Mock-Session zurück
- `getCurrentUser()` - Gibt den Mock-User zurück
- `requireAuth()` - Gibt den Mock-User zurück (ohne Redirect)
- `requireAuthWithRedirect()` - Gibt den Mock-User zurück (ohne Redirect)

## Deaktivierung

Um die Authentifizierung wieder zu aktivieren:

### Option 1: Flag ändern

```bash
DISABLE_AUTH=false
```

### Option 2: Zeile entfernen

Entfernen Sie die `DISABLE_AUTH` Zeile komplett aus `.env.local`

### Option 3: Variable löschen

```bash
# In .env.local - Zeile auskommentieren
# DISABLE_AUTH=true
```

## Testing

### Mit deaktivierter Auth

```bash
# .env.local
DISABLE_AUTH=true

# Starten
pnpm dev

# Öffnen Sie http://localhost:3000
# Sie sind automatisch eingeloggt!
```

### Mit aktivierter Auth

```bash
# .env.local
DISABLE_AUTH=false

# Starten
pnpm dev

# Öffnen Sie http://localhost:3000
# Sie werden zur Login-Seite weitergeleitet
```

## Sicherheit

### ✅ Sicher

- Verwendung in lokaler Entwicklungsumgebung
- Zum schnellen Testen von Features
- In `.env.local` (wird nicht committet)

### ❌ NIEMALS

- In `.env.example` auf `true` setzen
- In Produktion verwenden
- In Git committen
- Auf Vercel oder anderen Hosting-Plattformen aktivieren

## Beispiel: Entwicklungs-Workflow

```bash
# 1. Clone Repository
git clone https://github.com/FabianM47/trading.git

# 2. Setup .env.local
cp .env.example .env.local
echo "DISABLE_AUTH=true" >> .env.local

# 3. Install Dependencies
pnpm install

# 4. Start Dev Server
pnpm dev

# 5. Öffnen Sie Browser
# http://localhost:3000
# Sie sind automatisch eingeloggt!

# 6. Entwickeln Sie Ihre Features
# Kein Login erforderlich!

# 7. Vor dem Deployment
# Entfernen Sie DISABLE_AUTH oder setzen Sie es auf false
```

## Debugging

### Flag wird nicht erkannt?

```bash
# Überprüfen Sie die Umgebungsvariable
echo $DISABLE_AUTH

# Starten Sie den Server neu
pnpm dev
```

### Mock-User wird nicht verwendet?

Überprüfen Sie in `lib/auth/server.ts`:

```typescript
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';
console.log('🔓 Auth Bypass:', DISABLE_AUTH);
```

## Vercel Deployment

Vercel übernimmt KEINE `.env.local` Dateien automatisch. Das bedeutet:

- ✅ In Vercel ist Auth standardmäßig aktiviert
- ✅ Sie müssen den Flag manuell in Vercel setzen (NICHT empfohlen!)
- ✅ Ihre lokale `.env.local` bleibt lokal

## Weitere Informationen

- [Auth.js Documentation](https://authjs.dev)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Projekt Auth Setup](./AUTH_SETUP.md)
