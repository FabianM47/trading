# Production Issues & Fixes

## ✅ Behobene Probleme (18. Februar 2026)

### 1. **Content Security Policy (CSP) - Inline Script Blockierung**

#### ❌ Problem:
```
Executing inline script violates the following Content Security Policy directive 'script-src 'self''.
Either the 'unsafe-inline' keyword, a hash (...), or a nonce ('nonce-...') is required.
```

#### 🔍 Ursache:
Next.js generiert **inline scripts** für:
- React Hydration (Client-Side Rendering)
- Router Prefetching
- Error Boundary Handling
- Dynamic Imports

Die ursprüngliche CSP (`script-src 'self'`) blockierte diese.

#### ✅ Lösung:
**Datei**: `next.config.mjs`

```javascript
// VORHER (zu restriktiv):
"script-src 'self'"

// NACHHER (Next.js-kompatibel):
"script-src 'self' 'strict-dynamic'"
```

**Was macht `'strict-dynamic'`?**
- Erlaubt nur Scripts, die von bereits vertrauenswürdigen Scripts geladen werden
- Next.js kann eigene inline scripts nutzen
- Fremde Scripts (XSS) werden trotzdem blockiert
- **Sicherer als `'unsafe-inline'`** (würde ALLE inline scripts erlauben)

**Referenz:**
- [Next.js CSP Docs](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [MDN: strict-dynamic](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#strict-dynamic)

---

### 2. **Favicon 404 Error**

#### ❌ Problem:
```
GET https://trading.fabianmaucher.de/favicon.ico 404 (Not Found)
```

#### 🔍 Ursache:
- Kein `public/` Verzeichnis existierte
- Browser sucht standardmäßig nach `/favicon.ico`

#### ✅ Lösung:

**1. Public-Verzeichnis erstellt:**
```
public/
  ├── favicon.svg      # SVG-Favicon (modernes Format)
  ├── robots.txt       # SEO-Crawler-Anweisungen
  └── .gitkeep
```

**2. Favicon in Metadata eingebunden:**
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Trading Portfolio',
  icons: {
    icon: '/favicon.svg',    // Modern browsers
    apple: '/favicon.svg',   // iOS Safari
  },
};
```

**3. Favicon-Design:**
- Blauer Hintergrund (#3b82f6 - Tailwind Blue)
- Weißes "T" für Trading
- SVG-Format (skaliert perfekt)

**Optional: ICO-Fallback generieren**
```bash
# Falls alte Browser unterstützt werden müssen:
npm install -g sharp-cli
sharp -i public/favicon.svg -o public/favicon.ico
```

---

### 3. **Browser Extension Interferenz** (ℹ️ Kein Fix nötig)

#### ⚠️ Fehler in Console:
```
4ca88780337b602d.js:1 Uncaught (in promise) Error: Connection closed.
content.js:9 ✅ Content Script wird initialisiert
[Intervention] Slow network detected... Fallback font will be used
```

#### 🔍 Ursache:
**Chrome Extension** (vermutlich ein Font-Loader oder Wörterbuch-Plugin):
- `chrome-extension://ibiipnmmlnehmeonnhbdajcfagcgihkl/`
- Versucht Fonts zu laden: `MuseoSansCyrl_300.otf`, etc.
- Content Script injiziert sich in Seite

#### ✅ Verhalten:
- **Nicht kritisch** für deine App
- Extension-Fehler beeinflussen NUR den User mit dieser Extension
- Andere User sehen diese Fehler NICHT

#### 🎯 Best Practice:
**Kein Fix nötig**, aber für saubere Production-Logs:

1. **DevTools Filtering** (lokal):
   ```
   Console → Filter Settings → Hide messages from extensions
   ```

2. **Sentry/Error Tracking** (Production):
   ```typescript
   // Filtere Extension-Fehler in Error Reporting
   Sentry.init({
     beforeSend(event) {
       // Ignoriere Chrome Extension Errors
       if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
         frame => frame.filename?.includes('chrome-extension://')
       )) {
         return null; // Don't send to Sentry
       }
       return event;
     }
   });
   ```

---

## 🚀 Deployment Checklist

### Nach jedem Production-Update:

- [ ] **1. CSP testen**
  ```bash
  curl -I https://trading.fabianmaucher.de
  # Prüfe: Content-Security-Policy Header
  ```

- [ ] **2. Favicon prüfen**
  ```bash
  curl -I https://trading.fabianmaucher.de/favicon.svg
  # Erwartung: 200 OK
  ```

- [ ] **3. Browser Console prüfen**
  - Chrome DevTools → Console
  - Sollte KEINE CSP-Violations mehr zeigen
  - Extension-Fehler sind OK (nicht deine App)

- [ ] **4. Security Headers validieren**
  - [securityheaders.com](https://securityheaders.com/?q=trading.fabianmaucher.de)
  - Erwartetes Rating: **A** oder höher

---

## 📊 CSP-Konfiguration Übersicht

### Production CSP:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'strict-dynamic';      # ✅ Next.js inline scripts
  style-src 'self' 'unsafe-inline';        # ✅ Tailwind inline styles
  img-src 'self' data: https:;             # ✅ External images
  font-src 'self' data:;                   # ✅ Custom fonts
  connect-src 'self' https://jmmn7z.logto.app https://finnhub.io ...;
  frame-ancestors 'none';                  # ✅ Prevent clickjacking
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;               # ✅ Force HTTPS
```

### Was jede Direktive erlaubt:

| Direktive | Erlaubt | Blockiert |
|-----------|---------|-----------|
| `script-src 'self' 'strict-dynamic'` | Next.js scripts, dynamische imports | XSS attacks, fremde CDNs |
| `style-src 'self' 'unsafe-inline'` | Tailwind, inline styles | External stylesheets (außer self) |
| `connect-src ...` | Logto, Finnhub, CoinGecko, ING | Andere APIs |
| `frame-ancestors 'none'` | - | Einbettung in iframes |

---

## 🔧 Troubleshooting

### CSP-Fehler debuggen:
```javascript
// 1. CSP-Violations loggen (temporär in dev):
window.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', {
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
    originalPolicy: e.originalPolicy,
  });
});

// 2. Report-Only Mode (testen ohne blockieren):
// next.config.mjs
{
  key: 'Content-Security-Policy-Report-Only',
  value: '...',  // Same policy as CSP
}
```

### Favicon wird nicht angezeigt:
```bash
# 1. Cache leeren:
# Chrome: Ctrl+Shift+Delete → Cached Images

# 2. Prüfe Netzwerk-Tab:
# DevTools → Network → Filter: favicon
# Status sollte: 200 OK sein

# 3. Prüfe Metadata:
# View Page Source → Suche nach:
# <link rel="icon" href="/favicon.svg">
```

---

## 📚 Weiterführende Ressourcen

- **Next.js CSP**: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **MDN CSP Guide**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **OWASP CSP Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
