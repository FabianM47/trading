# 🚨 Logto Quick Fix

## Problem
`invalid_client` Fehler → App ID/Secret stimmen nicht überein

## Sofort-Lösung

### 1️⃣ Prüfe Logto Dashboard
https://jmmn7z.logto.app → Applications

**Welche App siehst du?**
- ☐ App mit ID: `5gikjnratk1iw9fuach9f` (NEU)
- ☐ App mit ID: `2o2p7jn5oufvv103lui8m` (ALT)
- ☐ Beide Apps
- ☐ Keine dieser Apps

### 2️⃣ Entscheide dich für EINE App

#### Option A: Neue App verwenden (5gikjnratk1iw9fuach9f)

1. In Logto: Settings für App `5gikjnratk1iw9fuach9f`
2. Kopiere **App Secret**
3. In `.env.local`:
   ```bash
   LOGTO_APP_ID=5gikjnratk1iw9fuach9f
   LOGTO_APP_SECRET=<KOPIERTES_SECRET>
   ```
4. Konfiguriere in Logto:
   - Redirect URI: `http://localhost:3000/callback`
   - Post Sign-out: `http://localhost:3000`

#### Option B: Alte App verwenden (2o2p7jn5oufvv103lui8m)

1. In Logto: Settings für App `2o2p7jn5oufvv103lui8m`
2. Kopiere **App Secret**
3. In `.env.local`:
   ```bash
   LOGTO_APP_ID=2o2p7jn5oufvv103lui8m
   LOGTO_APP_SECRET=<KOPIERTES_SECRET>
   ```

### 3️⃣ Restart

```bash
# Terminal: Strg+C
# Dann:
npm run dev
```

### 4️⃣ Test

1. Browser: http://localhost:3000
2. Click "Login"
3. Bei Logto einloggen
4. Sollte zurück zu localhost redirecten

## ❓ Immer noch Fehler?

Sende mir:
1. Welche App ID verwendest du? (aus .env.local)
2. Existiert diese App im Logto Dashboard?
3. Exakten Fehlertext aus Terminal
