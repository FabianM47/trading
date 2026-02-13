# ⏰ Price Snapshot Cron Job - Documentation

Automatischer Cron Job, der alle 15 Minuten läuft und Kursdaten für Portfolio-Instrumente aktualisiert.

## 📋 Übersicht

### Was macht der Job?

1. **Lädt Portfolio-Instrumente**
   - Alle Instrumente aus offenen Positionen
   - Instrumente aus Trades der letzten 30 Tage
   - Dedupliziert automatisch

2. **Holt Kursdaten**
   - Nutzt `getPrice()` mit KV → API → DB Fallback
   - Concurrency Limit: Max 10 parallele Requests
   - Rate Limiting: 1s Delay zwischen Batches
   - Batch Size: 30 Instrumente pro Batch

3. **Speichert Snapshots**
   - Automatisch via `getPrice()` in DB persistiert
   - Unique Constraint verhindert Duplikate

4. **Loggt Metriken**
   - Anzahl Instrumente (total, verarbeitet, übersprungen)
   - Success/Error Counts
   - Cache Hit Rate
   - API Call Count
   - Latency Stats (avg, min, max)
   - Job Duration
   - Batch/Throttle Counts

---

## 🚀 Setup

### 1. Vercel.json Configuration

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Schedule:** Alle 15 Minuten

| Expression | Beschreibung | Use Case |
|------------|-------------|----------|
| `*/15 * * * *` | Alle 15 Minuten | Production (empfohlen) |
| `*/5 * * * *` | Alle 5 Minuten | Aktive Trading-Zeiten |
| `0 * * * *` | Stündlich | Off-Peak Zeiten |
| `*/30 * * * *` | Alle 30 Minuten | Low-Traffic Apps |

### 2. Environment Variables

**Required:** `CRON_SECRET` (für manuelle Triggers in Production)

```bash
# .env.local (Development)
CRON_SECRET=your-super-secret-token-here

# Vercel Environment Variables (Production)
CRON_SECRET=your-super-secret-token-here
```

**Generierung:**
```bash
openssl rand -base64 32
```

### 3. Authentication

Der Job unterstützt zwei Auth-Methoden:

#### A) Vercel Automatic Cron Secret (Production)
- Vercel sendet automatisch `x-vercel-cron-secret` Header
- Keine zusätzliche Konfiguration nötig
- **Empfohlen für Production**

#### B) Custom CRON_SECRET (Development + Manual Triggers)
```bash
curl -X POST https://your-app.vercel.app/api/cron/prices \
  -H "Authorization: Bearer your-secret-token"
```

#### C) Development Mode
- Keine Authentifizierung erforderlich
- Nur wenn `NODE_ENV=development`

---

## 📡 API Endpoints

### POST /api/cron/prices

Hauptendpoint, getriggert von Vercel Cron.

**Auth:** Vercel Cron Secret ODER Custom CRON_SECRET

**Response (Success):**
```json
{
  "success": true,
  "requestId": "a7b3c2",
  "message": "Price snapshots completed successfully",
  "metrics": {
    "totalInstruments": 87,
    "processedInstruments": 87,
    "skippedInstruments": 0,
    "successCount": 85,
    "errorCount": 2,
    "cacheHitCount": 72,
    "apiCallCount": 13,
    "cacheHitRate": 83,
    "duration": 12340,
    "avgLatency": 145,
    "maxLatency": 2100,
    "minLatency": 8,
    "batchCount": 3,
    "throttleCount": 2,
    "startTime": "2026-02-13T10:00:00.000Z",
    "endTime": "2026-02-13T10:00:12.340Z"
  }
}
```

**Response (Partial Success):**
```json
{
  "success": false,
  "requestId": "a7b3c2",
  "message": "Price snapshots completed with errors",
  "metrics": { ... },
  "errors": [
    {
      "instrumentId": "uuid",
      "symbol": "AAPL",
      "error": "API rate limit exceeded",
      "timestamp": "2026-02-13T10:00:05.123Z"
    }
  ]
}
```

### GET /api/cron/prices

Manueller Trigger für Testing/Debugging.

**Auth:** Custom CRON_SECRET (required in production)

**Response:** Gleich wie POST, aber mit allen Errors (nicht nur ersten 20)

---

## 🔧 Configuration

### Job Settings

**File:** `lib/prices/cronJob.ts`

```typescript
const CRON_CONFIG = {
  MAX_CONCURRENT: 10,      // Max parallele API Requests
  BATCH_SIZE: 30,          // Instrumente pro Batch
  BATCH_DELAY: 1000,       // Delay zwischen Batches (ms)
  MAX_INSTRUMENTS: 300,    // Max Instrumente pro Job Run
  JOB_TIMEOUT: 50000,      // Job Timeout (50s)
  RECENT_TRADES_DAYS: 30,  // Trades der letzten X Tage laden
};
```

**Tuning Empfehlungen:**

| Szenario | MAX_CONCURRENT | BATCH_SIZE | BATCH_DELAY |
|----------|----------------|------------|-------------|
| **Viele Instrumente (>200)** | 10 | 30 | 1000 |
| **Wenige Instrumente (<50)** | 15 | 50 | 500 |
| **Rate Limit Issues** | 5 | 20 | 2000 |
| **Schnell (Dev)** | 20 | 50 | 0 |

---

## 📊 Metrics Explained

### Instrument Stats
- **totalInstruments:** Alle gefundenen Portfolio-Instrumente
- **processedInstruments:** Tatsächlich verarbeitete Instrumente
- **skippedInstruments:** Übersprungen wegen Timeout

### Result Stats
- **successCount:** Erfolgreiche Price Fetches
- **errorCount:** Fehlgeschlagene Price Fetches
- **cacheHitCount:** Aus KV Cache geladen (kein API Call)
- **apiCallCount:** Via API Provider geholt (echter API Call)
- **cacheHitRate:** Prozentsatz Cache Hits (höher = besser)

### Performance
- **duration:** Gesamtdauer des Jobs (ms)
- **avgLatency:** Durchschnittliche Latenz pro Instrument (ms)
- **maxLatency:** Längste Latenz (ms)
- **minLatency:** Kürzeste Latenz (ms)

### Batching
- **batchCount:** Anzahl verarbeiteter Batches
- **throttleCount:** Wie oft Delay zwischen Batches eingefügt wurde

---

## 🧪 Testing

### 1. Local Development

```bash
# Start dev server
pnpm dev

# Trigger job (no auth required in dev mode)
curl -X POST http://localhost:3000/api/cron/prices
```

### 2. Production Testing

```bash
# Set CRON_SECRET
export CRON_SECRET="your-secret"

# Manual trigger
curl -X POST https://your-app.vercel.app/api/cron/prices \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Monitoring

```bash
# Check metrics
curl -X GET https://your-app.vercel.app/api/cron/prices \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 📈 Performance Benchmarks

### Expected Metrics (100 Instrumente)

```
Cache Hit Rate:     ~80-90%  (8-9 API calls, rest from KV)
Avg Latency:        ~100ms   (KV: 10ms, API: 500ms)
Total Duration:     ~15-20s  (mit Batching + Delays)
Success Rate:       ~98%     (2-3% transient failures)
```

### Scaling

| Instrumente | Duration | API Calls | Batches |
|-------------|----------|-----------|---------|
| 50 | 8s | 10 | 2 |
| 100 | 15s | 20 | 4 |
| 200 | 30s | 40 | 7 |
| 300 | 45s | 60 | 10 |

**Note:** Job stoppt automatisch bei 50s (Vercel Limit: 60s)

---

## 🚨 Error Handling

### Fehlertypen

1. **API Errors (429, 500, timeout)**
   - Automatische Retries via `getPrice()`
   - Fallback auf DB snapshots
   - Error wird geloggt, Job läuft weiter

2. **Database Errors**
   - Unique Constraint violations (ignoriert)
   - Connection errors (logged, Job fortsetzt)

3. **Job Timeout**
   - Nach 50s stoppt Job automatisch
   - Bereits verarbeitete Snapshots bleiben gespeichert
   - `skippedInstruments` zeigt übrige an

### Error Response

```json
{
  "success": false,
  "errors": [
    {
      "instrumentId": "uuid-123",
      "symbol": "AAPL",
      "error": "Rate limit exceeded",
      "timestamp": "2026-02-13T10:00:05Z"
    }
  ]
}
```

---

## 🔍 Debugging

### 1. Check Logs

**Vercel Dashboard:**
- Functions → `/api/cron/prices`
- Filter: `[Cron:Prices]`

**Wichtige Log Messages:**
```
[Cron:Prices] Starting price snapshot job
[Cron:Prices] Found 87 active instruments
[Cron:Prices] Found 45 instruments from open positions
[Cron:Prices] Found 12 additional instruments from recent trades
[Cron:Prices] Processing batch 1/3 (30 instruments)
[Cron:Prices] Job completed: { success: true, ... }
```

### 2. Common Issues

#### Problem: "Unauthorized"
**Lösung:**
```bash
# Check CRON_SECRET is set
echo $CRON_SECRET

# Verify Authorization header
curl -H "Authorization: Bearer $CRON_SECRET" ...
```

#### Problem: "Job timeout approaching"
**Lösung:**
- Reduziere `MAX_INSTRUMENTS` (z.B. auf 200)
- Erhöhe `BATCH_SIZE` (z.B. auf 40)
- Reduziere `BATCH_DELAY` (z.B. auf 500ms)

#### Problem: "Rate limit exceeded"
**Lösung:**
- Erhöhe `BATCH_DELAY` (z.B. auf 2000ms)
- Reduziere `MAX_CONCURRENT` (z.B. auf 5)
- Reduziere `BATCH_SIZE` (z.B. auf 20)

#### Problem: "No instruments found"
**Lösung:**
- Check dass Trades/Positions existieren
- Verifiziere Postgres Connection
- Test mit manueller Query:
  ```sql
  SELECT COUNT(*) FROM positions WHERE is_closed = false;
  SELECT COUNT(*) FROM trades WHERE executed_at >= NOW() - INTERVAL '30 days';
  ```

---

## 📊 Monitoring Dashboard (Konzept)

```
┌─────────────────────────────────────────────────────────────┐
│              Price Cron Job - Last Run                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: ✅ Success                                         │
│  Time: 2026-02-13 10:15:00 UTC                             │
│  Duration: 18.4s                                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Instruments                                           │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │ Total:      87                                        │  │
│  │ Processed:  87  (100%)                                │  │
│  │ Skipped:     0                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Results                                               │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │ Success:    85  (98%)                                 │  │
│  │ Errors:      2  (2%)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Cache Performance                                     │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │ Cache Hits: 72  (83%)  ████████████████████         │  │
│  │ API Calls:  15  (17%)  ████                          │  │
│  │                                                       │  │
│  │ Hit Rate: 83% (Target: >80%)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Performance                                           │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │ Avg Latency:  156ms                                   │  │
│  │ Min Latency:    8ms  (KV cache hit)                  │  │
│  │ Max Latency: 2.1s    (API call with retry)           │  │
│  │                                                       │  │
│  │ Batches:      3                                       │  │
│  │ Throttles:    2  (rate limit protection)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Next Run: 2026-02-13 10:30:00 UTC (in 14m 32s)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Best Practices

### 1. Schedule Wählen

```
Börsenzeiten (9:30-16:00 EST):  */5 * * * *   (alle 5 Min)
Off-Peak:                        */15 * * * *  (alle 15 Min)
Nachts:                          0 * * * *     (stündlich)
```

### 2. Monitoring

- Vercel Dashboard → Functions → Metrics checken
- Alarm bei Success Rate < 95%
- Alarm bei Duration > 40s

### 3. Rate Limiting

- Finnhub Free: 60 calls/min
- Job mit 10 concurrent + 1s delays = ~30-40 calls/min
- Sicher unter Limit! ✅

---

**Status:** ✅ Production-ready  
**Schedule:** */15 * * * * (Alle 15 Minuten)  
**Last Updated:** 13. Februar 2026
