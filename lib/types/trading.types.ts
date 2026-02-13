/**
 * TypeScript Types für Trading Domain
 * 
 * Diese Types werden aus Zod Schemas inferiert oder manuell definiert.
 * Für Request/Response Types siehe trading.schema.ts
 */

import type {
  ApiError,
  ApiSuccess,
  BatchGroupAssignRequest,
  CreateInstrumentGroupRequest,
  CreatePortfolioRequest,
  CreateTradeRequest,
  DateRangeFilter,
  GroupAssignRequest,
  InstrumentGroupFilter,
  InstrumentSearchRequest,
  PortfolioPerformanceFilter,
  PositionFilter,
  PriceAlert,
  TradeFilter,
  UpdateTradeRequest,
  UserProfile,
} from '@/lib/schemas/trading.schema';

// Import Database Types
import type {
  AuditLog,
  ExchangeRate,
  Instrument,
  InstrumentGroup,
  InstrumentGroupAssignment,
  NewAuditLog,
  NewExchangeRate,
  NewInstrument,
  NewInstrumentGroup,
  NewInstrumentGroupAssignment,
  NewPortfolio,
  NewPosition,
  NewPriceSnapshot,
  NewTrade,
  NewUser,
  Portfolio,
  Position,
  PriceSnapshot,
  Trade,
  User,
} from '@/db/schema';

// Re-export all Zod-inferred types
export type {
  ApiError,
  ApiSuccess, BatchGroupAssignRequest, CreateInstrumentGroupRequest, CreatePortfolioRequest, CreateTradeRequest, DateRangeFilter, GroupAssignRequest, InstrumentGroupFilter, InstrumentSearchRequest, PortfolioPerformanceFilter, PositionFilter, PriceAlert, TradeFilter, UpdateTradeRequest, UserProfile
};

// ============================================================================
// Database Entity Types (from Drizzle Schema)
// ============================================================================

export type {
  AuditLog, ExchangeRate, Instrument, InstrumentGroup, InstrumentGroupAssignment, NewAuditLog, NewExchangeRate, NewInstrument, NewInstrumentGroup, NewInstrumentGroupAssignment, NewPortfolio, NewPosition, NewPriceSnapshot, NewTrade, NewUser,
  Portfolio, Position, PriceSnapshot, Trade, User
};

// ============================================================================
// Enums
// ============================================================================

export const TradeType = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type TradeType = (typeof TradeType)[keyof typeof TradeType];

export const InstrumentType = {
  STOCK: 'STOCK',
  ETF: 'ETF',
  BOND: 'BOND',
  CRYPTO: 'CRYPTO',
  COMMODITY: 'COMMODITY',
  OTHER: 'OTHER',
} as const;

export type InstrumentType = (typeof InstrumentType)[keyof typeof InstrumentType];

export const PositionStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  ALL: 'ALL',
} as const;

export type PositionStatus = (typeof PositionStatus)[keyof typeof PositionStatus];

export const AlertCondition = {
  ABOVE: 'ABOVE',
  BELOW: 'BELOW',
} as const;

export type AlertCondition = (typeof AlertCondition)[keyof typeof AlertCondition];

export const NotificationType = {
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  BOTH: 'BOTH',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const DatePreset = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  LAST_YEAR: 'LAST_YEAR',
  ALL_TIME: 'ALL_TIME',
} as const;

export type DatePreset = (typeof DatePreset)[keyof typeof DatePreset];

export const PerformanceGroupBy = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
} as const;

export type PerformanceGroupBy = (typeof PerformanceGroupBy)[keyof typeof PerformanceGroupBy];

// ============================================================================
// Business Logic Types
// ============================================================================

/**
 * Position mit aktuellem Preis und Performance Metriken
 */
export interface PositionWithMetrics extends Position {
  instrument: Instrument;
  currentPrice?: string; // NUMERIC as string
  currentValue?: string; // totalQuantity * currentPrice
  unrealizedPnl?: string; // (currentPrice - avgBuyPrice) * totalQuantity
  unrealizedPnlPercent?: string; // (unrealizedPnl / totalInvested) * 100
  totalPnl?: string; // realizedPnl + unrealizedPnl
  totalPnlPercent?: string; // (totalPnl / totalInvested) * 100
  totalReturn?: string; // currentValue + realizedPnl - totalInvested
  totalReturnPercent?: string; // (totalReturn / totalInvested) * 100
}

/**
 * Trade mit Instrument Details
 */
export interface TradeWithInstrument extends Trade {
  instrument: Instrument;
}

/**
 * Portfolio mit Summary
 */
export interface PortfolioWithSummary extends Portfolio {
  totalValue: string; // Sum of all position values
  totalInvested: string; // Sum of all position totalInvested
  totalPnl: string; // Sum of all position totalPnl
  totalPnlPercent: string; // (totalPnl / totalInvested) * 100
  positionCount: number;
  closedPositionCount: number;
  tradeCount: number;
}

/**
 * Performance Datenpoint
 */
export interface PerformanceDataPoint {
  date: string; // ISO date
  portfolioValue: string; // Total portfolio value at this date
  invested: string; // Total amount invested up to this date
  pnl: string; // Profit/Loss at this date
  pnlPercent: string; // PnL as percentage
}

/**
 * Instrument mit Latest Price
 */
export interface InstrumentWithPrice extends Instrument {
  latestPrice?: string;
  priceDate?: string; // ISO datetime
  priceChange24h?: string; // Price change in last 24h (percent)
}

/**
 * Group mit Instrument Count
 */
export interface InstrumentGroupWithCount extends InstrumentGroup {
  instrumentCount: number;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * API Response mit Success/Error
 */
export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: Record<string, string[]> };

// ============================================================================
// Form Types (for React Hook Form)
// ============================================================================

/**
 * Trade Form Input (mit optionalen Feldern für UI)
 */
export interface TradeFormInput {
  portfolioId: string;
  isin?: string;
  instrumentId?: string;
  tradeType: TradeType;
  quantity: string;
  pricePerUnit: string;
  fees: string;
  currency: string;
  executedAt: Date | string;
  notes?: string;
}

/**
 * Portfolio Form Input
 */
export interface PortfolioFormInput {
  name: string;
  description?: string;
  currency: string;
  isDefault: boolean;
}

/**
 * Instrument Group Form Input
 */
export interface InstrumentGroupFormInput {
  name: string;
  description?: string;
  color: string;
  icon?: string;
}

// ============================================================================
// Calculation Helpers
// ============================================================================

/**
 * Money Value Object (für Decimal.js Wrapper)
 */
export interface Money {
  amount: string; // NUMERIC as string
  currency: string; // ISO 4217
}

/**
 * Percentage Value Object
 */
export interface Percentage {
  value: string; // As decimal string (e.g., "0.15" for 15%)
}

/**
 * Exchange Rate für Currency Conversion
 */
export interface ExchangeRateInfo {
  from: string;
  to: string;
  rate: string;
  validFrom: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep Partial (macht alle Properties optional, auch nested)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Nullable (macht alle Properties nullable)
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * ISO Date String
 */
export type ISODateString = string;

/**
 * UUID String
 */
export type UUID = string;

/**
 * NUMERIC as String (für Decimal Precision)
 */
export type NumericString = string;

/**
 * Currency Code (ISO 4217)
 */
export type CurrencyCode = string;

/**
 * ISIN Code (12 chars)
 */
export type ISIN = string;
