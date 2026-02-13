# 📋 Zod Schemas - Implementierungs-Übersicht

## ✅ Erfolgreich erstellt

### 1. **Instrument Search Request** (`InstrumentSearchRequest`)
- **Schema**: `instrumentSearchRequestSchema`
- **Features**:
  - Freitext-Suche (`query`) ODER ISIN ODER Symbol erforderlich
  - Filtering: exchange, currency, type, country, sector, industry
  - Pagination: limit (1-100, default 20), offset
  - ISIN/Symbol/Currency/Country werden automatisch zu UPPERCASE normalisiert
- **Validierung**: Mindestens ein Suchkriterium erforderlich

### 2. **Create Trade Request** (`CreateTradeRequest`)
- **Schema**: `createTradeRequestSchema`
- **Features**:
  - portfolioId (UUID), instrumentId ODER isin erforderlich
  - tradeType: BUY | SELL
  - Quantity, pricePerUnit, totalAmount als NUMERIC Strings
  - Optional: fees (default "0"), exchangeRate (default "1.0")
  - executedAt: Date oder ISO String (wird zu ISO String konvertiert)
  - notes: Max 5000 Zeichen
- **Validierung**: 
  - Entweder instrumentId oder isin erforderlich
  - Wenn totalAmount angegeben: Max 1 Cent Abweichung zu `quantity * pricePerUnit`
  - Alle Decimals müssen positive Werte sein

### 3. **Update Trade Request** (`UpdateTradeRequest`)
- **Schema**: `updateTradeRequestSchema`
- **Features**:
  - id (UUID) erforderlich
  - Nur notes und executedAt änderbar (Trade Immutability)
- **Validierung**: Mindestens ein Feld muss angegeben werden

### 4. **Group Assignment Request** (`GroupAssignRequest`)
- **Schema**: `groupAssignRequestSchema`
- **Features**:
  - instrumentId (UUID), groupId (UUID)
  - action: ADD | REMOVE
- **Use Case**: Einzelnes Instrument zu Gruppe hinzufügen/entfernen

### 5. **Batch Group Assignment Request** (`BatchGroupAssignRequest`)
- **Schema**: `batchGroupAssignRequestSchema`
- **Features**:
  - instrumentIds: Array von UUIDs (1-100)
  - groupId (UUID)
  - action: ADD | REMOVE
- **Validierung**: Min 1, Max 100 Instrumente pro Batch

### 6. **Trade Filter** (`TradeFilter`)
- **Schema**: `tradeFilterSchema`
- **Features**:
  - Filter: portfolioId, instrumentId, isin, tradeType, dateFrom, dateTo
  - Min/Max Amount filtering
  - Currency filtering
  - Group filtering (groupId)
  - Pagination: limit (1-1000, default 100), offset
  - Sorting: sortBy (executedAt, totalAmount, quantity, pricePerUnit, createdAt), sortOrder (asc/desc)
- **Use Case**: Flexible Trade-Suche mit vielen Filtermöglichkeiten

### 7. **Position Filter** (`PositionFilter`)
- **Schema**: `positionFilterSchema`
- **Features**:
  - portfolioId erforderlich
  - status: OPEN | CLOSED | ALL (default OPEN)
  - profitOnly: boolean (default false) - Nur profitable Positionen
  - Filter: instrumentId, isin, groupId, currency
  - Min/Max Quantity filtering
  - Pagination & Sorting wie Trade Filter
- **Use Case**: Portfolio-Positionen mit Status- und Profit-Filtering

### 8. **Instrument Group Filter** (`InstrumentGroupFilter`)
- **Schema**: `instrumentGroupFilterSchema`
- **Features**:
  - portfolioId erforderlich
  - Filter: groupId, name, color (Hex-Code)
  - Pagination: limit (1-100, default 50), offset
- **Use Case**: Gruppen-Verwaltung

### 9. **Date Range Filter** (`DateRangeFilter`)
- **Schema**: `dateRangeFilterSchema`
- **Features**:
  - dateFrom/dateTo: Date oder ISO String
  - preset: TODAY | YESTERDAY | LAST_7_DAYS | LAST_30_DAYS | THIS_MONTH | LAST_MONTH | THIS_YEAR | LAST_YEAR | ALL_TIME
- **Validierung**: dateFrom muss vor dateTo liegen
- **Helper**: `getDateRangeFromPreset(preset)` generiert dateFrom/dateTo

### 10. **Portfolio Performance Filter** (`PortfolioPerformanceFilter`)
- **Schema**: `portfolioPerformanceFilterSchema`
- **Features**:
  - portfolioId, dateFrom, dateTo erforderlich
  - groupBy: DAY | WEEK | MONTH | YEAR (default DAY)
  - currency: Optional (konvertiere alles in diese Währung)
- **Use Case**: Performance-Charts generieren

### 11. **Create Portfolio Request** (`CreatePortfolioRequest`)
- **Schema**: `createPortfolioRequestSchema`
- **Features**:
  - name (1-255 Zeichen, getrimmt)
  - description (max 5000 Zeichen)
  - isDefault: boolean (default false)
  - currency: ISO 4217

### 12. **Create Instrument Group Request** (`CreateInstrumentGroupRequest`)
- **Schema**: `createInstrumentGroupRequestSchema`
- **Features**:
  - portfolioId (UUID), name (1-100 Zeichen)
  - description (max 500 Zeichen)
  - color: Hex-Code (default "#808080"), wird zu UPPERCASE
  - icon: Optional (max 50 Zeichen)

### 13. **User Profile** (`UserProfile`)
- **Schema**: `userProfileSchema`
- **Features**:
  - name (2-255 Zeichen, getrimmt)
  - email (lowercase konvertiert, max 255)
  - defaultCurrency: ISO 4217

### 14. **Price Alert** (`PriceAlert`)
- **Schema**: `priceAlertSchema`
- **Features**:
  - instrumentId (UUID)
  - targetPrice: NUMERIC String
  - condition: ABOVE | BELOW
  - notificationType: EMAIL | PUSH | BOTH
  - enabled: boolean (default true)

---

## 🛠️ Normalisierungs-Features

Alle Schemas normalisieren automatisch:

| Validator | Input → Output | Regex |
|-----------|----------------|-------|
| `isinSchema` | `"us0378331005"` → `"US0378331005"` | `/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i` |
| `symbolSchema` | `"aapl"` → `"AAPL"` | `/^[A-Z0-9.\-]+$/i` |
| `currencySchema` | `"eur"` → `"EUR"` | `/^[A-Z]{3}$/i` |
| `decimalSchema` | `"0012.5000"` → `"12.5"` | `/^-?\d+(\.\d+)?$/` |
| `positiveDecimalSchema` | `"125.50"` → `"125.5"` | Same + > 0 check |
| `nonNegativeDecimalSchema` | `"0"` → `"0"` | Same + >= 0 check |

---

## 📘 Helper Functions

### Validierung
```typescript
validateData<T>(schema: T, data: unknown): 
  | { success: true; data: z.infer<T> } 
  | { success: false; error: z.ZodError }
```

### Error Formatting
```typescript
formatZodError(error: z.ZodError): Record<string, string[]>
// Returns: { isin: ['Ungültiges ISIN-Format'], quantity: ['Muss größer als 0 sein'] }
```

### Calculations
```typescript
calculateTotalAmount(quantity: string, pricePerUnit: string, fees?: string): string
// Returns: "1323.25000000"
```

### Normalization
```typescript
normalizeIsin(isin: string): string          // "us..." → "US..."
normalizeSymbol(symbol: string): string      // "aapl" → "AAPL"
normalizeCurrency(currency: string): string  // "eur" → "EUR"
normalizeDecimal(value: string | number): string  // "0012.50" → "12.5"
normalizeDate(date: string | Date): string   // → ISO 8601 String
```

### Date Presets
```typescript
getDateRangeFromPreset(preset: DatePreset): { dateFrom: string; dateTo: string } | null
// 'LAST_MONTH' → { dateFrom: '2026-01-01T00:00:00.000Z', dateTo: '2026-01-31T23:59:59.999Z' }
```

---

## 📚 Export-Übersicht

### Schemas
```typescript
export {
  instrumentSearchRequestSchema,
  createTradeRequestSchema,
  updateTradeRequestSchema,
  groupAssignRequestSchema,
  batchGroupAssignRequestSchema,
  tradeFilterSchema,
  positionFilterSchema,
  instrumentGroupFilterSchema,
  dateRangeFilterSchema,
  portfolioPerformanceFilterSchema,
  createPortfolioRequestSchema,
  createInstrumentGroupRequestSchema,
  userProfileSchema,
  priceAlertSchema,
  apiErrorSchema,
  apiSuccessSchema,
};
```

### Validators (Reusable)
```typescript
export {
  isinSchema,
  symbolSchema,
  currencySchema,
  decimalSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
};
```

### Types (Inferred from Schemas)
```typescript
export type {
  InstrumentSearchRequest,
  CreateTradeRequest,
  UpdateTradeRequest,
  GroupAssignRequest,
  BatchGroupAssignRequest,
  TradeFilter,
  PositionFilter,
  InstrumentGroupFilter,
  DateRangeFilter,
  PortfolioPerformanceFilter,
  CreatePortfolioRequest,
  CreateInstrumentGroupRequest,
  UserProfile,
  PriceAlert,
  ApiError,
  ApiSuccess,
};
```

### Helper Functions
```typescript
export {
  validateData,
  formatZodError,
  calculateTotalAmount,
  normalizeIsin,
  normalizeSymbol,
  normalizeCurrency,
  normalizeDecimal,
  normalizeDate,
  getDateRangeFromPreset,
};
```

---

## ✅ Status

| Schema | Status | Tests | Documentation |
|--------|--------|-------|---------------|
| Instrument Search | ✅ | - | ✅ README.md |
| Create Trade | ✅ | - | ✅ README.md |
| Update Trade | ✅ | - | ✅ README.md |
| Group Assign | ✅ | - | ✅ README.md |
| Trade Filter | ✅ | - | ✅ README.md |
| Position Filter | ✅ | - | ✅ README.md |
| Instrument Group Filter | ✅ | - | ✅ README.md |
| Date Range Filter | ✅ | - | ✅ README.md |
| Portfolio Performance Filter | ✅ | - | ✅ README.md |
| Create Portfolio | ✅ | - | ✅ README.md |
| Create Instrument Group | ✅ | - | ✅ README.md |
| User Profile | ✅ | - | ✅ README.md |
| Price Alert | ✅ | - | ✅ README.md |

---

## 🎯 Nächste Schritte

1. **Tests schreiben**: Unit Tests für alle Schemas mit Vitest
2. **API Routes**: Schemas in API Routes verwenden
3. **Server Actions**: Schemas in Server Actions verwenden
4. **Forms**: React Hook Form Integration mit allen Schemas
5. **Repository Layer**: Typsichere Queries mit Drizzle + Schemas

---

**Alle Schemas sind production-ready! 🚀**
