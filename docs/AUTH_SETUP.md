# Logto Authentication Setup

## Installation

```bash
npm install @logto/next
```

## Environment Variables

Kopieren Sie `.env.local.auth-template` zu `.env.local` und füllen Sie die Werte aus:

```bash
cp .env.local.auth-template .env.local
```

Erforderliche Variablen:

```env
# Logto App Configuration
LOGTO_ENDPOINT=https://jmmn7z.logto.app/
LOGTO_APP_ID=2o2p7jn5oufvv103lui8m
LOGTO_APP_SECRET=<get-from-logto-console>
LOGTO_COOKIE_SECRET=<generate-random-32-chars>

# App Base URL
# Development:
APP_BASE_URL=http://localhost:3000

# Production:
# APP_BASE_URL=https://trading.fabianmaucher.de
```

### Signing Keys aus Logto Console

Logto stellt dir **zwei Keys** bereit (beide unter "Signing keys"):

#### 1️⃣ OIDC Private Key (für App Secret)

```
1. Öffne: https://jmmn7z.logto.app/
2. Applications → Deine App (2o2p7jn5oufvv103lui8m)
3. Tab "Signing keys"
4. Unter "OIDC PRIVATE KEYS" findest du die Key-ID (z.B. saeky8c29v6nnr2bzs4q5)
5. Kopiere die ID
```

In `.env.local`:
```env
LOGTO_APP_SECRET=saeky8c29v6nnr2bzs4q5
```

#### 2️⃣ OIDC Cookie Key (für Cookie Secret)

```
1. Gleiche Seite, scrolle runter zu "OIDC COOKIE KEYS"
2. Kopiere die Key-ID (z.B. 3v613c3e41fgcwn5j4v1z)
```

In `.env.local`:
```env
LOGTO_COOKIE_SECRET=3v613c3e41fgcwn5j4v1z
```

⚠️ **Wichtig:**
- Kopiere die **Key-ID** (z.B. `saeky8c...`), nicht den Label-Text
- Diese Keys können über "Rotate private keys" / "Rotate cookie keys" erneuert werden
- Nach Rotation musst du die neuen Keys in `.env.local` eintragen

## Logto Console Configuration

### Redirect URIs (Sign-in callback)

In der Logto Admin Console unter "Application Details" → "Redirect URIs" hinzufügen:

- **Development**: `http://localhost:3000/api/logto/callback`
- **Production**: `https://trading.fabianmaucher.de/api/logto/callback`

### Post Sign-out Redirect URIs

In der Logto Admin Console unter "Application Details" → "Post sign-out redirect URIs" hinzufügen:

- **Development**: `http://localhost:3000/`
- **Production**: `https://trading.fabianmaucher.de/`

## Verwendung

### Login

```tsx
<a href="/api/logto/sign-in">Login</a>
```

### Logout

```tsx
<a href="/api/logto/sign-out">Logout</a>
```

### Geschützte Seiten

```tsx
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function ProtectedPage() {
  return (
    <RequireAuth>
      <div>Geschützter Inhalt</div>
    </RequireAuth>
  );
}
```

### User Info abrufen

```tsx
import { getLogtoContext } from '@logto/next/server-actions';

export default async function Page() {
  const { claims } = await getLogtoContext();
  
  return <div>Hallo {claims?.name}</div>;
}
```

## Architektur

```
lib/auth/
  └── logto-config.ts       # Zentrale Konfiguration

app/api/logto/
  ├── sign-in/route.ts      # Login initiieren
  ├── sign-out/route.ts     # Logout initiieren  
  ├── callback/route.ts     # OIDC Callback Handler
  └── user/route.ts         # User Claims API

components/auth/
  ├── RequireAuth.tsx       # Protected Route Guard
  └── AuthButton.tsx        # Login/Logout Buttons
```

## Security Checklist

- [x] Keine Secrets im Code (nur ENV)
- [x] Fail-fast bei fehlenden ENV vars
- [x] Cookie Secret min. 32 Zeichen
- [x] HTTPS in Production (APP_BASE_URL)
- [x] Redirect URIs whitelist in Logto
- [x] CSRF Protection via Logto SDK
- [x] Secure cookies (httpOnly, sameSite)

## Troubleshooting

### "Invalid redirect_uri"

→ Prüfen Sie ob die Callback URL exakt in Logto Console eingetragen ist

### "Cookie secret must be at least 32 characters"

→ Generieren Sie ein neues LOGTO_COOKIE_SECRET (siehe oben)

### Login redirect loop

→ Prüfen Sie APP_BASE_URL (muss mit deployed URL übereinstimmen)
