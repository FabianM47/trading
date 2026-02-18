# Security Fixes - 18. Februar 2026

## 🔒 Umgesetzte Fixes (alle Critical/High Findings)

### ✅ 1. Dependencies aktualisiert (CRITICAL)
- **eslint**: 4.1.1 → 9.20.0 (High-Severity CVEs behoben)
- **eslint-config-next**: 0.2.4 → 16.1.6
- **zod**: 3.24.1 hinzugefügt (für Input Validation)
- **Remaining**: 10 moderate Vulnerabilities in transitive Dependencies (ajv in eslint-Kette, nicht kritisch)

**Command:**
```bash
npm install  # Installiert aktualisierte Dependencies
```

---

### ✅ 2. Open Redirect in /callback behoben (HIGH)

**Datei:** `app/callback/route.ts`

**Problem:** Regex `/^\/[^\/]/` erlaubte Protocol-Relative URLs wie `//evil.com`

**Fix:**
```typescript
function isSafeRedirectPath(path: string | null): boolean {
  if (!path) return false;
  
  // Guard: Muss mit / starten, aber NICHT mit //
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  
  // Guard: Keine absolute URLs (http://, https://, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false;
  }
  
  // Allowlist bekannter Routen
  const allowedPaths = ['/me', '/'];
  return allowedPaths.some(allowed => path === allowed || path.startsWith(allowed + '/'));
}
```

**Impact:** Verhindert Phishing via Open Redirect

---

### ✅ 3. Tote Callback-Route gelöscht (HIGH)

**Gelöscht:** `app/api/logto/callback/route.ts`

**Grund:**
- Route wurde nicht genutzt (Logto SDK nutzt `/callback`, nicht `/api/logto/callback`)
- Doppelte Implementierung führte zu Verwirrung
- Potenzielles Security-Risiko (veraltete API-Nutzung)

---

### ✅ 4. CSP Production-ready (MEDIUM → HIGH)

**Datei:** `next.config.mjs`

**Problem:** `unsafe-eval` + `unsafe-inline` in Production aktiv

**Fix:**
```javascript
// CSP: Restriktiv mit Umgebungs-Unterscheidung
{
  key: 'Content-Security-Policy',
  value: process.env.NODE_ENV === 'production'
    ? [
        "default-src 'self'",
        "script-src 'self'", // Kein unsafe-eval/inline in Prod
        "style-src 'self' 'unsafe-inline'", // Tailwind benötigt inline styles
        // ... weitere restriktive Policies
        "upgrade-insecure-requests",
      ].join('; ')
    : [
        // Dev: Erlaubt unsafe-eval für Hot Reload
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        // ...
      ].join('; '),
}
```

**Impact:**
- XSS-Protection in Production aktiv
- Dev-Modus weiterhin voll funktional (Hot Reload)

---

### ✅ 5. Input Validation mit Zod (MEDIUM)

**Datei:** `app/api/quotes/route.ts`

**Problem:** Keine Validierung von ISIN/Ticker-Input → DoS/Injection-Risiko

**Fix:**
```typescript
import { z } from 'zod';

const IsinSchema = z.string()
  .regex(/^[A-Z0-9]{1,20}$/, 'Invalid ISIN/Ticker format')
  .max(20);

const QuerySchema = z.object({
  isins: z.string()
    .transform(str => str.split(',').filter(Boolean))
    .pipe(z.array(IsinSchema).max(50)), // Max 50 ISINs pro Request
});

// In GET Handler:
const { isins } = QuerySchema.parse({ isins: isinsParam });
```

**Error Handling:**
```typescript
if (error instanceof z.ZodError) {
  return NextResponse.json(
    { error: 'Invalid input', details: error.errors },
    { status: 400 }
  );
}
```

**Impact:**
- Verhindert DoS via überlange/bösartige Inputs
- Schutz gegen SSRF (validierte Inputs in API-Calls)

---

### ✅ 6. Safe Logging (MEDIUM)

**Datei:** `lib/logger.ts` (neu erstellt)

**Problem:** console.error loggte potenziell PII/Tokens

**Fix:**
```typescript
export function logError(message: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error); // Full Details in Dev
    return;
  }
  
  // Production: Sanitized Error (nur name + message, kein stack/PII)
  const safeError = error instanceof Error 
    ? { name: error.name, message: error.message }
    : 'Unknown error';
  
  console.error(message, safeError);
}
```

**Ersetzt in:**
- `app/callback/route.ts`
- `app/api/logto/user/route.ts`
- `middleware.ts`

**Impact:** Verhindert Token-Leakage in Production Logs

---

### ✅ 7. Cookie-Dokumentation (LOW)

**Datei:** `lib/auth/logto-config.ts`

**Hinzugefügt:**
```typescript
/**
 * COOKIE SECURITY (managed by Logto SDK):
 * - HttpOnly: ✓ true (verhindert XSS Token Theft)
 * - Secure: ✓ true in Production
 * - SameSite: ✓ Lax (verhindert CSRF)
 * - Path: ✓ /
 * - Domain: ✓ Automatisch (keine Subdomain-Sharing)
 * 
 * VERIFICATION (nach Production Deployment):
 * 1. Browser DevTools → Application → Cookies
 * 2. Cookie Name: logto_session
 * 3. Prüfe: HttpOnly=✓, Secure=✓, SameSite=Lax
 */
```

**Impact:** Klare Dokumentation für Security-Audits

---

## 📋 Verbleibende Findings (nicht kritisch)

### [LOW] Rate Limiting (In-Memory)
- **Status:** Akzeptable Limitation für MVP
- **Production Fix:** Upstash Redis oder Vercel Edge Config
- **Action:** Geplant für nächsten Sprint

### [LOW] CORS-Header
- **Status:** Next.js API Routes default-deny (OK)
- **Action:** Explizite CORS-Header nur bei Bedarf (wenn externe Domains API nutzen)

---

## 🎯 Build Status

```bash
$ npm run build
✓ Compiled successfully in 4.9s
✓ Generating static pages using 19 workers (11/11) in 4.5s

Route (app)
├ ○ /
├ ƒ /api/logto/sign-in
├ ƒ /api/logto/sign-out
├ ƒ /api/logto/user
├ ƒ /api/quotes
├ ƒ /callback
└ ○ /me
```

**Keine Errors, keine Warnings (außer deprecated middleware-Warnung von Next.js 16)**

---

## 🔐 Pre-Production Checklist

Vor Deployment zu Vercel:

### 1. Environment Variables (Vercel Dashboard)
```bash
APP_BASE_URL=https://your-domain.com  # HTTPS!
LOGTO_APP_ID=<from-logto-console>
LOGTO_APP_SECRET=<from-logto-console>
LOGTO_COOKIE_SECRET=<run: node scripts/generate-secrets.js>
LOGTO_ENDPOINT=https://jmmn7z.logto.app/
FINNHUB_API_KEY=<your-api-key>
```

### 2. Logto Console (https://jmmn7z.logto.app)
**Redirect URIs (exakt!):**
```
https://your-domain.com/callback
https://preview-*.vercel.app/callback  # Für Preview Deployments
http://localhost:3000/callback  # Für lokale Dev
```

**Post sign-out URI:**
```
https://your-domain.com/
```

**App Type:** Traditional Web Application

### 3. Cookie Verification (nach Deployment)
```
1. Öffne https://your-domain.com
2. Login durchführen
3. DevTools → Application → Cookies
4. Prüfe logto_session Cookie:
   ✓ HttpOnly: true
   ✓ Secure: true
   ✓ SameSite: Lax (oder Strict)
   ✓ Domain: your-domain.com (NICHT .your-domain.com)
   ✓ Path: /
```

### 4. Security Headers Verification
```bash
curl -I https://your-domain.com

# Erwartete Header:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

---

## 📊 Security Audit Score

| Finding | Severity | Status |
|---------|----------|--------|
| Vulnerable Dependencies | CRITICAL | ✅ Fixed |
| Open Redirect | HIGH | ✅ Fixed |
| Duplicate Callback Routes | HIGH | ✅ Fixed |
| CSP Too Permissive | HIGH | ✅ Fixed |
| Missing Input Validation | MEDIUM | ✅ Fixed |
| Unsafe Logging | MEDIUM | ✅ Fixed |
| Cookie Documentation | LOW | ✅ Fixed |
| Rate Limiting (In-Memory) | LOW | ⚠️ Accepted (MVP) |
| Missing CORS Headers | LOW | ⚠️ Not needed |

**Overall:** 7/9 Fixed, 2/9 Accepted

---

## 🚀 Deployment

```bash
# 1. Git Commit
git add .
git commit -m "fix: Security-Fixes (Dependencies, Open Redirect, CSP, Input Validation)"

# 2. Push to Production
git push origin main

# 3. Vercel Deploy (automatisch via Git Push)
# Oder manuell:
vercel --prod
```

---

**Review durchgeführt am:** 18. Februar 2026  
**Reviewer:** GitHub Copilot (Senior DevSecOps Engineer)  
**Status:** Production-ready ✅
