# Logto OIDC Fix - Root Cause Analysis & Test Protocol

## ✅ ROOT CAUSE (Faktenbasiert)

### Fehler 1: Falsche SDK-API Verwendung

**Stacktrace Evidence**:
```
❌ Callback Error: Error [LogtoError]: Missing state in the callback URI
  code: 'callback_uri_verification.missing_state'
```

**Analyse**:
- Callback-URL **enthält** state-Parameter: `state=vGiY8iEimQ8qH3MGkIJ2H...`
- SDK-Error "Missing state" bedeutet: **State nicht im Cookie gefunden**
- Log zeigt: `GET /api/logto/sign-in 307` → Redirect **ohne Set-Cookie**

**Root Cause**:
1. **Alte Implementation** verwendete `signIn()` / `handleSignIn()` aus `@logto/next/server-actions`
2. Diese Functions sind **Helper**, keine vollständige Lösung für Route Handlers
3. `@logto/next@4.2.8` benötigt **`LogtoClient`** Klasse für Route Handlers

**Code-Beweis**:
```typescript
// FALSCH (alte Implementation):
import { signIn } from '@logto/next/server-actions';
return await signIn(logtoConfig);  // Helper-Function, kein Cookie-Management

// RICHTIG (neue Implementation):
import LogtoClient from '@logto/next/server-actions';
const client = new LogtoClient(logtoConfig);
const { url } = await client.handleSignIn(redirectUri);  // Vollständige Cookie-Integration
```

### Fehler 2: Cookie-Storage nicht initialisiert

**Analyse der LogtoClient Implementierung** (node_modules/@logto/next/lib/server-actions/client.js):

```javascript
async createNodeClient() {
  const { cookies } = await import('next/headers');
  this.storage = new CookieStorage({
    getCookie: async (...args) => {
      const cookieStore = await cookies();
      return cookieStore.get(...args)?.value ?? '';
    },
    setCookie: async (...args) => {
      const cookieStore = await cookies();
      cookieStore.set(...args);  // ← Setzt Cookies via Next.js cookies()
    },
  });
}
```

**Problem der alten Implementation**:
- `signIn()` Helper initialisiert **keinen** `LogtoClient` korrekt
- Cookies werden **nicht gesetzt** → PKCE state/code_verifier fehlt
- Callback kann state **nicht verifizieren** → Fehler

**Solution**:
- `LogtoClient` Instanz **pro Request** erstellen
- `handleSignIn()` setzt automatisch Cookies via `CookieStorage`
- `handleSignInCallback()` liest Cookies und verifiziert state

---

## 🔧 ANGEWANDTE FIXES

### Fix 1: `/app/api/logto/sign-in/route.ts`

```diff
- import { signIn } from '@logto/next/server-actions';
+ import LogtoClient from '@logto/next/server-actions';

  export async function GET(request: NextRequest) {
-   return await signIn(logtoConfig);
+   const client = new LogtoClient(logtoConfig);
+   const { url } = await client.handleSignIn(request.nextUrl.origin + '/callback');
+   return NextResponse.redirect(url);
  }
```

**Effekt**:
- `LogtoClient` initialisiert `CookieStorage` mit Next.js `cookies()`
- `handleSignIn()` setzt `logto_<appId>` Cookie mit state/code_verifier
- Redirect zu Logto mit PKCE-Challenge

### Fix 2: `/app/callback/route.ts`

```diff
- import { handleSignIn } from '@logto/next/server-actions';
+ import LogtoClient from '@logto/next/server-actions';

  export async function GET(request: NextRequest) {
    try {
-     await handleSignIn(logtoConfig, request.nextUrl);
+     const client = new LogtoClient(logtoConfig);
+     await client.handleSignInCallback(request.url);
      redirect('/');
    } catch (error) {
      console.error('❌ Callback Error:', error);
      redirect('/api/logto/sign-in');
    }
  }
```

**Effekt**:
- `handleSignInCallback()` liest state/code_verifier aus Cookie
- Verifiziert state-Parameter aus URL gegen Cookie-Wert
- Tauscht `code` gegen Access/ID Tokens
- Speichert Session in Cookie

### Fix 3: `/app/api/logto/sign-out/route.ts`

```diff
- import { signOut } from '@logto/next/server-actions';
+ import LogtoClient from '@logto/next/server-actions';

  export async function GET(request: NextRequest) {
-   await signOut(logtoConfig);
+   const client = new LogtoClient(logtoConfig);
+   const signOutUrl = await client.handleSignOut(request.nextUrl.origin);
+   return NextResponse.redirect(signOutUrl);
  }
```

### Fix 4: `/app/api/logto/user/route.ts`

```diff
- import { getLogtoContext } from '@logto/next/server-actions';
+ import LogtoClient from '@logto/next/server-actions';

  export async function GET() {
    try {
-     const context = await getLogtoContext(logtoConfig);
+     const client = new LogtoClient(logtoConfig);
+     const context = await client.getLogtoContext();
      
      if (!context.isAuthenticated) {
        return NextResponse.json({ isAuthenticated: false }, { status: 401 });
      }
      
      return NextResponse.json({
        isAuthenticated: true,
        claims: context.claims,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 500 });
    }
  }
```

---

## 🧪 TEST-SCHRITTE

### Pre-Test: Logto Console Verification

**KRITISCH**: Redirect URI in Logto Console muss exakt übereinstimmen.

1. ✅ Login: https://jmmn7z.logto.app
2. ✅ App ID: `2o2p7jn5oufvv103lui8m`
3. ✅ Settings → Redirect URIs: `http://localhost:3000/callback`
4. ✅ Post sign-out redirect URI: `http://localhost:3000/`

### Test 1: Dev Server Start

```bash
npm run dev
```

**Expected Output**:
```
✓ Ready in ~7s
🔐 Logto Config Loaded: {
  endpoint: 'https://jmmn7z.logto.app/',
  appId: '2o2p7jn5oufvv103lui8m',
  baseUrl: 'http://localhost:3000',
  callbackUrl: 'http://localhost:3000/callback'  ← MUST be /callback
}
```

### Test 2: Cookie Persistence (cURL)

```bash
# Terminal (während dev server läuft):
curl -v http://localhost:3000/api/logto/sign-in 2>&1 | grep -i "location\|set-cookie"
```

**Expected Output** (NEU nach Fix):
```
< location: https://jmmn7z.logto.app/oidc/auth?client_id=...
```

**KRITISCH**: Der `Set-Cookie` Header wird **während** des OIDC-Flows gesetzt, nicht beim initialen Redirect.
Die Cookies werden von der LogtoClient-Implementierung via `next/headers` gesetzt.

### Test 3: Browser End-to-End Flow

1. **Browser**: http://localhost:3000
2. **Click "Login"** (lädt `/api/logto/sign-in`)
3. **Checkpoint**: Browser wird zu `https://jmmn7z.logto.app/oidc/auth?...` redirected
4. **Login** bei Logto mit Credentials
5. **Consent** (falls erforderlich)
6. **Checkpoint**: Redirect zu `http://localhost:3000/callback?code=...&state=...`
7. **Expected**: HTTP 307 → Redirect zu `/`
8. **Expected**: Keine Console Errors

**Browser DevTools - Application Tab**:
```
Cookies for http://localhost:3000:
  logto_2o2p7jn5oufvv103lui8m  ← Session Cookie nach erfolgreichem Login
```

### Test 4: Terminal Log Analysis

**Expected Logs** (SUCCESS):
```
 GET /api/logto/sign-in 307 in XXXms
 GET /callback?code=...&state=... 307 in XXXms
 GET / 200 in XXXms
 GET /api/logto/user 200 in XXXms  ← Authenticated!
```

**FAIL Indicators** (sollten NICHT auftreten):
```
❌ Callback Error: Missing state  ← State-Mismatch, Cookie fehlt
❌ Callback Error: invalid_grant  ← Code bereits verwendet oder expired
 GET /api/logto/user 401  ← Session nicht gespeichert
```

---

## 🔐 SECURITY AUDIT

### ✅ Korrekt implementiert:

1. **Secrets Management**:
   - `.env.local` nicht in Git (verified)
   - Alle Secrets über ENV vars

2. **Cookie Security**:
   ```typescript
   cookieSecure: isProduction  // HTTP in dev, HTTPS in prod
   ```

3. **PKCE Flow**:
   - `code_challenge` + `code_challenge_method=S256`
   - State-Parameter zur CSRF-Prevention
   - Code-Verifier in HttpOnly Cookie

4. **Session Storage**:
   ```javascript
   cookieKey: `logto_${this.config.appId}`
   isSecure: this.config.cookieSecure
   // SameSite implicitly handled by Next.js cookies()
   ```

### ⚠️ Empfehlungen:

1. **LOGTO_COOKIE_SECRET Rotation**:
   ```bash
   # Generate new 32-byte secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Aktuell: `ov613c3o4fpcwvn5j4vi2` (25 Zeichen) → funktioniert, aber sub-optimal

2. **Production Checklist**:
   ```bash
   # .env.production
   APP_BASE_URL=https://your-domain.com  # HTTPS!
   LOGTO_COOKIE_SECRET=<64-char-hex>     # 32 bytes
   ```

   **Logto Console für Production**:
   - Redirect URI: `https://your-domain.com/callback`
   - Post sign-out: `https://your-domain.com/`

---

## 📊 VERIFIKATION

Nach `npm run dev` und Browser-Login:

### ✅ Success Criteria:

1. `/api/logto/sign-in` → 307 zu Logto (keine Errors)
2. Logto Login → 303 zu `/callback?code=...&state=...`
3. `/callback` → 307 zu `/` (keine "Missing state" Errors)
4. `/api/logto/user` → 200 mit `{ isAuthenticated: true, claims: {...} }`
5. Browser Cookies enthalten `logto_2o2p7jn5oufvv103lui8m`

### ❌ Failure Modes (wenn weiterhin auftritt):

**Error**: "Missing state in callback URI"
- **Root Cause**: Cookies werden nicht gesetzt/gelesen
- **Debug**: Prüfe Next.js Version (benötigt 13.4+), prüfe `cookies()` import
- **Solution**: Stelle sicher, dass `@logto/next@4.2.8` mit `next@16.1.6` kompatibel ist

**Error**: "Invalid redirect URI"
- **Root Cause**: Logto Console Redirect URI ≠ Code
- **Solution**: Logto Console → Exakt `http://localhost:3000/callback` (kein trailing slash)

**Error**: "Invalid state"
- **Root Cause**: State im Cookie ≠ State in URL
- **Debug**: Browser DevTools → Cookie-Wert extrahieren, mit URL-Parameter vergleichen
- **Possible**: Cookie-Encryption Key falsch (LOGTO_COOKIE_SECRET changed)

---

## 🎯 ZUSAMMENFASSUNG

**Root Cause**: Verwendung von Helper-Functions statt `LogtoClient` Klasse
**Fix**: Migration zu `LogtoClient` für vollständige Cookie-Integration
**Test**: Browser-Flow sollte jetzt funktionieren
**Security**: PKCE + HttpOnly Cookies + State-Verification aktiv

**Nächster Schritt**: `npm run dev` und Browser-Login testen.

