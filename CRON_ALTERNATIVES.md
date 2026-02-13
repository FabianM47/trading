# ⏰ Cron Jobs - Vercel Hobby Plan Limitierungen

## 🚨 Problem
Vercel Hobby Plan erlaubt nur **einen Cron Job pro Tag** (täglich um eine festgelegte Uhrzeit).

Folgende Schedules sind **NICHT** auf dem Hobby Plan möglich:
- ❌ Stündlich (`0 * * * *`)
- ❌ Alle 15 Minuten (`*/15 * * * *`)
- ❌ Minütlich (`* * * * *`)

## ✅ Aktuelle Konfiguration

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Nur dieser eine Cron Job wird automatisch ausgeführt** (täglich um Mitternacht UTC).

## 🔧 Alternativen für häufigere Updates

### Option 1: Externe Cron Services (Kostenlos)

**Cron-Job.org** (https://cron-job.org)
- ✅ Kostenlos für bis zu 50 Jobs
- ✅ Bis zu minütliche Ausführung
- ✅ Monitoring & Logs
- ✅ E-Mail Benachrichtigungen

Setup:
1. Registriere dich auf cron-job.org
2. Erstelle neuen Cronjob mit URL: `https://trading.vercel.app/api/cron/hourly`
3. Füge Header hinzu: `Authorization: Bearer YOUR_CRON_SECRET`
4. Setze Schedule: Jede Stunde

**EasyCron** (https://www.easycron.com)
- ✅ Kostenlos für 100 Tasks/Monat
- ✅ Bis zu minütliche Ausführung

**GitHub Actions** (im eigenen Repo)
```yaml
name: Hourly Cron
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  trigger-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Cron
        run: |
          curl -X GET https://trading.vercel.app/api/cron/hourly \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 2: Client-Side Polling

Für Echtzeit-Daten nutze Client-Side Updates:

```typescript
// components/live-price-updater.tsx
'use client';

import { useEffect, useState } from 'react';

export function LivePriceUpdater() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchPrice();

    // Update alle 60 Sekunden
    const interval = setInterval(() => {
      fetchPrice();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchPrice = async () => {
    const res = await fetch('/api/trading?symbol=BTC/USD');
    const data = await res.json();
    setPrice(data.price);
  };

  return <div>Current Price: ${price}</div>;
}
```

### Option 3: Vercel Pro Plan ($20/Monat)

Upgrade zum Pro Plan für unbegrenzte Cron Jobs:
- ✅ Beliebig viele Cron Jobs
- ✅ Minütliche Ausführung möglich
- ✅ Erweiterte Analytics
- ✅ Mehr Bandwidth & Function Execution Time

## 📝 Empfehlung für Trading App

### Kostenlose Lösung:
```
Daily (00:00 UTC)     → Vercel Cron       → Tägliche Reports, Cleanup
Hourly               → Cron-Job.org      → Marktdaten-Updates
Every 5 Minutes      → Client Polling    → Live-Preise im Frontend
```

### Pro Plan Lösung:
```
Daily (00:00 UTC)     → Vercel Cron       → Tägliche Reports
Hourly               → Vercel Cron       → Marktdaten-Updates
Every 15 Minutes     → Vercel Cron       → Cache-Updates
Live Updates         → Client Polling    → Live-Preise im Frontend
```

## 🔐 Sicherheit bei externen Cron Services

Immer `CRON_SECRET` verwenden:

```typescript
// app/api/cron/hourly/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Cron logic...
}
```

## 📊 Bestehende Endpoints

Alle Endpoints existieren und können manuell oder von externen Services aufgerufen werden:

- ✅ `/api/cron/daily` - Auto-triggered von Vercel (Hobby Plan)
- ⚠️ `/api/cron/hourly` - Manuell oder extern triggern
- ⚠️ `/api/cron/minute` - Manuell oder extern triggern

## 🚀 Quick Setup: Cron-Job.org

1. Gehe zu https://cron-job.org/en/members/jobs/add/
2. **Title**: Trading App - Hourly Update
3. **URL**: `https://trading.vercel.app/api/cron/hourly`
4. **Schedule**: `0 * * * *` (jede Stunde)
5. **Advanced** → **HTTP Headers**:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   ```
6. **Save**

Wiederhole für minütliche Updates mit `/api/cron/minute` und `*/5 * * * *` (alle 5 Minuten).

---

**💡 Tipp**: Für ein professionelles Trading-System mit Echtzeit-Updates ist der Pro Plan empfehlenswert,
aber für den Anfang funktioniert die kostenlose Kombination aus Vercel + Cron-Job.org sehr gut!
