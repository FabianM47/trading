# ✅ Logto Credentials Verification

## Root Cause: Invalid Client Credentials

**Error**: `oidc.invalid_client` - `client authentication failed`

**Wo es fehlschlägt**:
```
POST https://jmmn7z.logto.app/oidc/token
Authorization: Basic <base64(client_id:client_secret)>
Response: 401 Unauthorized
```

**Bedeutung**: Der `LOGTO_APP_SECRET` in `.env.local` stimmt **nicht** mit dem Secret in der Logto Console überein.

---

## 🔐 SOFORTIGE LÖSUNG

### Schritt 1: Logto Console - Hole korrektes App Secret

1. **Login**: https://jmmn7z.logto.app
2. **Navigate**: Applications → `2o2p7jn5oufvv103lui8m`
3. **Tab**: "Settings" oder "Secrets"
4. **Action**: 
   - **Option A**: Secret anzeigen lassen (falls sichtbar)
   - **Option B**: "Regenerate Secret" → **NEUES Secret generieren**

### Schritt 2: Update .env.local

**Aktuell in .env.local**:
```bash
LOGTO_APP_SECRET=saeky8c29v6wnr2bzs4q5
```

**Aktion**:
```bash
# Öffne .env.local
nano .env.local  # oder code .env.local

# Ersetze LOGTO_APP_SECRET mit dem Wert aus Logto Console
LOGTO_APP_SECRET=<EXAKTES_SECRET_AUS_LOGTO_CONSOLE>

# WICHTIG: Keine Leerzeichen, keine Quotes, exakt kopieren
```

### Schritt 3: Dev-Server Neustart

```bash
# Stoppe aktuellen Server (Ctrl+C)
# Starte neu (lädt neue .env.local)
npm run dev
```

---

## 🧪 VERIFIKATION

### Test 1: Config Loading

Nach `npm run dev` im Terminal suchen:
```
🔐 Logto Config Loaded: {
  endpoint: 'https://jmmn7z.logto.app/',
  appId: '2o2p7jn5oufvv103lui8m',
  baseUrl: 'http://localhost:3000',
  callbackUrl: 'http://localhost:3000/callback'
}
```

**Wichtig**: Der Secret wird **nicht** geloggt (Security).

### Test 2: Browser Login

1. http://localhost:3000 → Click "Login"
2. Logto Login → Credentials eingeben
3. **Expected**: Redirect zu `/` **OHNE** `invalid_client` Error

**Expected Terminal Log**:
```
 GET /api/logto/sign-in 307 in XXXms
 GET /callback?code=...&state=... 307 in XXXms  ← KEIN Error!
 GET / 200 in XXXms
```

**Failure Indicator**:
```
❌ Callback Error: oidc.invalid_client  ← Secret immer noch falsch
```

---

## 🔍 DEBUG: Secret-Format Verifikation

**Logto App Secrets** haben typischerweise folgendes Format:
- **Länge**: 20-30 Zeichen
- **Charset**: Alphanumerisch (lowercase letters + numbers)
- **Beispiel**: `abc123def456ghi789jkl`

**Aktuelles Secret** in .env.local:
```
saeky8c29v6wnr2bzs4q5  (21 Zeichen) ✓ Format korrekt
```

**Problem**: Format ist korrekt, aber der **Wert stimmt nicht mit Logto Console überein**.

---

## 🚨 HÄUFIGE FEHLERQUELLEN

### 1. Secret wurde regeneriert
- Logto Console → "Regenerate Secret" geklickt
- Alter Secret in .env.local ist jetzt ungültig
- **Fix**: Neues Secret kopieren

### 2. Copy-Paste Fehler
- Leerzeichen am Anfang/Ende kopiert
- **Fix**: `LOGTO_APP_SECRET=abc123` (kein Space, keine Quotes)

### 3. Falscher App in Console
- Mehrere Apps in Logto Console
- Secret von anderer App kopiert
- **Fix**: Verifiziere App ID `2o2p7jn5oufvv103lui8m`

### 4. Environment nicht geladen
- .env.local nach Server-Start geändert
- **Fix**: Server neu starten (Ctrl+C → npm run dev)

---

## 📋 CHECKLISTE

- [ ] Logto Console geöffnet (https://jmmn7z.logto.app)
- [ ] App `2o2p7jn5oufvv103lui8m` verifiziert
- [ ] App Secret aus Console kopiert (exakt)
- [ ] .env.local aktualisiert: `LOGTO_APP_SECRET=<neuer_wert>`
- [ ] Dev-Server neu gestartet: `npm run dev`
- [ ] Browser-Login getestet
- [ ] Terminal zeigt **KEIN** "invalid_client" Error

---

## 🎯 ERWARTETES ERGEBNIS

Nach Secret-Korrektur:

```bash
# Terminal:
 GET /callback?code=... 307 in XXXms
 GET / 200 in XXXms
 GET /api/logto/user 200 in XXXms

# Browser:
Logged in ✅
Session aktiv ✅
```

**Falls Error weiterhin auftritt**:
- **Rückfrage 1**: Screenshot von Logto Console → App Settings → Credentials
- **Rückfrage 2**: Komplette .env.local (mit `LOGTO_APP_SECRET=***` zensiert)
- **Rückfrage 3**: Ist das die korrekte Logto App (`2o2p7jn5oufvv103lui8m`)?
