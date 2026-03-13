// Core Data Types

export interface Trade {
  id: string;
  isin: string;
  ticker?: string;
  name: string;
  buyPrice: number;
  quantity: number;
  investedEur: number; // buyPrice * quantity
  buyDate: string; // ISO string
  currentPrice?: number; // Last known price from API (cached in localStorage)
  currency?: 'EUR' | 'USD'; // Währung des Trades (default: EUR)
  priceProvider?: string; // Provider der erfolgreich Kurse liefert (yahoo, ing, finnhub, coingecko)
  
  // Derivate-spezifische Felder
  isDerivative?: boolean;           // Ist es ein Derivat/Hebel-Produkt?
  leverage?: number;                // Hebel (z.B. 5.0 für 5x)
  productType?: string;             // "Turbo", "Knock-Out", "Optionsschein", etc.
  underlying?: string;              // Basiswert (z.B. "DAX", "Apple Inc.")
  knockOut?: number;                // Knock-Out Schwelle
  optionType?: 'call' | 'put';     // Bei Optionsscheinen
  
  // Teilverkauf-Felder
  originalQuantity?: number;        // Ursprüngliche Menge vor Teilverkäufen
  partialSales?: PartialSale[];     // Historie der Teilverkäufe
  
  // Demo/Test Trade
  isDemo?: boolean;               // Demo-Trade: wird nicht in Auswertungen einbezogen

  // Optional fields for closed trades
  isClosed?: boolean;
  closedAt?: string; // ISO string
  sellPrice?: number; // Price per share at which the trade was closed
  sellTotal?: number; // Total amount received from selling
  realizedPnL?: number; // Actual profit/loss when closed
  isPartialSale?: boolean; // Ist dies ein abgespaltener Teilverkaufs-Trade?
  parentTradeId?: string; // ID des ursprünglichen Trades (bei Teilverkäufen)
}

export interface PartialSale {
  id: string;
  soldQuantity: number;
  sellPrice: number;
  sellTotal: number;
  realizedPnL: number;
  soldAt: string; // ISO string
}

export interface Quote {
  isin?: string;
  ticker?: string;
  price: number;
  currency: string;
  timestamp: number;
  provider?: string; // Provider der diesen Kurs geliefert hat
  originalCurrency?: string; // Ursprüngliche Währung vor Umrechnung (z.B. 'USD')
  originalPrice?: number; // Ursprünglicher Preis vor Umrechnung in EUR
}

export interface MarketIndex {
  name: string;
  ticker: string;
  price: number;
  change: number; // percentage
}

// Portfolio Calculations

export interface TradeWithPnL extends Trade {
  currentPrice: number;
  pnlEur: number;
  pnlPct: number;
}

// Aggregated Position - Gruppiert alle Trades einer Aktie
export interface AggregatedPosition {
  symbol: string;           // Ticker Symbol (z.B. AAPL)
  isin?: string;            // ISIN (z.B. US0378331005)
  name: string;             // Firmenname (z.B. Apple Inc.)
  ticker: string;           // Ticker Symbol
  
  // Aggregierte Werte (nur offene Trades)
  totalQuantity: number;    // Summe aller Mengen aus offenen Trades
  averageBuyPrice: number;  // Gewichteter Durchschnittspreis
  totalInvested: number;    // Gesamtes investiertes Kapital (offen)
  currentPrice: number;     // Aktueller Kurs
  currentValue: number;     // Aktueller Gesamtwert der offenen Position
  currency: string;         // Währung (EUR/USD)
  
  // Performance
  totalPnL: number;         // Gesamt P/L in EUR (unrealisiert + realisiert)
  totalPnLPercent: number;  // Gesamt P/L in %
  
  // Realisiert vs. Unrealisiert
  realizedPnL: number;          // P/L aus geschlossenen Trades
  unrealizedPnL: number;        // P/L aus offenen Trades
  unrealizedPnLPercent: number;  // P/L % aus offenen Trades (bezogen auf investiertes Kapital)
  
  // Meta-Informationen
  trades: Trade[];          // Alle zugehörigen Trades (offen + geschlossen)
  openTrades: Trade[];      // Nur offene Trades
  closedTrades: Trade[];    // Nur geschlossene Trades
  firstBuyDate: string;     // Datum des ersten Kaufs
  lastBuyDate: string;      // Datum des letzten Kaufs
  
  // Derivate-Info (falls zutreffend)
  isDerivative?: boolean;
  leverage?: number;
  productType?: string;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalValue: number;
  pnlEur: number;
  pnlPct: number;
  monthPnlEur: number;
  monthPnlPct: number;
  realizedPnL: number; // Total realized profit/loss from closed trades
  totalPnL: number; // Combined realized + unrealized P/L
}

// Monatliche P/L-Historie
export interface MonthlyPnL {
  year: number;
  month: number; // 0-11 (JS Date format)
  label: string; // z.B. "März 2026"
  pnlEur: number; // Realisierter P/L in EUR
  pnlPct: number; // Realisierter P/L in %
  realizedPnL: number; // Realisierter P/L (geschlossene Trades)
  investedAmount: number; // Investiertes Kapital für %-Berechnung
  isCurrent: boolean; // Ist dies der aktuelle Monat?
}

// Filters

export type TimeRange = 'month' | 'last30' | 'ytd' | 'custom' | 'all';

export interface FilterOptions {
  timeRange: TimeRange;
  customStart?: string; // ISO date
  customEnd?: string; // ISO date
  onlyWinners: boolean;
  searchQuery: string;
  sortBy: SortOption;
}

export type SortOption = 'pnlEur' | 'pnlPct' | 'date' | 'name';

// Storage

export interface StorageData {
  version: number;
  trades: Trade[];
}

// Quote Provider Interface

export interface QuoteProvider {
  fetchQuote(isinOrTicker: string): Promise<Quote | null>;
  fetchBatch(identifiers: string[]): Promise<Map<string, Quote>>;
  fetchIndices(): Promise<MarketIndex[]>;
}

// System Errors

export type SystemErrorCategory = 'provider' | 'exchange_rate' | 'network' | 'general';

export interface SystemError {
  id: string;
  category: SystemErrorCategory;
  message: string;
  details?: string;
  timestamp: number;
}

// API Response

export interface QuotesApiResponse {
  quotes: Record<string, Quote>;
  indices: MarketIndex[];
  errors: ApiError[];
  timestamp: number;
}

export interface ApiError {
  category: SystemErrorCategory;
  message: string;
  details?: string;
}

// ==========================================
// PWA / Push Notifications / Price Alerts
// ==========================================

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  isin: string;
  ticker?: string;
  name: string;
  targetPrice: number;
  direction: 'above' | 'below';
  isActive: boolean;
  triggeredAt?: string; // ISO string
  lastCheckedPrice?: number;
  lastCheckedAt?: string; // ISO string
  repeat: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CreatePriceAlertInput {
  isin: string;
  ticker?: string;
  name: string;
  targetPrice: number;
  direction: 'above' | 'below';
  repeat?: boolean;
}

// ==========================================
// Chat
// ==========================================

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

// ==========================================
// Excel Import/Export
// ==========================================

export type CellValue = string | number | boolean | null

export interface SheetData {
  sheetName: string
  metadata: Record<string, CellValue>
  headers: string[]
  rows: Record<string, CellValue>[]
}

export interface WorkbookData {
  fileName: string
  sheets: SheetData[]
}
