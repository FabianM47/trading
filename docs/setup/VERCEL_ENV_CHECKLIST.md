# 🔧 Vercel Environment Variables - Checkliste

## ✅ Erforderliche Environment Variables für Vercel

### 1️⃣ **KRITISCH - Ohne diese läuft die App nicht**

#### Database (Vercel Postgres)
Diese werden **automatisch** gesetzt, wenn Sie Vercel Postgres einrichten:
```bash
POSTGRES_URL                  # Auto-generiert von Vercel Postgres
POSTGRES_URL_NON_POOLING      # Auto-generiert von Vercel Postgres
POSTGRES_PRISMA_URL           # Auto-generiert von Vercel Postgres
POSTGRES_USER                 # Auto-generiert von Vercel Postgres
POSTGRES_HOST                 # Auto-generiert von Vercel Postgres
POSTGRES_PASSWORD             # Auto-generiert von Vercel Postgres
POSTGRES_DATABASE             # Auto-generiert von Vercel Postgres
```

**Setup:**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Region wählen (z.B. Frankfurt `fra1`)
3. Variablen werden automatisch zu allen Environments hinzugefügt

---

#### Authentication (Auth.js)
```bash
AUTH_SECRET                   # ⚠️ MANUELL SETZEN - Siehe unten
AUTH_URL                      # ⚠️ MANUELL SETZEN - Ihre Domain
```

**Werte:**
```bash
# AUTH_SECRET generieren:
openssl rand -base64 32

# AUTH_URL:
# Production:  https://your-app.vercel.app
# Preview:     https://your-app-git-{branch}.vercel.app
```

**Setup in Vercel:**
- Settings → Environment Variables
- `AUTH_SECRET`: Production + Preview + Development
- `AUTH_URL`: Pro Environment individuell

---

### 2️⃣ **OPTIONAL aber EMPFOHLEN**

#### Cron Job Security
```bash
CRON_SECRET                   # Schützt Cron Endpoints
```

**Generieren:**
```bash
openssl rand -base64 32
```

**Setup:**
- Settings → Environment Variables
- Alle Environments (Production + Preview + Development)

---

#### Email Authentication (für Magic Links)
```bash
EMAIL_SERVER                  # SMTP Connection String
EMAIL_FROM                    # Absender E-Mail
```

**Beispiele:**
```bash
# Gmail:
EMAIL_SERVER=smtp://your-email@gmail.com:app-password@smtp.gmail.com:587
EMAIL_FROM=noreply@your-domain.com

# SendGrid:
EMAIL_SERVER=smtp://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:587
EMAIL_FROM=noreply@your-domain.com
```

---

#### Google OAuth (Optional)
```bash
AUTH_GOOGLE_ID                # Google Client ID
AUTH_GOOGLE_SECRET            # Google Client Secret
```

**Setup:**
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Authorized redirect URIs:
   - Production: `https://your-app.vercel.app/api/auth/callback/google`
   - Preview: `https://your-app-git-*.vercel.app/api/auth/callback/google`

---

#### Redis Cache (Vercel KV)
Diese werden **automatisch** gesetzt, wenn Sie Vercel KV einrichten:
```bash
KV_REST_API_URL              # Auto-generiert
KV_REST_API_TOKEN            # Auto-generiert
KV_REST_API_READ_ONLY_TOKEN  # Auto-generiert
```

**Setup:**
1. Vercel Dashboard → Storage → Create Database → KV
2. Region wählen
3. Variablen werden automatisch hinzugefügt

---

#### Price API (Optional)
```bash
FINNHUB_API_KEY              # Für Live-Kursdaten
```

**Setup:**
1. https://finnhub.io/register
2. Free API Key holen (60 calls/minute)
3. In Vercel hinzufügen

---

### 3️⃣ **NIEMALS in Vercel setzen**

```bash
DISABLE_AUTH=true            # ❌ NUR FÜR LOKALE ENTWICKLUNG!
```

**Wichtig:** Diese Variable sollte **niemals** in Vercel gesetzt werden!
- Wird automatisch ignoriert (`.env.local` wird nicht deployt)
- Nur für lokale Entwicklung gedacht
- In Production immer echte Auth verwenden

---

## 📋 Schnell-Setup Anleitung

### Schritt 1: Vercel Postgres einrichten
```bash
Vercel Dashboard
→ Storage
→ Create Database
→ Postgres
→ Region wählen (z.B. fra1)
✅ 7 ENV Variables automatisch hinzugefügt
```

### Schritt 2: Auth Secret generieren
```bash
# Im Terminal:
openssl rand -base64 32

# Kopieren Sie die Ausgabe
```

### Schritt 3: Environment Variables setzen
```bash
Vercel Dashboard
→ Settings
→ Environment Variables
→ Add New

Hinzufügen:
1. AUTH_SECRET = <generierter-wert>
   Environment: Production + Preview + Development

2. AUTH_URL = https://your-app.vercel.app
   Environment: Production

3. AUTH_URL = https://your-app-git-{branch}.vercel.app
   Environment: Preview

4. AUTH_URL = http://localhost:3000
   Environment: Development

5. CRON_SECRET = <generierter-wert>
   Environment: Production + Preview + Development

6. NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   Environment: Production
```

### Schritt 4: Optional - Email & OAuth einrichten
Nur wenn Sie Email Magic Links oder Google OAuth nutzen möchten.

### Schritt 5: Deployment auslösen
```bash
git push

# Oder manuell:
vercel --prod
```

---

## 🎯 Minimale Konfiguration (Quick Start)

Für einen **funktionierenden Minimal-Deployment**:

```bash
✅ AUTOMATISCH (Vercel Postgres):
- POSTGRES_URL
- POSTGRES_PRISMA_URL
- POSTGRES_URL_NON_POOLING
- + 4 weitere Postgres-Variablen

⚠️ MANUELL SETZEN:
AUTH_SECRET = <openssl rand -base64 32>
AUTH_URL = https://your-app.vercel.app
```

**Das war's!** Die App läuft mit dieser Minimal-Konfiguration.

---

## 🔄 Environment Variables pro Environment

### Production
```bash
AUTH_SECRET              # Ihr generierter Secret
AUTH_URL                 # https://your-app.vercel.app
CRON_SECRET              # Ihr generierter Secret
NEXT_PUBLIC_APP_URL      # https://your-app.vercel.app
EMAIL_SERVER             # Optional
EMAIL_FROM               # Optional
AUTH_GOOGLE_ID           # Optional
AUTH_GOOGLE_SECRET       # Optional
FINNHUB_API_KEY          # Optional
```

### Preview
```bash
AUTH_SECRET              # Gleicher wie Production
AUTH_URL                 # https://your-app-git-{branch}.vercel.app
CRON_SECRET              # Gleicher wie Production
NEXT_PUBLIC_APP_URL      # https://your-app-git-{branch}.vercel.app
# Rest optional wie Production
```

### Development
```bash
AUTH_SECRET              # Gleicher wie Production
AUTH_URL                 # http://localhost:3000
CRON_SECRET              # Gleicher wie Production
NEXT_PUBLIC_APP_URL      # http://localhost:3000
# Rest optional wie Production
```

---

## 🧪 Testen der Konfiguration

### Nach dem Deployment:

1. **Health Check:**
```bash
curl https://your-app.vercel.app/api/health
```

2. **Auth testen:**
```bash
# Browser öffnen:
https://your-app.vercel.app/auth/signin
```

3. **Cron Job testen:**
```bash
curl -X GET https://your-app.vercel.app/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📝 Checkliste vor dem Deploy

- [ ] Vercel Postgres Datenbank erstellt
- [ ] `AUTH_SECRET` generiert und gesetzt
- [ ] `AUTH_URL` für alle Environments gesetzt
- [ ] `CRON_SECRET` generiert und gesetzt (optional)
- [ ] Email-Provider konfiguriert (falls gewünscht)
- [ ] Google OAuth konfiguriert (falls gewünscht)
- [ ] `DISABLE_AUTH` ist **NICHT** in Vercel gesetzt
- [ ] Vercel KV erstellt (falls Caching gewünscht)
- [ ] Finnhub API Key gesetzt (falls Price-API gewünscht)
- [ ] Alle Secrets sicher gespeichert (Password Manager)

---

## 🆘 Troubleshooting

### "Missing connection string" Error
```bash
Problem: POSTGRES_URL nicht gesetzt
Lösung: Vercel Postgres Datenbank erstellen
```

### "Invalid AUTH_SECRET" Error
```bash
Problem: AUTH_SECRET fehlt oder falsch
Lösung: Neuen Secret generieren und setzen
```

### "Redirect URI mismatch" (Google OAuth)
```bash
Problem: Redirect URI nicht autorisiert
Lösung: In Google Cloud Console korrekte URI hinzufügen
```

### Cron Jobs laufen nicht
```bash
Problem: CRON_SECRET fehlt oder falsch
Lösung: Secret setzen und in API Route prüfen
```

---

## 📚 Weitere Infos

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Auth.js Deployment Guide](https://authjs.dev/getting-started/deployment)
- [Lokales Auth Bypass Setup](./AUTH_BYPASS.md)

---

**Viel Erfolg beim Deployment! 🚀**
