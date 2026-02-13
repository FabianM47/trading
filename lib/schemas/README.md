# 📋 Zod Schemas & TypeScript Types

Diese Dokumentation beschreibt alle Validierungs-Schemas und TypeScript Types für die Trading Portfolio App.

## 📂 Dateistruktur

```
lib/
├── schemas/
│   ├── trading.schema.ts          # ⭐ Zod Schemas mit Validation & Normalisierung
│   └── trading.schema.examples.ts # Verwendungsbeispiele
└── types/
    └── trading.types.ts            # TypeScript Types & Interfaces
```

---

## 🎯 Features

### ✅ Automatische Normalisierung

Alle Schemas normalisieren Eingaben automatisch:

| Feld | Input | Output | Regel |
|------|-------|--------|-------|
| **ISIN** | `"us0378331005"` | `"US0378331005"` | Uppercase, 12 Zeichen |
| **Symbol** | `"aapl"` | `"AAPL"` | Uppercase, 1-20 Zeichen |
| **Currency** | `"eur"` | `"EUR"` | Uppercase, 3 Zeichen (ISO 4217) |
| **Country** | `"de"` | `"DE"` | Uppercase, 2 Zeichen (ISO 3166-1) |
| **Decimal** | `"0012.5000"` | `"12.5"` | Trailing/leading zeros entfernen |
| **Date** | `Date` or `string` | `"2026-02-13T10:30:00.000Z"` | ISO 8601 String |

### ✅ Strict Validation

- **ISIN**: `/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/` (z.B. `US0378331005`)
- **Symbol**: `/^[A-Z0-9.\-]+$/` (z.B. `AAPL`, `BRK.B`)
- **Currency**: `/^[A-Z]{3}$/` (z.B. `EUR`, `USD`, `GBP`)
- **Decimal**: `/^-?\d+(\.\d+)?$/` mit Finite-Check
- **UUID**: Standard UUID v4 Format

### ✅ NUMERIC Precision

Alle finanziellen Werte sind **NUMERIC Strings** für präzise Berechnungen:

```typescript
const trade = {
  quantity: "10.50000000",      // NUMERIC(20,8)
  pricePerUnit: "125.50000000", // NUMERIC(20,8)
  totalAmount: "1318.25000000", // NUMERIC(20,8)
  fees: "5.00000000",           // NUMERIC(20,8)
};

// ⚠️ NIEMALS JavaScript Numbers für Finanzdaten verwenden!
// ✅ Verwende Decimal.js für Berechnungen
```

---

## 📦 Schemas Übersicht

### 🔍 Instrument Search

```typescript
import { instrumentSearchRequestSchema } from '@/lib/schemas/trading.schema';

const result = validateData(instrumentSearchRequestSchema, {
  query: 'Apple',          // Freitext-Suche
  isin: 'US0378331005',    // oder ISIN
  symbol: 'AAPL',          // oder Symbol
  exchange: 'NASDAQ',      // Optional
  currency: 'USD',         // Optional
  type: 'STOCK',           // STOCK | ETF | BOND | CRYPTO | COMMODITY | OTHER
  country: 'US',           // ISO 3166-1 alpha-2
  sector: 'Technology',    // Optional
  industry: 'Consumer Electronics', // Optional
  isActive: true,          // Default: true
  limit: 20,               // Default: 20, Max: 100
  offset: 0,               // Default: 0
});
```

**Regel**: Mindestens `query`, `isin` oder `symbol` erforderlich.

---

### 📈 Create Trade

```typescript
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';

const result = validateData(createTradeRequestSchema, {
  portfolioId: '123e4567-e89b-12d3-a456-426614174000', // UUID
  instrumentId: '...',     // UUID (entweder instrumentId oder isin)
  isin: 'US0378331005',    // ISIN (entweder instrumentId oder isin)
  tradeType: 'BUY',        // 'BUY' | 'SELL'
  quantity: '10.5',        // NUMERIC String
  pricePerUnit: '125.50',  // NUMERIC String
  totalAmount: '1318.25',  // Optional (auto-calculated)
  fees: '5.00',            // Default: '0'
  currency: 'EUR',         // ISO 4217
  exchangeRate: '1.0',     // Default: '1.0'
  notes: 'Optional notes', // Max 5000 Zeichen
  executedAt: '2026-02-13T10:30:00Z', // ISO 8601
});
```

**Validierung**:
- ✅ Entweder `instrumentId` oder `isin` erforderlich
- ✅ Wenn `totalAmount` angegeben: Max 1 Cent Abweichung zu `quantity * pricePerUnit`

---

### 📝 Update Trade

```typescript
import { updateTradeRequestSchema } from '@/lib/schemas/trading.schema';

const result = validateData(updateTradeRequestSchema, {
  id: '123e4567-e89b-12d3-a456-426614174000', // Trade UUID
  notes: 'Updated notes',                     // Optional
  executedAt: '2026-02-13T11:00:00Z',        // Optional
});
```

**Wichtig**: Nur `notes` und `executedAt` sind änderbar (Trades sind immutable).

---

### 🏷️ Group Assignment

```typescript
import { groupAssignRequestSchema } from '@/lib/schemas/trading.schema';

// Einzelnes Instrument
const result = validateData(groupAssignRequestSchema, {
  instrumentId: '123e4567-e89b-12d3-a456-426614174001',
  groupId: '123e4567-e89b-12d3-a456-426614174100',
  action: 'ADD', // 'ADD' | 'REMOVE'
});

// Batch (mehrere Instrumente)
import { batchGroupAssignRequestSchema } from '@/lib/schemas/trading.schema';

const batch = validateData(batchGroupAssignRequestSchema, {
  instrumentIds: [
    '123e4567-e89b-12d3-a456-426614174001',
    '123e4567-e89b-12d3-a456-426614174002',
    '123e4567-e89b-12d3-a456-426614174003',
  ],
  groupId: '123e4567-e89b-12d3-a456-426614174100',
  action: 'ADD',
});
```

**Limits**: Max 100 Instrumente pro Batch.

---

### 🔎 Trade Filter

```typescript
import { tradeFilterSchema } from '@/lib/schemas/trading.schema';

const result = validateData(tradeFilterSchema, {
  portfolioId: '...',      // Optional
  instrumentId: '...',     // Optional
  isin: 'US0378331005',    // Optional
  tradeType: 'BUY',        // Optional: 'BUY' | 'SELL'
  dateFrom: '2026-01-01T00:00:00Z', // Optional
  dateTo: '2026-12-31T23:59:59Z',   // Optional
  minAmount: '100',        // Optional
  maxAmount: '10000',      // Optional
  currency: 'EUR',         // Optional
  groupId: '...',          // Optional
  limit: 100,              // Default: 100, Max: 1000
  offset: 0,               // Default: 0
  sortBy: 'executedAt',    // executedAt | totalAmount | quantity | pricePerUnit | createdAt
  sortOrder: 'desc',       // asc | desc
});
```

---

### 📊 Position Filter

```typescript
import { positionFilterSchema } from '@/lib/schemas/trading.schema';

const result = validateData(positionFilterSchema, {
  portfolioId: '...',      // Required
  instrumentId: '...',     // Optional
  isin: 'US0378331005',    // Optional
  status: 'OPEN',          // 'OPEN' | 'CLOSED' | 'ALL' (Default: 'OPEN')
  profitOnly: true,        // Nur profitable Positionen (Default: false)
  groupId: '...',          // Optional
  minQuantity: '1',        // Optional
  maxQuantity: '1000',     // Optional
  currency: 'EUR',         // Optional
  sortBy: 'lastTradeAt',   // totalQuantity | avgBuyPrice | totalInvested | realizedPnl | lastTradeAt
  sortOrder: 'desc',       // asc | desc
  limit: 100,              // Default: 100, Max: 1000
  offset: 0,               // Default: 0
});
```

---

### 📅 Date Range Filter

```typescript
import { dateRangeFilterSchema, getDateRangeFromPreset } from '@/lib/schemas/trading.schema';

// Option 1: Preset verwenden
const lastMonth = getDateRangeFromPreset('LAST_MONTH');
// Returns: { dateFrom: '2026-01-01T00:00:00.000Z', dateTo: '2026-01-31T23:59:59.999Z' }

// Option 2: Manuell
const result = validateData(dateRangeFilterSchema, {
  dateFrom: '2026-01-01T00:00:00Z',
  dateTo: '2026-01-31T23:59:59Z',
});

// Option 3: Preset direkt in Schema
const result = validateData(dateRangeFilterSchema, {
  preset: 'LAST_7_DAYS',
});
```

**Verfügbare Presets**:
- `TODAY`
- `YESTERDAY`
- `LAST_7_DAYS`
- `LAST_30_DAYS`
- `THIS_MONTH`
- `LAST_MONTH`
- `THIS_YEAR`
- `LAST_YEAR`
- `ALL_TIME`

---

## 🛠️ Helper Functions

### `validateData<T>(schema, data)`

Typsichere Validation:

```typescript
const result = validateData(createTradeRequestSchema, rawData);

if (result.success) {
  // result.data ist typsicher
  const trade: CreateTradeRequest = result.data;
} else {
  // result.error ist ZodError
  console.error(formatZodError(result.error));
}
```

### `formatZodError(error)`

Formatiert Zod Errors für API Responses:

```typescript
const errors = formatZodError(zodError);
// Returns: { isin: ['Ungültiges ISIN-Format'], quantity: ['Muss größer als 0 sein'] }
```

### `calculateTotalAmount(quantity, pricePerUnit, fees?)`

Berechnet Total Amount:

```typescript
const total = calculateTotalAmount('10.5', '125.50', '5.00');
// Returns: "1323.25000000"
```

### Normalisierungs-Helfer

```typescript
import {
  normalizeIsin,
  normalizeSymbol,
  normalizeCurrency,
  normalizeDecimal,
  normalizeDate,
} from '@/lib/schemas/trading.schema';

normalizeIsin('us0378331005');        // "US0378331005"
normalizeSymbol('aapl');              // "AAPL"
normalizeCurrency('eur');             // "EUR"
normalizeDecimal('0012.5000');        // "12.5"
normalizeDate(new Date());            // "2026-02-13T10:30:00.000Z"
```

---

## 📘 TypeScript Types

Alle Request/Response Types werden aus Schemas inferiert:

```typescript
import type {
  CreateTradeRequest,
  InstrumentSearchRequest,
  TradeFilter,
  PositionFilter,
  ApiResponse,
} from '@/lib/types/trading.types';

// Database Entity Types
import type {
  User,
  Portfolio,
  Instrument,
  Trade,
  Position,
} from '@/lib/types/trading.types';

// Insert Types (für DB Inserts)
import type {
  NewUser,
  NewPortfolio,
  NewTrade,
} from '@/lib/types/trading.types';
```

### Business Logic Types

```typescript
import type {
  PositionWithMetrics,      // Position + current price + performance
  TradeWithInstrument,       // Trade + instrument details
  PortfolioWithSummary,      // Portfolio + aggregated metrics
  InstrumentWithPrice,       // Instrument + latest price
  PerformanceDataPoint,      // Time-series data point
} from '@/lib/types/trading.types';
```

---

## 🎨 React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import type { CreateTradeRequest } from '@/lib/types/trading.types';

function TradeForm() {
  const form = useForm<CreateTradeRequest>({
    resolver: zodResolver(createTradeRequestSchema),
    defaultValues: {
      tradeType: 'BUY',
      fees: '0',
      currency: 'EUR',
    },
  });

  const onSubmit = async (data: CreateTradeRequest) => {
    // data ist bereits validiert und normalisiert
    console.log('Valid trade:', data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

---

## 🚀 API Routes Beispiel

```typescript
import { validateData, formatZodError } from '@/lib/schemas/trading.schema';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import type { ApiResponse } from '@/lib/types/trading.types';

export async function POST(request: Request) {
  const body = await request.json();
  
  const result = validateData(createTradeRequestSchema, body);
  
  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: 'Validation failed',
        details: formatZodError(result.error),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // result.data ist typsicher
  const trade = result.data;
  
  // Business Logic...
  
  return Response.json(
    {
      success: true,
      data: trade,
      message: 'Trade created',
    } satisfies ApiResponse<typeof trade>,
    { status: 201 }
  );
}
```

---

## ⚠️ Wichtige Hinweise

### NUMERIC Strings

```typescript
// ❌ FALSCH: JavaScript Numbers verwenden
const quantity = 10.5;
const price = 125.50;
const total = quantity * price; // Floating Point Fehler!

// ✅ RICHTIG: NUMERIC Strings + Decimal.js
import { Decimal } from 'decimal.js';

const quantity = new Decimal('10.5');
const price = new Decimal('125.50');
const total = quantity.times(price); // Präzise Berechnung
console.log(total.toString()); // "1318.25"
```

### Trade Immutability

```typescript
// ❌ FALSCH: Trades ändern
await db.update(trades).set({ quantity: '11' }).where(eq(trades.id, id));

// ✅ RICHTIG: Neuen Trade erstellen (Korrektur)
await db.insert(trades).values({
  ...originalTrade,
  quantity: '11',
  notes: 'Korrektur von originalTradeId',
});
```

### Validation Errors

```typescript
// Immer Errors behandeln
const result = validateData(schema, data);

if (!result.success) {
  // Frontend: Zeige User-Friendly Errors
  const errors = formatZodError(result.error);
  
  // Backend: Logge Details
  console.error('Validation failed:', result.error.flatten());
  
  return { success: false, errors };
}
```

---

## 📚 Siehe auch

- [DRIZZLE_GUIDE.md](../../db/DRIZZLE_GUIDE.md) - Database Queries
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Code Conventions
- [trading.schema.examples.ts](./trading.schema.examples.ts) - Mehr Beispiele

---

**Alle Schemas sind produktionsreif und typsicher! 🚀**
