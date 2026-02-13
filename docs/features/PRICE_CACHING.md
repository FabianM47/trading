# 💰 Price Caching Implementation

Zweistufige Caching-Strategie für Kursdaten mit Vercel KV (hot cache) und Postgres (cold storage).

## 📋 Inhaltsverzeichnis

1. [Architektur](#architektur)
2. [Komponenten](#komponenten)
3. [Usage](#usage)
4. [Cron Job Setup](#cron-job-setup)
5. [API Routes](#api-routes)
6. [Monitoring](#monitoring)

---

## 🏗️ Architektur

### Caching-Strategie

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  lib/prices/getPrice.ts             │
│                                     │
│  1. Check KV Cache (TTL 60s)       │
│     └─> Fresh? Return immediately   │
│                                     │
│  2. Fetch from Provider API         │
│     └─> Finnhub, rate-limited      │
│                                     │
│  3. Store in both:                  │
│     ├─> KV (hot, 60s TTL)          │
│     └─> Postgres (cold, forever)   │
│                                     │
│  4. Return to client                │
└─────────────────────────────────────┘
```

### Daten-Flow

| Cache Level | Purpose | TTL | Use Cases |
|-------------|---------|-----|-----------|
| **Vercel KV** | Live quotes | 60s | Trade forms, portfolio valuation, real-time displays |
| **Postgres** | Historical data | ∞ | Charts, reports, tax calculations, audits |

---

## 🧩 Komponenten

### 1. `lib/prices/getPrice.ts`

Hauptfunktion zum Abrufen von Kursdaten.

**Features:**
- ✅ Vercel KV Cache (hot)
- ✅ Provider API Fallback (Finnhub)
- ✅ Postgres Fallback (DB)
- ✅ Async persistence (KV + DB)
- ✅ Batch fetching (for portfolios)
- ✅ Error handling

**Functions:**

```typescript
// Single price
const price = await getPrice(instrumentId);

// With options
const freshPrice = await getPrice(instrumentId, {
  forceFresh: true,    // Skip cache, fetch from API
  skipDb: true,        // Don't fallback to DB
  maxAge: 120,         // Accept 2-minute-old cache
});

// Batch prices (optimized)
const prices = await getPrices([id1, id2, id3]);

// By ISIN
const price = await getPriceByISIN('US0378331005');

// By Symbol
const price = await getPriceBySymbol('AAPL');
```

**Return Type:**

```typescript
interface PriceData {
  price: number;           // 175.43
  currency: string;        // "USD"
  asOf: Date;             // When captured
  source: string;         // "Finnhub"
  quote?: StockQuote;     // Full quote data
  cacheLevel: 'kv' | 'db' | 'api';  // Where it came from
}
```

---

### 2. `lib/prices/snapshotJob.ts`

Background job zum Persistieren von Snapshots.

**Features:**
- ✅ Batch processing (50 instruments/batch)
- ✅ Rate limiting (1s delay between batches)
- ✅ Timeout protection (50s max)
- ✅ Error handling per instrument
- ✅ Statistics & monitoring

**Functions:**

```typescript
// Automatic (all active instruments)
const result = await savePriceSnapshots();

// Manual (specific instruments)
const result = await saveSnapshotsForInstruments([id1, id2]);

// Statistics
const stats = await getSnapshotStats();
```

**Job Result:**

```typescript
interface SnapshotJobResult {
  success: boolean;
  totalInstruments: number;
  successCount: number;
  errorCount: number;
  duration: number;
  errors: Array<{ instrumentId: string; error: string }>;
}
```

---

### 3. `app/api/cron/price-snapshots/route.ts`

Cron Job API Route für periodische Snapshots.

**Endpoints:**
- `POST /api/cron/price-snapshots` - Triggered by Vercel Cron
- `GET /api/cron/price-snapshots` - Manual trigger (requires auth)

**Security:**
- Vercel Cron Secret Header (`x-vercel-cron-secret`)
- Custom `CRON_SECRET` environment variable

---

## 🚀 Usage

### In Components/API Routes

```typescript
import { getPrice, getPrices } from '@/lib/prices/getPrice';

// Single instrument
async function getCurrentPrice(instrumentId: string) {
  const price = await getPrice(instrumentId);
  
  console.log(`Current price: ${price.price} ${price.currency}`);
  console.log(`As of: ${price.asOf}`);
  console.log(`Cache level: ${price.cacheLevel}`); // kv, db, or api
}

// Portfolio valuation (batch)
async function valuatePortfolio(positions: Position[]) {
  const instrumentIds = positions.map(p => p.instrumentId);
  const prices = await getPrices(instrumentIds);
  
  let totalValue = 0;
  for (const position of positions) {
    const price = prices.get(position.instrumentId);
    if (price) {
      totalValue += parseFloat(position.totalQuantity) * price.price;
    }
  }
  
  return totalValue;
}

// Force fresh data (e.g., before trade execution)
async function getLatestPrice(instrumentId: string) {
  const price = await getPrice(instrumentId, {
    forceFresh: true,  // Skip cache, fetch from API
  });
  
  return price;
}
```

---

## ⏰ Cron Job Setup

### 1. Vercel Configuration

File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/price-snapshots",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule Options:**

| Cron Expression | Description | Use Case |
|----------------|-------------|----------|
| `0 * * * *` | Every hour | Production (recommended) |
| `*/15 * * * *` | Every 15 minutes | Active trading hours |
| `0 9 * * *` | Daily at 9am UTC | End-of-day snapshots |
| `0 0 * * 0` | Weekly (Sunday midnight) | Weekly reports |

### 2. Environment Variables

Add to `.env.local` (development) and Vercel Environment Variables (production):

```bash
# Optional: Custom cron secret for manual triggers
CRON_SECRET=your-secret-key-here
```

### 3. Manual Trigger (Development)

```bash
# Without authentication (development only)
curl -X POST http://localhost:3000/api/cron/price-snapshots

# With authentication (production)
curl -X POST https://your-app.vercel.app/api/cron/price-snapshots \
  -H "Authorization: Bearer your-secret-key"
```

### 4. Monitoring

Check logs in Vercel Dashboard:
- Functions → price-snapshots
- Look for: `[Cron] Price snapshot job completed`

---

## 📡 API Routes

### Get Current Price

**Existing Route:** `GET /api/stocks/quote`

```typescript
// Example: Update to use new getPrice
import { getPriceBySymbol } from '@/lib/prices/getPrice';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  const price = await getPriceBySymbol(symbol);
  
  return Response.json({
    symbol,
    price: price.price,
    currency: price.currency,
    asOf: price.asOf,
    cacheLevel: price.cacheLevel, // kv, db, or api
  });
}
```

### Historical Prices

**New Route:** `GET /api/prices/history`

```typescript
// app/api/prices/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { priceSnapshots } from '@/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instrumentId = searchParams.get('instrumentId');
  const from = searchParams.get('from'); // ISO date
  const to = searchParams.get('to');     // ISO date
  
  if (!instrumentId) {
    return NextResponse.json(
      { error: 'instrumentId required' },
      { status: 400 }
    );
  }
  
  // Query snapshots
  const snapshots = await db.query.priceSnapshots.findMany({
    where: and(
      eq(priceSnapshots.instrumentId, instrumentId),
      from ? gte(priceSnapshots.snapshotAt, new Date(from)) : undefined,
      to ? lte(priceSnapshots.snapshotAt, new Date(to)) : undefined
    ),
    orderBy: [priceSnapshots.snapshotAt],
    limit: 1000,
  });
  
  return NextResponse.json({
    instrumentId,
    count: snapshots.length,
    snapshots: snapshots.map(s => ({
      price: parseFloat(s.price),
      currency: s.currency,
      source: s.source,
      timestamp: s.snapshotAt,
    })),
  });
}
```

---

## 📊 Monitoring

### 1. Check Cache Status

```typescript
import { getSnapshotStats } from '@/lib/prices/snapshotJob';

const stats = await getSnapshotStats();
console.log({
  totalSnapshots: stats.totalSnapshots,
  uniqueInstruments: stats.uniqueInstruments,
  oldestSnapshot: stats.oldestSnapshot,
  newestSnapshot: stats.newestSnapshot,
  avgSnapshotsPerInstrument: stats.avgSnapshotsPerInstrument,
});
```

### 2. Clear Cache (Debugging)

```typescript
import { clearPriceCache } from '@/lib/prices/getPrice';

// Clear KV cache for specific instrument
await clearPriceCache(instrumentId);
```

### 3. Database Queries

```sql
-- Total snapshots
SELECT COUNT(*) FROM price_snapshots;

-- Snapshots per instrument
SELECT 
  i.symbol,
  i.name,
  COUNT(*) as snapshot_count,
  MAX(ps.snapshot_at) as latest_snapshot
FROM price_snapshots ps
JOIN instruments i ON ps.instrument_id = i.id
GROUP BY i.id, i.symbol, i.name
ORDER BY snapshot_count DESC;

-- Recent snapshots (last hour)
SELECT 
  i.symbol,
  ps.price,
  ps.currency,
  ps.source,
  ps.snapshot_at
FROM price_snapshots ps
JOIN instruments i ON ps.instrument_id = i.id
WHERE ps.snapshot_at >= NOW() - INTERVAL '1 hour'
ORDER BY ps.snapshot_at DESC;
```

---

## 🔧 Configuration

### Caching Settings

File: `lib/prices/getPrice.ts`

```typescript
const CACHE_CONFIG = {
  KV_TTL: 60,                    // KV cache TTL (seconds)
  FRESH_THRESHOLD: 60,           // Max age for "fresh" data
  DB_RECENT_THRESHOLD: 300,      // Max age for DB fallback (5 min)
  KV_PREFIX: 'price:live:',      // KV key prefix
};
```

### Job Settings

File: `lib/prices/snapshotJob.ts`

```typescript
const JOB_CONFIG = {
  BATCH_SIZE: 50,              // Instruments per batch
  BATCH_DELAY: 1000,           // Delay between batches (ms)
  MAX_INSTRUMENTS: 200,        // Max instruments per run
  JOB_TIMEOUT: 50000,          // Job timeout (50s)
};
```

---

## ✅ Best Practices

### 1. When to use `forceFresh`

```typescript
// ❌ Bad: Always forcing fresh (wastes API calls)
const price = await getPrice(id, { forceFresh: true });

// ✅ Good: Only force fresh for critical operations
async function executeTrade(instrumentId: string) {
  // Get latest price before trade
  const price = await getPrice(instrumentId, { forceFresh: true });
  
  // Execute trade with fresh price
  await createTrade({ price: price.price, ... });
}
```

### 2. Batch fetching for portfolios

```typescript
// ❌ Bad: Sequential fetches (slow)
for (const position of positions) {
  const price = await getPrice(position.instrumentId);
}

// ✅ Good: Batch fetch (fast, parallel)
const instrumentIds = positions.map(p => p.instrumentId);
const prices = await getPrices(instrumentIds);
```

### 3. Error handling

```typescript
try {
  const price = await getPrice(instrumentId);
} catch (error) {
  // Price unavailable - decide on fallback strategy
  console.error('Price fetch failed:', error);
  
  // Option 1: Use last known price from DB
  // Option 2: Show error to user
  // Option 3: Skip this instrument
}
```

---

## 🚨 Troubleshooting

### Cron not running

1. Check `vercel.json` syntax
2. Verify deployment (crons only work in production)
3. Check Vercel Dashboard → Settings → Cron Jobs

### Prices not updating

1. Check API key: `FINNHUB_API_KEY` in environment
2. Check rate limits: Finnhub free = 60 calls/min
3. Check logs for errors

### KV cache not working

1. Verify Vercel KV is enabled in project
2. Check environment variables: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
3. Test with `await kv.set('test', 'value')`

---

**Status:** ✅ Production-ready  
**Last Updated:** 13. Februar 2026
