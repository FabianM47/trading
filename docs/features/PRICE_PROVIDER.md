# 📈 Stock Price Provider Implementation

## 📋 Overview

Saubere Provider-Abstraktion für Echtzeit-Kursdaten mit Finnhub als erstem Provider.

### Features:
- ✅ **Provider Interface** - Austauschbare Implementierungen
- ✅ **Finnhub Provider** - 60 calls/min (kostenlos)
- ✅ **Rate Limiting** - Client-side (60/min) + Server-side (API Route)
- ✅ **Retry Logic** - Exponential backoff bei Fehlern
- ✅ **Caching** - Vercel KV (60s TTL)
- ✅ **Error Handling** - Typed errors mit retry flags
- ✅ **ISIN Support** - Automatisches Mapping via Cache
- ✅ **Symbol Search** - Suche nach Name oder Symbol
- ✅ **Unit Tests** - 30+ Tests mit Vitest
- ✅ **TypeScript** - Vollständig typisiert

---

## 🚀 Quick Start

### 1. API Key holen:
```bash
# Finnhub (kostenlos)
https://finnhub.io/register

# In .env.local eintragen:
FINNHUB_API_KEY=your-api-key-here
```

### 2. Provider nutzen:

```typescript
import { createFinnhubProvider } from '@/lib/services/finnhub-provider';

// Provider erstellen
const provider = createFinnhubProvider();

// Quote by Symbol
const quote = await provider.getQuoteBySymbol('AAPL');
console.log(quote);
// {
//   price: 175.43,
//   currency: 'USD',
//   asOf: Date('2024-02-13T10:00:00Z'),
//   symbol: 'AAPL',
//   previousClose: 173.28,
//   change: 2.15,
//   changePercent: 1.24,
//   high: 176.82,
//   low: 173.50
// }

// Quote by ISIN
const quote = await provider.getQuoteByISIN('US0378331005');

// Auto-detect (ISIN oder Symbol)
const quote = await provider.getQuote('AAPL');

// Search
const results = await provider.searchStocks('Apple');
```

### 3. API Routes nutzen:

```bash
# Get quote by symbol
curl http://localhost:3000/api/stocks/quote?symbol=AAPL

# Get quote by ISIN
curl http://localhost:3000/api/stocks/quote?isin=US0378331005

# Search stocks
curl http://localhost:3000/api/stocks/search?q=Apple
```

---

## 📦 Dateistruktur

```
lib/services/
├── price-provider.interface.ts    # Abstract interface
├── finnhub-provider.ts            # Finnhub implementation
└── __tests__/
    ├── price-provider.test.ts     # Interface helper tests
    └── finnhub-provider.test.ts   # Provider tests (30+ tests)

app/api/stocks/
├── quote/
│   └── route.ts                   # GET /api/stocks/quote
└── search/
    └── route.ts                   # GET /api/stocks/search

vitest.config.ts                   # Vitest configuration
```

---

## 🔌 Provider Interface

```typescript
interface PriceProvider {
  readonly name: string;

  // Fetch quote
  getQuoteByISIN(isin: string): Promise<StockQuote>;
  getQuoteBySymbol(symbol: string, exchange?: string): Promise<StockQuote>;
  getQuote(identifier: string): Promise<StockQuote>;

  // Search (optional)
  searchStocks?(query: string): Promise<SearchResult[]>;

  // Health check (optional)
  healthCheck?(): Promise<boolean>;
}

interface StockQuote {
  price: number;
  currency: string;
  asOf: Date;
  symbol?: string;
  isin?: string;
  exchange?: string;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  volume?: number;
}
```

---

## ⚙️ Konfiguration

### Provider Configuration:

```typescript
import { FinnhubPriceProvider } from '@/lib/services/finnhub-provider';

const provider = new FinnhubPriceProvider({
  apiKey: process.env.FINNHUB_API_KEY!,
  baseUrl: 'https://finnhub.io/api/v1', // Optional
  timeout: 5000,                         // 5 seconds
  maxRetries: 3,                         // Max retry attempts
  retryDelay: 1000,                      // 1 second between retries
  enableCache: true,                     // Enable Vercel KV cache
  cacheTTL: 60,                          // 60 seconds cache
});
```

### Factory Function (empfohlen):

```typescript
import { createFinnhubProvider } from '@/lib/services/finnhub-provider';

// Nutzt FINNHUB_API_KEY aus .env.local
const provider = createFinnhubProvider();

// Mit custom config
const provider = createFinnhubProvider({
  timeout: 3000,
  enableCache: false,
});
```

---

## 🛡️ Error Handling

### Error Types:

```typescript
class PriceProviderError extends Error {
  provider: string;    // 'Finnhub'
  code: string;        // 'UNAUTHORIZED', 'NOT_FOUND', 'RATE_LIMIT_EXCEEDED', etc.
  statusCode?: number; // HTTP status code
  retryable: boolean;  // True if error can be retried
}
```

### Error Codes:

| Code | Status | Retryable | Description |
|------|--------|-----------|-------------|
| `INVALID_IDENTIFIER` | - | ❌ | Identifier ist weder ISIN noch Symbol |
| `UNAUTHORIZED` | 401 | ❌ | Ungültiger API Key |
| `NOT_FOUND` | 404 | ❌ | Symbol/ISIN nicht gefunden |
| `NO_DATA` | 404 | ❌ | Keine Kursdaten verfügbar |
| `RATE_LIMIT_EXCEEDED` | 429 | ✅ | API Rate Limit überschritten |
| `TIMEOUT` | - | ✅ | Request timeout |
| `API_ERROR` | 5xx | ✅ | Server error |

### Error Handling:

```typescript
try {
  const quote = await provider.getQuote('AAPL');
} catch (error) {
  if (error instanceof PriceProviderError) {
    console.error(`${error.provider} error:`, error.code);
    
    if (error.retryable) {
      // Retry logic
    } else {
      // Non-retryable error
    }
  }
}
```

---

## 🔄 Retry Logic

Provider retries automatisch bei transienten Fehlern:

- **Rate Limit (429)**: Wartet bis Window abgelaufen ist
- **Timeout**: 3 Retries mit exponential backoff (1s, 2s, 4s)
- **Server Error (5xx)**: 3 Retries mit exponential backoff

```typescript
// Konfiguration
const provider = createFinnhubProvider({
  maxRetries: 3,      // Max 3 Retries
  retryDelay: 1000,   // 1s base delay
});

// Exponential backoff:
// Retry 1: 1s delay
// Retry 2: 2s delay
// Retry 3: 3s delay
```

---

## 💾 Caching

Quotes werden in **Vercel KV** gecached (60s TTL):

```typescript
// Cache enabled (default)
const provider = createFinnhubProvider({
  enableCache: true,
  cacheTTL: 60, // 60 seconds
});

// Cache disabled
const provider = createFinnhubProvider({
  enableCache: false,
});
```

**Cache Keys:**
- Quote: `quote:AAPL`
- ISIN Mapping: `isin:US0378331005`

---

## 🚦 Rate Limiting

### Provider-Level (Client-Side):
- **60 calls/minute** (Finnhub free tier)
- Automatisches Throttling
- Request counter mit 1-minute sliding window

```typescript
// Provider tracked automatisch requests
const provider = createFinnhubProvider();

// 60 calls in 1 Minute OK
for (let i = 0; i < 60; i++) {
  await provider.getQuote('AAPL');
}

// 61. call wartet bis Window abgelaufen
await provider.getQuote('MSFT'); // Wartet ~60s
```

### API Route Level (Server-Side):
- **60 calls/minute** per IP/User
- Middleware mit Vercel KV
- Rate limit headers in response

```typescript
// app/api/stocks/quote/route.ts
export const GET = withRateLimit(handler, {
  type: 'EXTERNAL_API', // 60 req/min
});
```

---

## 🌍 Currency Detection

Provider erkennt Währung anhand des Symbols:

| Symbol Pattern | Currency | Example |
|----------------|----------|---------|
| `.DE` suffix | EUR | `BMW.DE` |
| `.L` suffix | GBP | `BP.L` |
| Default | USD | `AAPL` |

```typescript
const quote = await provider.getQuote('BMW.DE');
console.log(quote.currency); // 'EUR'

const quote = await provider.getQuote('BP.L');
console.log(quote.currency); // 'GBP'

const quote = await provider.getQuote('AAPL');
console.log(quote.currency); // 'USD'
```

**Note:** In Production sollte eine proper Symbol-to-Currency mapping database genutzt werden.

---

## 🧪 Tests

### Run Tests:

```bash
# Alle Tests
pnpm test

# Mit UI
pnpm test:ui

# Mit Coverage
pnpm test:coverage
```

### Test Coverage:

- ✅ **30+ Unit Tests**
- ✅ Quote parsing & mapping
- ✅ ISIN/Symbol validation
- ✅ Error handling (401, 404, 429, 500, timeout)
- ✅ Retry logic
- ✅ Currency detection
- ✅ Search functionality
- ✅ Health check

```bash
# Test results
Test Files  2 passed (2)
     Tests  32 passed (32)
  Start at  11:52:00
  Duration  1.23s
```

---

## 📝 API Routes

### GET /api/stocks/quote

Fetch real-time stock quote.

**Query Parameters:**
- `symbol` (string, optional) - Trading symbol (e.g., AAPL)
- `isin` (string, optional) - ISIN (e.g., US0378331005)

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 175.43,
    "currency": "USD",
    "asOf": "2024-02-13T10:00:00.000Z",
    "symbol": "AAPL",
    "previousClose": 173.28,
    "change": 2.15,
    "changePercent": 1.24,
    "high": 176.82,
    "low": 173.50
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/stocks/quote?symbol=AAPL
curl http://localhost:3000/api/stocks/quote?isin=US0378331005
```

---

### GET /api/stocks/search

Search for stocks by name or symbol.

**Query Parameters:**
- `q` (string, required) - Search query (min 2 characters)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc",
      "currency": "USD"
    },
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "currency": "USD"
    }
  ],
  "count": 2
}
```

**Example:**
```bash
curl http://localhost:3000/api/stocks/search?q=Apple
```

---

## 🔐 Security

### Rate Limiting:
- ✅ Client-side (Provider): 60 calls/min
- ✅ Server-side (API Route): 60 calls/min per IP/User
- ✅ Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Error Handling:
- ❌ Keine sensitive Daten in Errors
- ✅ Typed errors mit proper status codes
- ✅ Retry nur bei transienten Fehlern

### Input Validation:
- ✅ Zod validation in API routes
- ✅ ISIN/Symbol format checks
- ✅ Query parameter sanitization

---

## 🚀 Weitere Provider hinzufügen

### 1. Provider Interface implementieren:

```typescript
// lib/services/twelve-data-provider.ts
import { PriceProvider, StockQuote } from './price-provider.interface';

export class TwelveDataProvider implements PriceProvider {
  readonly name = 'TwelveData';

  async getQuote(identifier: string): Promise<StockQuote> {
    // Implementation
  }

  async getQuoteByISIN(isin: string): Promise<StockQuote> {
    // Implementation
  }

  async getQuoteBySymbol(symbol: string): Promise<StockQuote> {
    // Implementation
  }
}
```

### 2. Factory Function:

```typescript
export function createTwelveDataProvider(
  config?: Partial<PriceProviderConfig>
): TwelveDataProvider {
  const apiKey = config?.apiKey || process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error('API key required');
  
  return new TwelveDataProvider({ apiKey, ...config });
}
```

### 3. Multi-Provider Fallback:

```typescript
// lib/services/price-service.ts
export class PriceService {
  private providers: PriceProvider[];

  constructor() {
    this.providers = [
      createFinnhubProvider(),
      createTwelveDataProvider(),
      // Fallback providers
    ];
  }

  async getQuote(identifier: string): Promise<StockQuote> {
    for (const provider of this.providers) {
      try {
        return await provider.getQuote(identifier);
      } catch (error) {
        console.warn(`${provider.name} failed, trying next provider...`);
      }
    }
    throw new Error('All providers failed');
  }
}
```

---

## 📊 Unterstützte Provider

| Provider | Status | Free Tier | Docs |
|----------|--------|-----------|------|
| **Finnhub** | ✅ Implementiert | 60 calls/min | [Docs](https://finnhub.io/docs/api) |
| TwelveData | ⏳ Geplant | 800 calls/day | [Docs](https://twelvedata.com/docs) |
| Alpha Vantage | ⏳ Geplant | 500 calls/day | [Docs](https://www.alphavantage.co/documentation/) |
| Yahoo Finance | ⏳ Geplant | Unofficial | [Docs](https://github.com/ranaroussi/yfinance) |
| IEX Cloud | ⏳ Geplant | Paid | [Docs](https://iexcloud.io/docs/api/) |

---

## 🐛 Troubleshooting

### "Finnhub API key is required"
→ Setze `FINNHUB_API_KEY` in `.env.local`

### "Rate limit exceeded"
→ Warte 60 Sekunden oder upgrade zu Finnhub Pro

### "No quote data available"
→ Symbol existiert nicht oder ist nicht handelbar

### "Request timeout"
→ Netzwerkproblem oder Finnhub down, Provider retried automatisch

### Tests schlagen fehl
→ Stelle sicher, dass Mocks korrekt sind (`vi.mock('@vercel/kv')`)

---

## 📚 Resources

- [Finnhub API Docs](https://finnhub.io/docs/api)
- [ISIN Format](https://en.wikipedia.org/wiki/International_Securities_Identification_Number)
- [Vitest Docs](https://vitest.dev/)
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0  
**Status:** ✅ Production-ready
