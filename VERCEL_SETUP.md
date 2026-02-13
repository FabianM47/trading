# Vercel Integration Guide

## 🚀 Deployment Setup

### 1. Vercel Postgres einrichten

1. Gehe zu deinem Vercel Dashboard
2. Navigiere zu **Storage** → **Create Database** → **Postgres**
3. Wähle Region (z.B. Frankfurt `fra1`)
4. Nach der Erstellung werden automatisch folgende ENV Variables hinzugefügt:
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### 2. Vercel KV (Redis) einrichten

1. Gehe zu **Storage** → **Create Database** → **KV**
2. Wähle Region (z.B. Frankfurt `fra1`)
3. Nach der Erstellung wird automatisch hinzugefügt:
   - `REDIS_URL`

### 3. Cron Jobs aktivieren

Die `vercel.json` ist bereits konfiguriert mit:
- **Daily Cron**: Täglich um Mitternacht UTC (`0 0 * * *`)
- **Hourly Cron**: Jede Stunde (`0 * * * *`)
- **Minute Cron**: Jede Minute (`* * * * *`)

**Wichtig**: Setze das `CRON_SECRET` Environment Variable!

```bash
# Generiere ein sicheres Secret
openssl rand -base64 32
```

### 4. Environment Variables setzen

Gehe zu **Settings** → **Environment Variables** und füge hinzu:

#### Production + Preview + Development:
```
CRON_SECRET=<dein-generiertes-secret>
NEXT_PUBLIC_APP_URL=<deine-app-url>
```

#### Nur Production:
```
NEXT_PUBLIC_APP_URL=https://trading.vercel.app
```

#### Nur Preview:
```
NEXT_PUBLIC_APP_URL=https://trading-git-{branch}.vercel.app
```

#### Nur Development:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Analytics & Speed Insights

✅ Bereits integriert in `app/layout.tsx`

Nach dem ersten Deployment:
1. Gehe zu **Analytics** Tab → **Enable Analytics**
2. Gehe zu **Speed Insights** Tab → **Enable Speed Insights**

## 🧪 Cron Jobs testen

### Lokal testen:
```bash
# Mit Authorization Header
curl -X GET http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Production testen:
```bash
curl -X GET https://trading.vercel.app/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 📊 API Endpoints

- `GET /api/health` - Health Check
- `GET /api/trading?symbol=BTC/USD` - Trading Daten abrufen
- `POST /api/trading` - Trade Order erstellen
- `GET /api/cron/daily` - Täglicher Cron Job (Protected)
- `GET /api/cron/hourly` - Stündlicher Cron Job (Protected)
- `GET /api/cron/minute` - Minütlicher Cron Job (Protected)

## 🔧 Lokale Entwicklung

```bash
# Environment Variables von Vercel pullen
npx vercel env pull .env.local

# Development Server starten
pnpm dev
```

## 📦 Packages installieren für Vercel Services

```bash
# Vercel KV (Redis)
pnpm add @vercel/kv

# Vercel Postgres
pnpm add @vercel/postgres

# Optional: Prisma für Type-Safe DB Access
pnpm add prisma @prisma/client
pnpm add -D prisma
```

## 🔒 Sicherheits-Checkliste

- ✅ `.env.local` ist in `.gitignore`
- ✅ `CRON_SECRET` ist gesetzt und sicher
- ✅ Niemals Secrets in Git committen
- ✅ Verwende `NEXT_PUBLIC_*` nur für öffentliche Werte
- ✅ API Routes sind geschützt (Authorization Header)

## 📈 Monitoring

- **Logs**: Dashboard → Deployments → Functions Tab
- **Cron Logs**: Dashboard → Deployments → Functions → Cron
- **Analytics**: Dashboard → Analytics Tab
- **Speed Insights**: Dashboard → Speed Insights Tab
- **Database**: Dashboard → Storage → Query Editor

## 🎯 Nächste Schritte

1. [ ] Vercel Postgres Datenbank einrichten
2. [ ] Vercel KV Redis einrichten
3. [ ] `CRON_SECRET` Environment Variable setzen
4. [ ] Analytics aktivieren
5. [ ] Speed Insights aktivieren
6. [ ] Erste Deployment durchführen
7. [ ] Cron Jobs testen
