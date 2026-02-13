# 🔄 Live Price Updates - Dashboard Implementation

Automatische Preisaktualisierung im Dashboard mit SWR.

## 📋 Übersicht

### Features
- ✅ Auto-Refresh alle 60 Sekunden
- ✅ "Stand: hh:mm" Zeitstempel
- ✅ Loading-States
- ✅ Error-Handling mit Retry
- ✅ Batch-Fetching (effizient)
- ✅ KV Cache (keine DB Writes)
- ✅ Status-Indicator (Live/Loading/Error)
- ✅ Manuelle Refresh-Option

---

## 🏗️ Architektur

### Data Flow

```
Client Component (60s interval)
       ↓
useLivePrices Hook (SWR)
       ↓
GET /api/prices/live?instrumentIds=id1,id2
       ↓
lib/prices/getPrice.ts
       ↓
KV Cache (60s TTL)
       ↓ (if miss)
API Provider (Finnhub)
       ↓
Return to Client
```

**Wichtig:** Keine DB Writes bei Client-Requests!
- Nur Reads aus KV Cache
- Falls Cache miss: API Call, aber keine DB Persistierung
- DB Writes nur via Cron Job (alle 15 Min)

---

## 📁 Neue Dateien

### 1. API Route (100 Zeilen)

**File:** `app/api/prices/live/route.ts`

```typescript
GET /api/prices/live?instrumentIds=uuid1,uuid2,uuid3
```

**Features:**
- Batch fetching (bis 100 Instrumente)
- Validation mit Zod
- KV cache only (`skipDb: true`)
- Fast response (<50ms typical)
- Returns timestamp + cache stats

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-13T10:30:00.000Z",
  "count": 3,
  "prices": [
    {
      "instrumentId": "uuid",
      "price": 175.43,
      "currency": "USD",
      "asOf": "2026-02-13T10:29:45.000Z",
      "source": "Finnhub",
      "cacheLevel": "kv"
    }
  ],
  "meta": {
    "oldestAgeSeconds": 15,
    "cacheHitRate": 100
  }
}
```

---

### 2. SWR Hooks (230 Zeilen)

**File:** `hooks/useLivePrices.ts`

#### Main Hook: `useLivePrices()`

```typescript
const {
  prices,           // Array of live prices
  isLoading,        // Loading state
  error,            // Error object
  lastUpdate,       // Date of last update
  oldestAge,        // Oldest price age (seconds)
  cacheHitRate,     // Cache hit % (0-100)
  refresh,          // Manual refresh function
  isStale,          // true if >60s old
} = useLivePrices(
  ['uuid1', 'uuid2'],
  {
    refreshInterval: 60000,      // 60s
    refreshEnabled: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  }
);
```

#### Single Price Hook: `useLivePrice()`

```typescript
const { price, isLoading, error } = useLivePrice('uuid');
```

**SWR Configuration:**
- `refreshInterval: 60000` - Auto-refresh every 60s
- `dedupingInterval: 5000` - Dedupe requests within 5s
- `errorRetryCount: 3` - Retry 3 times on error
- `errorRetryInterval: 5000` - 5s between retries

---

### 3. UI Components (650 Zeilen)

#### A) LivePriceDisplay

**File:** `components/prices/LivePriceDisplay.tsx`

**Usage:**
```tsx
<LivePriceDisplay
  instrumentId="uuid"
  showRefreshIndicator={true}
  showTimestamp={true}
  compact={false}
  refreshInterval={60000}
/>
```

**Features:**
- Price mit Currency
- "Stand: hh:mm" timestamp
- Loading skeleton
- Error state mit retry
- Stale warning (>60s)
- Cache level indicator (Dev)

**Variants:**
- `LivePriceCompact` - Smaller version
- `LivePriceBadge` - Badge format

---

#### B) PortfolioLivePrices

**File:** `components/prices/PortfolioLivePrices.tsx`

**Usage:**
```tsx
<PortfolioLivePrices
  positions={[
    {
      id: '1',
      instrumentId: 'uuid',
      instrumentSymbol: 'AAPL',
      instrumentName: 'Apple Inc.',
      quantity: 10,
      currency: 'USD',
    }
  ]}
  refreshInterval={60000}
/>
```

**Features:**
- Table mit allen Positionen
- Live prices per row
- Total value calculation
- Loading states per row
- Status header mit "Stand: hh:mm"
- Cache hit rate (Dev)

---

#### C) LivePriceStatus

**File:** `components/prices/LivePriceStatus.tsx`

**Usage:**
```tsx
<LivePriceStatus
  instrumentIds={['uuid1', 'uuid2']}
  refreshInterval={60000}
/>
```

**Features:**
- Status indicator (Live/Loading/Error)
- "Stand: hh:mm:ss" timestamp
- Manual refresh button
- Stale warning
- Cache stats (Dev)

**Variants:**
- `LivePriceStatusCompact` - Minimal version

---

### 4. Dashboard Example (280 Zeilen)

**Files:**
- `app/dashboard/page.tsx` - Server component
- `app/dashboard/dashboard-client.tsx` - Client component

**Features:**
- Header mit Status indicator
- Portfolio table mit live prices
- Individual price cards
- Info banners
- User button

---

## 🚀 Usage

### Basic Implementation

```tsx
'use client';

import { useLivePrices } from '@/hooks/useLivePrices';

export function MyDashboard({ positions }) {
  const instrumentIds = positions.map(p => p.instrumentId);
  
  const { prices, isLoading, error, lastUpdate } = useLivePrices(
    instrumentIds,
    { refreshInterval: 60000 }
  );
  
  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div>Fehler: {error.message}</div>;
  
  return (
    <div>
      <p>Stand: {lastUpdate?.toLocaleTimeString()}</p>
      {prices?.map(price => (
        <div key={price.instrumentId}>
          {price.price} {price.currency}
        </div>
      ))}
    </div>
  );
}
```

---

### Full Dashboard

```tsx
// app/dashboard/page.tsx
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const user = await requireAuth();
  
  // Load user's positions
  const userPositions = await db.query.positions.findMany({
    where: eq(positions.userId, user.id),
    with: {
      instrument: true,
    },
  });
  
  return <DashboardClient positions={userPositions} user={user} />;
}
```

```tsx
// app/dashboard/dashboard-client.tsx
'use client';

import { LivePriceStatus } from '@/components/prices/LivePriceStatus';
import { PortfolioLivePrices } from '@/components/prices/PortfolioLivePrices';

export function DashboardClient({ positions, user }) {
  const instrumentIds = positions.map(p => p.instrumentId);
  
  return (
    <div>
      <header>
        <h1>Dashboard</h1>
        <LivePriceStatus instrumentIds={instrumentIds} />
      </header>
      
      <main>
        <PortfolioLivePrices positions={positions} />
      </main>
    </div>
  );
}
```

---

## ⚙️ Configuration

### Refresh Interval

```typescript
// 60 seconds (default)
<LivePriceDisplay instrumentId="uuid" refreshInterval={60000} />

// 30 seconds (faster)
<LivePriceDisplay instrumentId="uuid" refreshInterval={30000} />

// 2 minutes (slower)
<LivePriceDisplay instrumentId="uuid" refreshInterval={120000} />

// Disable auto-refresh
const { prices } = useLivePrices(ids, { refreshEnabled: false });
```

### Error Handling

```typescript
const { prices, error, refresh } = useLivePrices(ids);

if (error) {
  return (
    <div>
      <p>Fehler beim Laden: {error.message}</p>
      <button onClick={refresh}>Erneut versuchen</button>
    </div>
  );
}
```

### Manual Refresh

```typescript
const { refresh } = useLivePrices(ids);

<button onClick={refresh}>
  Jetzt aktualisieren
</button>
```

---

## 📊 Performance

### Expected Metrics

| Metric | Value |
|--------|-------|
| API Response Time | <50ms (KV cache) |
| Cache Hit Rate | >90% (after warm-up) |
| Client Memory | ~1KB per instrument |
| Network Traffic | ~500B per instrument |
| Re-render Frequency | Every 60s |

### Optimization Tips

1. **Batch Fetching**
   ```typescript
   // ❌ Bad: Multiple requests
   positions.map(p => useLivePrice(p.instrumentId));
   
   // ✅ Good: Single batch request
   const instrumentIds = positions.map(p => p.instrumentId);
   useLivePrices(instrumentIds);
   ```

2. **Deduplication**
   - SWR automatically deduplicates requests within 5s
   - Multiple components using same data share request

3. **Conditional Fetching**
   ```typescript
   // Only fetch when needed
   const instrumentIds = isVisible ? positions.map(p => p.id) : [];
   useLivePrices(instrumentIds);
   ```

---

## 🚨 Error Handling

### Error Types

1. **Network Error**
   - Auto-retry 3 times (5s intervals)
   - Shows error state
   - Manual refresh available

2. **Validation Error (400)**
   - Invalid UUIDs
   - Too many instruments (>100)
   - No retry

3. **Server Error (500)**
   - Retries automatically
   - Fallback to stale data (if available)

### Error UI States

```tsx
{isLoading && !prices && <LoadingSkeleton />}
{error && !prices && <ErrorWithRetry />}
{error && prices && <StaleDataWarning />}
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
[SWR] Prices updated
```

### Test Scenarios

1. **Initial Load**
   - Should show loading skeleton
   - Then populate with prices
   - "Stand: hh:mm" should update

2. **Auto-Refresh**
   - Wait 60 seconds
   - Should see refresh indicator spin
   - Prices update automatically

3. **Manual Refresh**
   - Click refresh button
   - Should see loading state
   - Prices update immediately

4. **Error Handling**
   - Stop API server
   - Should show error state
   - Click retry
   - Should attempt refetch

5. **Stale Data**
   - Wait >60s without refresh
   - Should see orange warning
   - Timestamp shows old time

---

## 📈 Monitoring

### Client-Side Metrics

```typescript
const { lastUpdate, cacheHitRate, oldestAge } = useLivePrices(ids);

console.log({
  lastUpdate,           // Date
  cacheHitRate,         // 0-100
  oldestAge,           // seconds
});
```

### Development Indicators

- **💾 Cache** - Data from KV cache
- **🌐 API** - Fresh data from API
- **🗄️ DB** - Fallback from database

### SWR DevTools

```bash
# Add to package.json (optional)
pnpm add -D @swr-devtools/standalone

# Add to app
import { SWRDevTools } from '@swr-devtools/standalone';
<SWRDevTools />
```

---

## ✅ Best Practices

### 1. Server vs Client Components

```tsx
// ❌ Bad: Use SWR in Server Component
export default async function Page() {
  const { prices } = useLivePrices(ids); // Error!
}

// ✅ Good: Split into Server + Client
// page.tsx (Server)
export default async function Page() {
  const positions = await db.query.positions.findMany();
  return <DashboardClient positions={positions} />;
}

// dashboard-client.tsx (Client)
'use client';
export function DashboardClient({ positions }) {
  const ids = positions.map(p => p.instrumentId);
  const { prices } = useLivePrices(ids);
  // ...
}
```

### 2. Conditional Rendering

```tsx
// Show skeleton while loading
{isLoading && !prices && <Skeleton />}

// Show stale data with warning
{isLoading && prices && <StaleWarning />}

// Show error with retry
{error && !prices && <ErrorRetry />}

// Show fresh data
{prices && !error && <PriceTable prices={prices} />}
```

### 3. Accessibility

```tsx
<button
  onClick={refresh}
  aria-label="Preise aktualisieren"
  disabled={isLoading}
>
  <RefreshIcon aria-hidden="true" />
</button>

<time dateTime={lastUpdate?.toISOString()}>
  Stand: {lastUpdate?.toLocaleTimeString()}
</time>
```

---

## 🔧 Troubleshooting

### Problem: "Prices not updating"

**Check:**
```tsx
// 1. Verify refreshInterval is set
const { prices } = useLivePrices(ids, {
  refreshInterval: 60000,  // Must be > 0
  refreshEnabled: true,    // Must be true
});

// 2. Check browser console for errors
// 3. Verify API route returns data
// 4. Check KV cache is working
```

### Problem: "Too many re-renders"

**Solution:**
```tsx
// ❌ Bad: Creates new array every render
useLivePrices(positions.map(p => p.id));

// ✅ Good: Memoize array
const instrumentIds = useMemo(
  () => positions.map(p => p.id),
  [positions]
);
useLivePrices(instrumentIds);
```

### Problem: "Stale data shown"

**Check:**
```tsx
const { isStale, oldestAge, lastUpdate } = useLivePrices(ids);

console.log({
  isStale,      // true if >60s
  oldestAge,    // Age in seconds
  lastUpdate,   // Last update timestamp
});

// Manual refresh if stale
if (isStale) {
  await refresh();
}
```

---

## 📊 Statistik

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| API Route | `app/api/prices/live/route.ts` | 100 | ✅ |
| SWR Hooks | `hooks/useLivePrices.ts` | 230 | ✅ |
| LivePriceDisplay | `components/prices/LivePriceDisplay.tsx` | 220 | ✅ |
| PortfolioLivePrices | `components/prices/PortfolioLivePrices.tsx` | 250 | ✅ |
| LivePriceStatus | `components/prices/LivePriceStatus.tsx` | 180 | ✅ |
| Dashboard Example | `app/dashboard/*.tsx` | 280 | ✅ |
| **Total** | **6** | **~1,260** | **✅** |

---

**Status:** ✅ Production-ready  
**Tech Stack:** SWR 2.4 + Next.js 16 + TypeScript  
**Last Updated:** 13. Februar 2026
