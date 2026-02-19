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

// API Response

export interface QuotesApiResponse {
  quotes: Record<string, Quote>;
  indices: MarketIndex[];
  timestamp: number;
}
