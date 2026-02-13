# 🔄 Client-Polling Architektur (Vercel Hobby kompatibel)

## ✅ Migration abgeschlossen: Cron → Client-Polling

Alle Hintergrund-Jobs wurden entfernt. Kurse werden nur noch aktualisiert, wenn ein Nutzer das Dashboard aktiv nutzt.

---

## 📊 Architektur-Übersicht

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard (Client Component)                             │
│  • React + SWR                                            │
│  • Auto-refresh alle 60s                                  │
│  • "Stand: HH:MM:SS" Display                              │
│  • Grün/Rot Farbcodierung                                 │
└─────────────┬────────────────────────────────────────────┘
              │
              │ HTTP GET /api/prices?instrumentIds=uuid1,uuid2
              │
              ↓
┌──────────────────────────────────────────────────────────┐
│  API Route Handler                                        │
│  /app/api/prices/route.ts                                │
│  • Auth-Schutz (requireAuth)                              │
│  • Zod Validation                                         │
│  • DB Lookup (instruments)                                │
└─────────────┬────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────┐
│  Batch Fetcher                                            │
│  /lib/prices/fetchBatch.ts                               │
│  • Concurrency Control (p-limit: max 10)                 │
│  • Parallel fetching                                      │
│  • Per-instrument error handling                          │
│  • Metrics tracking                                       │
└─────────────┬────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────┐
│  Cache Layer                                              │
│  /lib/prices/cache.ts                                    │
│  1. Check KV: price:live:{isin}                          │
│  2. If miss → fetch from provider                         │
│  3. Store in KV (TTL: 60s)                               │
│  4. Return to caller                                      │
│  • NO database writes                                     │
└─────────────┬────────────────────────────────────────────┘
              │
              ↓ (on cache miss)
┌──────────────────────────────────────────────────────────┐
│  Price Provider                                           │
│  /lib/prices/provider.ts                                 │
│  • Interface: PriceProvider                               │
│  • Implementation: FinnhubProvider                        │
│  • API Call: getQuote({ isin, symbol })                  │
│  • Returns: PriceQuote                                    │
└──────────────────────────────────────────────────────────┘
```

---

## 🗑️ Entfernte Komponenten

### Dateien gelöscht:
1. ✅ `app/api/cron/` - Kompletter Ordner
   - `prices/route.ts` - Preis-Cron
   - `price-snapshots/route.ts` - Snapshot-Cron
   - `daily/route.ts` - Täglicher Cron
   - `hourly/route.ts` - Stündlicher Cron
   - `minute/route.ts` - Minuten-Cron

2. ✅ `lib/prices/cronJob.ts` - Cron-Service
3. ✅ `lib/prices/snapshotJob.ts` - Snapshot-Service
4. ✅ `vercel.json` - Cron-Konfiguration entfernt

### Environment Variables entfernt:
- ❌ `CRON_SECRET` - Nicht mehr benötigt

### Code-Änderungen:
- ✅ Keine DB Snapshots mehr bei Client-Requests
- ✅ Keine Hintergrund-Persistierung
- ✅ KV Cache als einzige Persistierung (temporär, 60s TTL)

---

## 🆕 Neue Komponenten

### 1. Provider Layer
**File:** `lib/prices/provider.ts` (230 Zeilen)

**Interface:**
```typescript
interface PriceProvider {
  name: string;
  getQuote(params: GetQuoteParams): Promise<PriceQuote>;
  getQuotes?(params: GetQuoteParams[]): Promise<Map<string, PriceQuote>>;
}
```

**Implementation:** `FinnhubProvider`
- API: https://finnhub.io/api/v1/quote
- Rate Limit: 60 calls/minute (Free tier)
- Timeout: 10s
- Currency: USD (default)

**Factory:**
```typescript
const provider = getPriceProvider(); // Singleton
const quote = await provider.getQuote({ isin: 'US0378331005', symbol: 'AAPL' });
```

---

### 2. Cache Layer
**File:** `lib/prices/cache.ts` (370 Zeilen)

**Features:**
- KV cache: `price:live:{isin}`
- TTL: 60 seconds
- Cache-aside pattern
- Batch operations
- No database writes

**Functions:**
```typescript
// Single price
const price = await getPrice(isin, symbol, {
  maxAge: 60,
  forceFresh: false,
});

// Batch prices
const prices = await getPrices(instruments, { maxAge: 60 });

// Cache management
await clearPriceCache(isin);
await clearAllPriceCache();
```

**Response Format:**
```typescript
interface CachedPrice {
  price: number;
  currency: string;
  asOf: Date;
  source: string;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}
```

---

### 3. Batch Fetcher
**File:** `lib/prices/fetchBatch.ts` (280 Zeilen)

**Features:**
- Concurrency control: max 10 parallel (p-limit)
- Per-instrument error handling
- Metrics tracking
- Duplicate detection

**Usage:**
```typescript
const result = await fetchPricesBatch(instruments, { maxAge: 60 });

// Result structure
{
  prices: Map<string, PriceResult>,
  metrics: {
    total: 100,
    success: 98,
    failed: 2,
    cacheHits: 85,
    apiCalls: 13,
    cacheHitRate: 85,
    durationMs: 450
  }
}
```

---

### 4. API Route
**File:** `app/api/prices/route.ts` (210 Zeilen)

**Endpoint:**
```
GET /api/prices?instrumentIds=uuid1,uuid2,uuid3
```

**Features:**
- ✅ Auth-protected (`getCurrentUser()`)
- ✅ Zod validation (max 100 instruments)
- ✅ DB lookup for instrument metadata
- ✅ Batch fetching
- ✅ Metrics in response

**Request:**
```bash
curl -H "Cookie: authjs.session-token=..." \
  'https://api.example.com/api/prices?instrumentIds=uuid1,uuid2,uuid3'
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-13T10:30:00.000Z",
  "count": 3,
  "prices": [
    {
      "instrumentId": "uuid1",
      "isin": "US0378331005",
      "symbol": "AAPL",
      "price": 175.43,
      "currency": "USD",
      "asOf": "2026-02-13T10:29:45.000Z",
      "source": "Finnhub",
      "change": 2.15,
      "changePercent": 1.24,
      "isPositive": true,
      "high": 176.50,
      "low": 173.20,
      "previousClose": 173.28
    }
  ],
  "metrics": {
    "total": 3,
    "success": 3,
    "failed": 0,
    "cacheHits": 2,
    "apiCalls": 1,
    "cacheHitRate": 67,
    "durationMs": 120
  }
}
```

---

### 5. SWR Hooks
**File:** `hooks/useLivePrices.ts` (Aktualisiert)

**Changes:**
- ✅ Neue API: `/api/prices` (statt `/api/prices/live`)
- ✅ Erweiterte Response-Typen (change, changePercent, isPositive)
- ✅ Metrics aus `metrics` (nicht `meta`)

**Usage:**
```typescript
// Multiple instruments
const { prices, isLoading, error, lastUpdate, refresh } = useLivePrices(
  ['uuid1', 'uuid2'],
  { refreshInterval: 60000 }
);

// Single instrument
const { price, isLoading, error } = useLivePrice('uuid1');
```

---

### 6. UI Components

#### A) LivePriceDisplay
**File:** `components/prices/LivePriceDisplay.tsx` (Neu, 350 Zeilen)

**Features:**
- ✅ Current price with currency
- ✅ Change indicators (↑↓)
- ✅ Green/Red color coding
- ✅ "Stand: HH:MM:SS" timestamp
- ✅ P/L calculation (decimal.js)
- ✅ Loading skeleton
- ✅ Error handling with retry

**Usage:**
```tsx
<LivePriceDisplay
  instrumentId="uuid"
  symbol="AAPL"
  quantity={10}
  avgCost={150.00}
  showRefreshIndicator={true}
  refreshInterval={60000}
/>
```

**Variants:**
- `LivePriceDisplay` - Full component
- `LivePriceBadge` - Compact badge

---

#### B) PortfolioLivePrices
**File:** `components/prices/PortfolioLivePrices.tsx` (Neu, 400 Zeilen)

**Features:**
- ✅ Table with all positions
- ✅ Live prices (batch fetch)
- ✅ P/L per position (decimal.js)
- ✅ Total portfolio value
- ✅ Color-coded gains/losses
- ✅ "Stand: HH:MM:SS" header
- ✅ Cache hit rate (dev mode)
- ✅ Manual refresh button

**Usage:**
```tsx
<PortfolioLivePrices
  positions={[
    {
      id: '1',
      instrumentId: 'uuid',
      instrumentSymbol: 'AAPL',
      instrumentName: 'Apple Inc.',
      isin: 'US0378331005',
      quantity: 10,
      avgCost: 150.00,
      currency: 'USD',
    }
  ]}
  refreshInterval={60000}
/>
```

---

## 🔧 Dependencies

### Neu installiert:
```json
{
  "dependencies": {
    "p-limit": "^7.3.0",      // Concurrency control
    "decimal.js": "^10.6.0"   // Präzise P/L Berechnungen
  }
}
```

### Bereits vorhanden:
- `swr` - React Hooks für data fetching
- `@vercel/kv` - Vercel KV (Redis) cache
- `zod` - Schema validation

---

## 🎯 Features

### ✅ Clientseitiges Polling
- Auto-refresh alle 60 Sekunden (konfigurierbar)
- Nur wenn Nutzer eingeloggt und Dashboard offen
- Keine Hintergrund-Jobs
- **Vercel Hobby Plan kompatibel** ✨

### ✅ Echtzeit-Anzeige
- "Stand: HH:MM:SS" mit Sekundenanzeige
- Grüner Puls-Indikator (Live)
- Manueller Refresh-Button
- Loading-States (Skeleton)

### ✅ P/L Berechnung
- **decimal.js** - Keine Float-Fehler
- Per Position: Wert, Kosten, G/V, G/V %
- Total Portfolio: Summe aller Positionen
- Color-coded: Grün (Gewinn), Rot (Verlust)

### ✅ Change Indicators
- Absolut: +2.15 EUR / -0.85 USD
- Prozent: +1.24% / -0.54%
- Icons: ↑ (grün) / ↓ (rot)
- Previous close Vergleich

### ✅ Performance
- Batch Fetching (1 Request für alle Positionen)
- KV Cache (60s TTL, >90% Hit Rate)
- Concurrency Limit (max 10 parallel API calls)
- Typical response: <100ms (cache hit)

### ✅ Error Handling
- Per-instrument error tracking
- Retry mechanism (SWR: 3 retries, 5s interval)
- Graceful degradation (zeigt alte Daten bei Fehler)
- User-friendly Fehlermeldungen

---

## 🚀 Deployment

### Environment Variables

**Required:**
```env
FINNHUB_API_KEY=your_api_key_here
```

**Get API Key:**
https://finnhub.io/register (Free tier: 60 calls/min)

**Optional:**
```env
NODE_ENV=production
```

### Vercel Setup

1. **Add Environment Variable:**
   ```bash
   vercel env add FINNHUB_API_KEY
   # Paste your API key
   ```

2. **Deploy:**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

3. **Verify:**
   ```bash
   # Test API endpoint
   curl -H "Cookie: authjs.session-token=..." \
     'https://your-app.vercel.app/api/prices?instrumentIds=uuid1'
   ```

---

## 📊 Performance Metrics

### Expected Performance:

| Metric | Value |
|--------|-------|
| API Response (cache hit) | <50ms |
| API Response (cache miss) | 100-500ms |
| Cache Hit Rate | >90% (after warm-up) |
| Batch Fetch (10 instruments) | <200ms |
| Batch Fetch (100 instruments) | <2s |
| SWR Refresh Interval | 60s |
| KV Cache TTL | 60s |
| Provider API Timeout | 10s |
| Concurrency Limit | 10 parallel |

### Monitoring:

```typescript
const { prices, isLoading, metrics } = useLivePrices(ids);

console.log({
  cacheHitRate: metrics?.cacheHitRate,  // 0-100%
  durationMs: metrics?.durationMs,      // Response time
  apiCalls: metrics?.apiCalls,          // Provider calls made
});
```

---

## 🧪 Testing

### Local Development

```bash
# Start dev server
pnpm dev

# Open dashboard
http://localhost:3000/dashboard

# Watch console for:
[SWR] Fetching prices...
[SWR] Prices updated (60s interval)
```

### Test Scenarios

1. **Initial Load**
   - Should show loading skeleton
   - Then populate with prices
   - "Stand: HH:MM:SS" updates

2. **Auto-Refresh (60s)**
   - Wait 60 seconds
   - Should see refresh indicator
   - Prices update automatically
   - Cache hit rate increases

3. **Manual Refresh**
   - Click refresh button
   - Should see loading state
   - Prices update immediately
   - Force cache refresh

4. **Error Handling**
   - Stop Finnhub API (invalid key)
   - Should show error message
   - Click retry
   - Should attempt refetch

5. **P/L Calculation**
   - Enter avgCost + quantity
   - Should show correct G/V
   - Green if positive, red if negative
   - Percentage matches absolute

---

## 🔍 Troubleshooting

### Problem: "Prices not loading"

**Check:**
```bash
# 1. Verify auth
curl -v 'http://localhost:3000/api/prices?instrumentIds=uuid1'
# Should return 401 if not logged in

# 2. Check Finnhub API key
echo $FINNHUB_API_KEY
# Should not be empty

# 3. Test provider directly
curl 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY'
# Should return quote data
```

---

### Problem: "Cache hit rate very low (<50%)"

**Cause:** Cold cache or frequent force refreshes

**Solution:**
```typescript
// Increase cache TTL
const CACHE_CONFIG = {
  TTL: 120, // 2 minutes instead of 60s
};

// Or: Reduce refresh interval
<PortfolioLivePrices refreshInterval={120000} />
```

---

### Problem: "Slow response times (>1s)"

**Check:**
1. Network tab: Are all API calls going through?
2. Console: Check `metrics.durationMs`
3. KV status: Is Vercel KV working?

**Solutions:**
- Reduce concurrency: `MAX_CONCURRENT: 5`
- Increase cache maxAge: `maxAge: 120`
- Check Finnhub rate limits

---

### Problem: "Decimal calculation errors"

**Example:**
```typescript
// ❌ Bad: Float arithmetic
const pl = (currentPrice - avgCost) * quantity; // 0.100000000001

// ✅ Good: decimal.js
const pl = new Decimal(currentPrice).minus(avgCost).times(quantity).toNumber();
```

---

## 📈 Optimizations

### 1. Batch Size

```typescript
// Limit batch size for faster response
const limitedPositions = positions.slice(0, 50);
<PortfolioLivePrices positions={limitedPositions} />
```

### 2. Conditional Fetching

```typescript
// Only fetch when visible
const isVisible = usePageVisibility();
const { prices } = useLivePrices(ids, {
  refreshEnabled: isVisible,
});
```

### 3. Cache Prewarming

```bash
# Cron alternative: GitHub Actions (hourly)
name: Prewarm Cache
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  prewarm:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST 'https://api.example.com/api/admin/prewarm-cache' \
            -H 'Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}'
```

---

## 📚 API Reference

### GET /api/prices

**Query Parameters:**
- `instrumentIds` (required): Comma-separated UUIDs (max 100)

**Headers:**
- `Cookie: authjs.session-token=...` (Auth required)

**Response:**
```typescript
interface Response {
  success: boolean;
  timestamp: string;
  count: number;
  prices: LivePrice[];
  errors?: Array<{ instrumentId: string; error: string }>;
  metrics: {
    total: number;
    success: number;
    failed: number;
    cacheHits: number;
    apiCalls: number;
    cacheHitRate: number;
    durationMs: number;
  };
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (bad UUIDs, too many instruments)
- `401` - Unauthorized (not logged in)
- `404` - Instruments not found
- `500` - Server error

---

## ✅ Migration Checklist

- [x] Entferne Cron-Jobs (`app/api/cron/`)
- [x] Entferne Cron-Service (`lib/prices/cronJob.ts`)
- [x] Entferne Snapshot-Service (`lib/prices/snapshotJob.ts`)
- [x] Entferne vercel.json Cron-Config
- [x] Entferne CRON_SECRET Environment Variable
- [x] Erstelle Provider Layer (`lib/prices/provider.ts`)
- [x] Erstelle Cache Layer (`lib/prices/cache.ts`)
- [x] Erstelle Batch Fetcher (`lib/prices/fetchBatch.ts`)
- [x] Erstelle API Route (`app/api/prices/route.ts`)
- [x] Update SWR Hooks (`hooks/useLivePrices.ts`)
- [x] Erstelle LivePriceDisplay Komponente
- [x] Erstelle PortfolioLivePrices Komponente
- [x] Installiere Dependencies (p-limit, decimal.js)
- [x] Test local development
- [ ] Deploy to Vercel
- [ ] Verify production functionality
- [ ] Monitor performance metrics

---

**Status:** ✅ **Implementierung abgeschlossen**  
**Stack:** Next.js 16 + SWR + Vercel KV + Finnhub API  
**Compatible:** Vercel Hobby Plan ✨  
**Last Updated:** 13. Februar 2026
