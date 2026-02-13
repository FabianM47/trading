/**
 * Zod Schemas für Trading Daten
 * 
 * Alle Input-Validierungen sollten durch Zod Schemas erfolgen.
 * Types werden automatisch aus den Schemas inferiert.
 * 
 * Features:
 * - Automatische Normalisierung (ISIN uppercase, decimal parsing)
 * - Strict validation für ISIN, Symbol, Currency
 * - Type inference für TypeScript
 */

import { z } from 'zod';

// ============================================================================
// Common Validators & Transformers
// ============================================================================

/**
 * ISIN Validator (12 Zeichen: 2 Buchstaben + 9 Alphanumerisch + 1 Prüfziffer)
 * Normalisiert automatisch zu uppercase
 */
const isinSchema = z
  .string()
  .min(12, 'ISIN muss 12 Zeichen lang sein')
  .max(12, 'ISIN muss 12 Zeichen lang sein')
  .regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i, 'Ungültiges ISIN-Format (z.B. US0378331005)')
  .transform((val) => val.toUpperCase());

/**
 * Symbol Validator (1-20 Zeichen, Großbuchstaben, Zahlen, Punkt, Bindestrich)
 * Normalisiert automatisch zu uppercase
 */
const symbolSchema = z
  .string()
  .min(1, 'Symbol ist erforderlich')
  .max(20, 'Symbol darf maximal 20 Zeichen lang sein')
  .regex(/^[A-Z0-9.\-]+$/i, 'Symbol darf nur Buchstaben, Zahlen, Punkt und Bindestrich enthalten')
  .transform((val) => val.toUpperCase());

/**
 * Currency Code Validator (ISO 4217: EUR, USD, GBP, etc.)
 * Normalisiert automatisch zu uppercase
 */
const currencySchema = z
  .string()
  .length(3, 'Währungscode muss 3 Zeichen lang sein')
  .regex(/^[A-Z]{3}$/i, 'Ungültiger Währungscode (z.B. EUR, USD)')
  .transform((val) => val.toUpperCase());

/**
 * Decimal String Validator für NUMERIC Felder
 * Erlaubt: "123.45", "0.00000001", "1000000"
 * Normalisiert zu String mit korrektem Format
 */
const decimalSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Ungültiges Dezimalformat')
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num);
  }, 'Muss eine gültige Zahl sein')
  .transform((val) => {
    // Entfernt führende Nullen, behält aber Dezimalstellen
    const parsed = parseFloat(val);
    return parsed.toString();
  });

/**
 * Positive Decimal Validator
 */
const positiveDecimalSchema = decimalSchema.refine(
  (val) => parseFloat(val) > 0,
  'Muss größer als 0 sein'
);

/**
 * Non-Negative Decimal Validator
 */
const nonNegativeDecimalSchema = decimalSchema.refine(
  (val) => parseFloat(val) >= 0,
  'Muss größer oder gleich 0 sein'
);

// ============================================================================
// Instrument Search Request
// ============================================================================

export const instrumentSearchRequestSchema = z.object({
  query: z
    .string()
    .min(1, 'Suchbegriff erforderlich')
    .max(100, 'Suchbegriff zu lang')
    .optional(),
  isin: isinSchema.optional(),
  symbol: symbolSchema.optional(),
  exchange: z
    .string()
    .max(50, 'Börse zu lang')
    .optional(),
  currency: currencySchema.optional(),
  type: z
    .enum(['STOCK', 'ETF', 'BOND', 'CRYPTO', 'COMMODITY', 'OTHER'])
    .optional(),
  country: z
    .string()
    .length(2, 'Ländercode muss 2 Zeichen lang sein (ISO 3166-1 alpha-2)')
    .regex(/^[A-Z]{2}$/i, 'Ungültiger Ländercode')
    .transform((val) => val.toUpperCase())
    .optional(),
  sector: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
}).refine(
  (data) => data.query || data.isin || data.symbol,
  'Mindestens query, isin oder symbol muss angegeben werden'
);

export type InstrumentSearchRequest = z.infer<typeof instrumentSearchRequestSchema>;

// ============================================================================
// Create Trade Request
// ============================================================================

export const createTradeRequestSchema = z.object({
  portfolioId: z.string().uuid('Ungültige Portfolio-ID'),
  instrumentId: z.string().uuid('Ungültige Instrument-ID').optional(),
  isin: isinSchema.optional(),
  tradeType: z.enum(['BUY', 'SELL'], {
    message: 'Trade-Type muss BUY oder SELL sein',
  }),
  quantity: positiveDecimalSchema,
  pricePerUnit: positiveDecimalSchema,
  totalAmount: positiveDecimalSchema.optional(), // Wird automatisch berechnet wenn nicht angegeben
  fees: nonNegativeDecimalSchema.default('0'),
  currency: currencySchema,
  exchangeRate: positiveDecimalSchema.default('1.0'),
  notes: z
    .string()
    .max(5000, 'Notizen zu lang')
    .optional(),
  executedAt: z
    .string()
    .datetime({ message: 'Ungültiges Datum (ISO 8601 erforderlich)' })
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString())),
}).refine(
  (data) => data.instrumentId || data.isin,
  {
    message: 'Entweder instrumentId oder isin muss angegeben werden',
    path: ['instrumentId'],
  }
).refine(
  (data) => {
    // Wenn totalAmount angegeben ist, prüfe ob es sinnvoll ist
    if (data.totalAmount) {
      const quantity = parseFloat(data.quantity);
      const price = parseFloat(data.pricePerUnit);
      const total = parseFloat(data.totalAmount);
      const calculated = quantity * price;
      const diff = Math.abs(calculated - total);
      return diff < 0.01; // Max 1 Cent Abweichung
    }
    return true;
  },
  {
    message: 'totalAmount stimmt nicht mit quantity * pricePerUnit überein',
    path: ['totalAmount'],
  }
);

export type CreateTradeRequest = z.infer<typeof createTradeRequestSchema>;

// ============================================================================
// Update Trade Request (nur Notes und ExecutedAt änderbar)
// ============================================================================

export const updateTradeRequestSchema = z.object({
  id: z.string().uuid('Ungültige Trade-ID'),
  notes: z
    .string()
    .max(5000, 'Notizen zu lang')
    .optional(),
  executedAt: z
    .string()
    .datetime({ message: 'Ungültiges Datum (ISO 8601 erforderlich)' })
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .optional(),
}).refine(
  (data) => data.notes !== undefined || data.executedAt !== undefined,
  'Mindestens ein Feld muss zum Aktualisieren angegeben werden'
);

export type UpdateTradeRequest = z.infer<typeof updateTradeRequestSchema>;

// ============================================================================
// Group Assignment Request
// ============================================================================

export const groupAssignRequestSchema = z.object({
  instrumentId: z.string().uuid('Ungültige Instrument-ID'),
  groupId: z.string().uuid('Ungültige Gruppen-ID'),
  action: z.enum(['ADD', 'REMOVE'], {
    message: 'Action muss ADD oder REMOVE sein',
  }),
});

export type GroupAssignRequest = z.infer<typeof groupAssignRequestSchema>;

// ============================================================================
// Batch Group Assignment Request
// ============================================================================

export const batchGroupAssignRequestSchema = z.object({
  instrumentIds: z
    .array(z.string().uuid('Ungültige Instrument-ID'))
    .min(1, 'Mindestens ein Instrument erforderlich')
    .max(100, 'Maximal 100 Instrumente pro Batch'),
  groupId: z.string().uuid('Ungültige Gruppen-ID'),
  action: z.enum(['ADD', 'REMOVE']),
});

export type BatchGroupAssignRequest = z.infer<typeof batchGroupAssignRequestSchema>;

// ============================================================================
// Trade Filter Schemas
// ============================================================================

export const tradeFilterSchema = z.object({
  portfolioId: z.string().uuid().optional(),
  instrumentId: z.string().uuid().optional(),
  isin: isinSchema.optional(),
  tradeType: z.enum(['BUY', 'SELL']).optional(),
  dateFrom: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .optional(),
  dateTo: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .optional(),
  minAmount: positiveDecimalSchema.optional(),
  maxAmount: positiveDecimalSchema.optional(),
  currency: currencySchema.optional(),
  groupId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  sortBy: z
    .enum(['executedAt', 'totalAmount', 'quantity', 'pricePerUnit', 'createdAt'])
    .default('executedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type TradeFilter = z.infer<typeof tradeFilterSchema>;

// ============================================================================
// Position Filter Schemas
// ============================================================================

export const positionFilterSchema = z.object({
  portfolioId: z.string().uuid(),
  instrumentId: z.string().uuid().optional(),
  isin: isinSchema.optional(),
  status: z.enum(['OPEN', 'CLOSED', 'ALL']).default('OPEN'),
  profitOnly: z.boolean().default(false), // Nur profitable Positionen
  groupId: z.string().uuid().optional(),
  minQuantity: positiveDecimalSchema.optional(),
  maxQuantity: positiveDecimalSchema.optional(),
  currency: currencySchema.optional(),
  sortBy: z
    .enum(['totalQuantity', 'avgBuyPrice', 'totalInvested', 'realizedPnl', 'lastTradeAt'])
    .default('lastTradeAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export type PositionFilter = z.infer<typeof positionFilterSchema>;

// ============================================================================
// Instrument Group Filter Schemas
// ============================================================================

export const instrumentGroupFilterSchema = z.object({
  portfolioId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  name: z.string().max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Farbe muss ein Hex-Code sein (z.B. #FF5733)')
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type InstrumentGroupFilter = z.infer<typeof instrumentGroupFilterSchema>;

// ============================================================================
// Date Range Filter (Wiederverwendbar)
// ============================================================================

export const dateRangeFilterSchema = z.object({
  dateFrom: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .optional(),
  dateTo: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString()))
    .optional(),
  preset: z
    .enum(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'LAST_YEAR', 'ALL_TIME'])
    .optional(),
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  {
    message: 'dateFrom muss vor dateTo liegen',
    path: ['dateFrom'],
  }
);

export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;

// ============================================================================
// Portfolio Performance Filter
// ============================================================================

export const portfolioPerformanceFilterSchema = z.object({
  portfolioId: z.string().uuid(),
  dateFrom: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString())),
  dateTo: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? val : val.toISOString())),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).default('DAY'),
  currency: currencySchema.optional(), // Konvertiere alles in diese Währung
});

export type PortfolioPerformanceFilter = z.infer<typeof portfolioPerformanceFilterSchema>;

// ============================================================================
// Create Portfolio Request
// ============================================================================

export const createPortfolioRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio-Name erforderlich')
    .max(255, 'Portfolio-Name zu lang')
    .trim(),
  description: z.string().max(5000).optional(),
  isDefault: z.boolean().default(false),
  currency: currencySchema,
});

export type CreatePortfolioRequest = z.infer<typeof createPortfolioRequestSchema>;

// ============================================================================
// Create Instrument Group Request
// ============================================================================

export const createInstrumentGroupRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Gruppenname erforderlich')
    .max(100, 'Gruppenname zu lang')
    .trim(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Farbe muss ein Hex-Code sein (z.B. #FF5733)')
    .transform((val) => val.toUpperCase())
    .default('#808080'),
  icon: z.string().max(50).optional(),
});

export type CreateInstrumentGroupRequest = z.infer<typeof createInstrumentGroupRequestSchema>;

// ============================================================================
// User Profile Schemas (Updated)
// ============================================================================

export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(255, 'Name darf maximal 255 Zeichen lang sein')
    .trim(),

  email: z
    .string()
    .email('Ungültige E-Mail-Adresse')
    .max(255)
    .toLowerCase(),

  defaultCurrency: currencySchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ============================================================================
// Price Alert Schemas (Updated)
// ============================================================================

export const priceAlertSchema = z.object({
  instrumentId: z.string().uuid(),
  targetPrice: positiveDecimalSchema,
  condition: z.enum(['ABOVE', 'BELOW'], {
    message: 'Bedingung muss ABOVE oder BELOW sein',
  }),
  notificationType: z.enum(['EMAIL', 'PUSH', 'BOTH'], {
    message: 'Ungültiger Benachrichtigungstyp',
  }),
  enabled: z.boolean().default(true),
});

export type PriceAlert = z.infer<typeof priceAlertSchema>;

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiSuccessSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validiert Daten mit einem Zod Schema und gibt typsichere Ergebnisse zurück
 */
export function validateData<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Formatiert Zod Validierungs-Fehler für API Responses
 */
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/**
 * Berechnet totalAmount aus quantity und pricePerUnit
 */
export function calculateTotalAmount(quantity: string, pricePerUnit: string, fees: string = '0'): string {
  const q = parseFloat(quantity);
  const p = parseFloat(pricePerUnit);
  const f = parseFloat(fees);
  const total = q * p + f;
  return total.toFixed(8);
}

/**
 * Normalisiert ISIN zu uppercase
 */
export function normalizeIsin(isin: string): string {
  return isin.toUpperCase().trim();
}

/**
 * Normalisiert Symbol zu uppercase
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

/**
 * Normalisiert Currency zu uppercase
 */
export function normalizeCurrency(currency: string): string {
  return currency.toUpperCase().trim();
}

/**
 * Validiert und normalisiert Decimal String
 */
export function normalizeDecimal(value: string | number): string {
  const str = typeof value === 'number' ? value.toString() : value;
  const parsed = parseFloat(str);
  if (isNaN(parsed) || !isFinite(parsed)) {
    throw new Error(`Invalid decimal value: ${str}`);
  }
  return parsed.toString();
}

/**
 * Konvertiert Date zu ISO String für Zod
 */
export function normalizeDate(date: string | Date): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Erstellt DateRange aus Preset
 */
export function getDateRangeFromPreset(preset: DateRangeFilter['preset']): {
  dateFrom: string;
  dateTo: string;
} | null {
  if (!preset) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let dateFrom: Date;
  let dateTo: Date = now;

  switch (preset) {
    case 'TODAY':
      dateFrom = today;
      break;
    case 'YESTERDAY':
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - 1);
      dateTo = new Date(today);
      dateTo.setSeconds(dateTo.getSeconds() - 1);
      break;
    case 'LAST_7_DAYS':
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case 'LAST_30_DAYS':
      dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - 30);
      break;
    case 'THIS_MONTH':
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'LAST_MONTH':
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'THIS_YEAR':
      dateFrom = new Date(now.getFullYear(), 0, 1);
      break;
    case 'LAST_YEAR':
      dateFrom = new Date(now.getFullYear() - 1, 0, 1);
      dateTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case 'ALL_TIME':
      return null;
    default:
      return null;
  }

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

// ============================================================================
// Export all validators for reuse
// ============================================================================

export {
  currencySchema,
  decimalSchema, isinSchema, nonNegativeDecimalSchema, positiveDecimalSchema, symbolSchema
};

