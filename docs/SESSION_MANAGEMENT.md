# Session Management & Persistente Authentifizierung

## ✅ Implementierte Features

### 1. **Automatischer Session-Check vor Login**
- **Datei**: `app/api/logto/sign-in/route.ts`
- **Funktion**: Prüft VOR jedem Login-Flow, ob bereits eine aktive Session existiert
- **Verhalten**:
  - ✅ Session aktiv → Direkter Redirect zu `/me` (kein erneuter Login)
  - ❌ Keine Session → Startet OIDC Auth Flow

```typescript
// Beispiel: User ruft /api/logto/sign-in auf
const context = await client.getLogtoContext();

if (context.isAuthenticated) {
  // User ist bereits angemeldet!
  return NextResponse.redirect('/me');
}

// Sonst: Starte Login-Flow
```

---

### 2. **Refresh Tokens für Long-Term Sessions**
- **Datei**: `lib/auth/logto-config.ts`
- **Scope**: `offline_access`
- **Lifetime**:
  - Access Token: ~1 Stunde (automatisch erneuert)
  - Refresh Token: **14 Tage** (Logto Default)
  - Cookie: Session-based (bleibt bis Browser geschlossen wird)

```typescript
scopes: [
  'openid',         // OIDC Standard
  'offline_access', // ← Refresh Token für 14-Tage-Sessions
  'profile',        // User-Info
]
```

**Bedeutung:**
- User bleibt **14 Tage angemeldet**, auch wenn er den Browser schließt
- Logto SDK erneuert Access Token automatisch im Hintergrund
- Kein erneuter Login nötig, solange Refresh Token gültig ist

---

### 3. **Middleware Session-Protection**
- **Datei**: `middleware.ts`
- **Protected Routes**: `/me`, `/api/quotes/*`
- **Public Routes**: `/`, `/api/logto/*`, `/callback`

```typescript
const context = await client.getLogtoContext();

if (!context.isAuthenticated) {
  // Redirect zu Login (mit returnTo Parameter)
  return NextResponse.redirect('/api/logto/sign-in?returnTo=/me');
}
```

**Workflow:**
1. User greift auf `/me` zu
2. Middleware prüft Session
3. Session gültig → Zugriff erlaubt
4. Session abgelaufen → Redirect zu Login

---

## 🔄 Session-Lifecycle

### **Szenario 1: Erster Login**
```
1. User → /api/logto/sign-in
2. Keine Session → OIDC Auth Flow startet
3. User meldet sich bei Logto an
4. Callback → /callback?code=XXX
5. Code wird gegen Tokens getauscht
6. Session-Cookie wird gesetzt (+ Refresh Token)
7. Redirect → /me
```

### **Szenario 2: Wiederholter Besuch (innerhalb 14 Tage)**
```
1. User → /me (direkt)
2. Middleware prüft Session
3. Session-Cookie vorhanden & gültig
4. Zugriff erlaubt → /me geladen
5. Kein Login-Flow!
```

### **Szenario 3: Access Token abgelaufen (nach 1h)**
```
1. User → /me
2. Middleware prüft Session
3. Access Token abgelaufen
4. Logto SDK verwendet Refresh Token automatisch
5. Neues Access Token generiert
6. Zugriff erlaubt → /me geladen
7. User merkt nichts!
```

### **Szenario 4: Refresh Token abgelaufen (nach 14 Tagen)**
```
1. User → /me
2. Middleware prüft Session
3. Refresh Token abgelaufen
4. Redirect → /api/logto/sign-in
5. User muss sich neu anmelden
```

---

## 🍪 Cookie-Konfiguration

### **Sicherheits-Einstellungen**
```typescript
cookieSecure: isProduction // true in Production
```

| Attribut | Wert | Bedeutung |
|----------|------|-----------|
| **HttpOnly** | `true` | Cookie nicht via JavaScript zugänglich (XSS-Schutz) |
| **Secure** | `true` (Prod) | Cookie nur über HTTPS (MITM-Schutz) |
| **SameSite** | `Lax` | Cookie nur bei Same-Site Requests (CSRF-Schutz) |
| **Path** | `/` | Cookie gilt für gesamte App |
| **Max-Age** | Session | Cookie bleibt bis Browser geschlossen wird |

### **Cookie-Namen (Logto SDK Defaults)**
- `logto_session` → Hauptsession
- `_interaction` → Temporär während Login-Flow
- `_interaction_resume` → Resume-Token nach Login

---

## 🧪 Testing

### **1. Session-Persistenz testen**
```bash
# Terminal 1: Starte App
npm run dev

# Browser:
1. Öffne http://localhost:3000
2. Melde dich an
3. Schließe Browser-Tab
4. Öffne http://localhost:3000/me
5. ✅ Sollte direkt laden (kein erneuter Login)
```

### **2. Session-Cookie inspizieren**
```
1. Browser DevTools → Application → Cookies
2. Suche "logto_session"
3. Prüfe: HttpOnly=✓, Secure=✓ (in Prod), SameSite=Lax
```

### **3. Refresh Token Flow testen**
```bash
# Access Token künstlich ablaufen lassen (via Logto Console)
1. Logto Dashboard → Applications → Trading App
2. Token Settings → Access Token TTL → 1 Minute setzen
3. Warte 2 Minuten
4. Rufe /api/logto/user auf
5. ✅ Sollte ohne Fehler User-Info zurückgeben
```

---

## 📊 Session-Dauer Übersicht

| Token / Cookie | Lifetime | Auto-Refresh | Bedeutung |
|----------------|----------|--------------|-----------|
| **Access Token** | ~1 Stunde | ✅ Ja | Kurze Gültigkeit für API-Requests |
| **Refresh Token** | 14 Tage | ❌ Nein | Erneuert Access Token automatisch |
| **Session Cookie** | Session | N/A | Bleibt bis Browser geschlossen |
| **ID Token** | ~1 Stunde | ✅ Ja | User-Identifikation |

**Best Practice:**
- Access Token: Kurz (1h) → Sicherheit bei Token Leak
- Refresh Token: Lang (14d) → Gute UX, seltene Logins
- Cookie: Session-based → Schutz bei Device-Sharing

---

## 🔧 Konfiguration anpassen

### **Session-Dauer verlängern/verkürzen**
```typescript
// In Logto Console (nicht im Code!)
Applications → Trading App → Token Settings:
- Access Token TTL: 3600s (1h) → ändern zu 7200s (2h)
- Refresh Token TTL: 1209600s (14d) → ändern zu 2592000s (30d)
```

### **Andere Scopes hinzufügen**
```typescript
// lib/auth/logto-config.ts
scopes: [
  'openid',
  'offline_access',
  'profile',
  'email',    // ← Email-Adresse
  'phone',    // ← Telefonnummer
]
```

---

## 🎯 Wichtige Erkenntnisse

✅ **Du musst dich NICHT jedes Mal neu anmelden**
- Session bleibt **14 Tage** gültig (via Refresh Token)
- Access Token wird automatisch erneuert
- Logto SDK managed das komplett transparent

✅ **Sichere Cookie-Konfiguration**
- HttpOnly verhindert XSS-Angriffe
- Secure (in Prod) verhindert MITM-Angriffe
- SameSite=Lax verhindert CSRF-Angriffe

✅ **Optimierte User Experience**
- Kein Login-Flow bei aktiver Session
- Automatisches Token Refresh im Hintergrund
- Nur alle 14 Tage neuer Login nötig

---

## 🚨 Troubleshooting

### **Problem: User wird sofort ausgeloggt**
```
Mögliche Ursachen:
1. cookieSecret falsch konfiguriert → Cookies können nicht entschlüsselt werden
2. Secure=true aber HTTP statt HTTPS → Cookies werden nicht gesetzt
3. Browser blockiert Cookies → Privacy-Einstellungen prüfen
```

### **Problem: Refresh Token wird nicht generiert**
```
Lösung:
1. Prüfe logtoConfig.scopes → muss 'offline_access' enthalten
2. Logto Console → Applications → Advanced → Refresh Token TTL > 0
3. Browser DevTools → Network → /oidc/token → Prüfe response.refresh_token
```

### **Problem: Session läuft nach 1h ab**
```
Ursache: Refresh Token wird nicht verwendet
Lösung:
1. Stelle sicher: scopes: ['offline_access'] ist gesetzt
2. Prüfe Logto Console → Token Settings → Refresh Token enabled
3. Check Browser Cookies → Sollte refresh_token enthalten
```

---

## 📚 Weitere Infos

- **Logto SDK Docs**: https://docs.logto.io/sdk/next-js
- **OAuth 2.0 Refresh Tokens**: https://oauth.net/2/refresh-tokens/
- **Cookie Security**: https://owasp.org/www-community/controls/SecureCookieAttribute
