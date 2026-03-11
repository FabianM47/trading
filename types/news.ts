// ==========================================
// News & AI Analysis Types
// ==========================================

export type NewsSentiment = 'bullish' | 'bearish' | 'neutral';
export type OverallSentiment = NewsSentiment | 'mixed';
export type NewsProviderType = 'finnhub' | 'alphavantage' | 'newsapi' | 'rss' | 'website';

// ==========================================
// News Sources (Konnektoren)
// ==========================================

export interface NewsSource {
  id: string;
  userId?: string | null;
  name: string;
  providerType: NewsProviderType;
  config: Record<string, unknown>;
  isEnabled: boolean;
  isBuiltin: boolean;
  sourceWeight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsSourceInput {
  name: string;
  providerType: 'rss' | 'website'; // User kann nur RSS/Website hinzufuegen
  config: RssSourceConfig | WebsiteSourceConfig;
}

export interface UpdateNewsSourceInput {
  name?: string;
  config?: RssSourceConfig | WebsiteSourceConfig;
  isEnabled?: boolean;
}

// Provider-spezifische Config-Typen

export interface RssSourceConfig {
  url: string;
}

export interface WebsiteSourceConfig {
  url: string;
  selectors: {
    articleList: string;    // CSS-Selektor fuer Artikel-Container
    title: string;          // Selektor fuer Titel innerhalb des Containers
    summary?: string;       // Selektor fuer Zusammenfassung
    date?: string;          // Selektor fuer Datum
    link?: string;          // Selektor fuer Artikel-Link
    image?: string;         // Selektor fuer Bild
  };
  dateFormat?: string;      // Optionales Datumsformat (z.B. "DD.MM.YYYY")
  baseUrl?: string;         // Falls Links relativ sind
}

// ==========================================
// News Articles (Rohe Artikel)
// ==========================================

export interface NewsArticle {
  id: string;
  sourceId?: string | null;
  sourceName?: string;
  externalId?: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  publishedAt: string;
  rawContent?: string | null;
  relatedTickers?: string[];
  category?: string | null;
  fetchBatchId?: string;
  isAnalyzed: boolean;
  sourceWeight?: number;
  createdAt: string;
}

/** Rohes Artikel-Format vom Provider (vor DB-Speicherung) */
export interface NewsArticleRaw {
  externalId: string;
  title: string;
  summary?: string;
  url?: string;
  imageUrl?: string;
  publishedAt: Date;
  rawContent?: string;
  relatedTickers?: string[];
  category?: string;
  sourceName: string;
  sourceWeight?: number;
}

// ==========================================
// News Analyses (Claude AI Analysen)
// ==========================================

export interface AffectedTicker {
  ticker: string;
  name: string;
  sentiment: NewsSentiment;
  relevance: number; // 0.0 - 1.0
}

export interface TechnicalIndicator {
  name: string;           // z.B. "RSI", "MACD"
  interpretation: string; // z.B. "Ueberverkauft bei 28, deutet auf moegliche Erholung"
}

export interface NewsAnalysis {
  id: string;
  articleIds: string[];
  summaryDe: string;
  sentiment: NewsSentiment;
  affectedTickers: AffectedTicker[];
  indicators?: TechnicalIndicator[];
  prognosisDe?: string | null;
  confidence?: number | null;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  analysisDurationMs?: number;
  createdAt: string;
}

// ==========================================
// Market Brief (Taegliche KI-Zusammenfassung)
// ==========================================

export interface MarketBriefKeyEvent {
  headline: string;
  sentiment: NewsSentiment;
  tickers: string[];
}

export interface MarketBrief {
  id: string;
  briefDate: string;        // YYYY-MM-DD
  titleDe: string;
  contentDe: string;         // Markdown
  keyEvents: MarketBriefKeyEvent[];
  overallSentiment: OverallSentiment;
  articleCount: number;
  analysisIds?: string[];
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface AnalyzedNewsItem {
  article: NewsArticle;
  analysis: NewsAnalysis;
}

export interface NewsFeedResponse {
  items: AnalyzedNewsItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface NewsSourcesResponse {
  builtin: NewsSource[];
  custom: NewsSource[];
}

export interface SourcePreviewResponse {
  articles: NewsArticleRaw[];
  errors?: string[];
}

export interface NewsFetchResult {
  fetched: number;
  duplicates: number;
  errors: Array<{ source: string; error: string }>;
}

export interface NewsAnalyzeResult {
  analyzed: number;
  briefGenerated: boolean;
  errors: string[];
}

// ==========================================
// Predictions (Feedback-Loop)
// ==========================================

export interface Prediction {
  id: string;
  analysisId?: string | null;
  ticker: string;
  direction: NewsSentiment;
  confidence: number;
  priceAtPrediction?: number | null;
  timeframeHours: number;
  expiresAt: string;
  actualPrice?: number | null;
  wasCorrect?: boolean | null;
  brierScore?: number | null;
  modelUsed?: string;
  createdAt: string;
}

// ==========================================
// Macro Indicators
// ==========================================

export interface MacroIndicator {
  id: string;
  indicatorKey: string;
  name: string;
  value: number;
  unit?: string;
  observationDate: string;
  source: string;
}

// ==========================================
// Ticker Technicals
// ==========================================

export interface TickerTechnical {
  id: string;
  ticker: string;
  date: string;
  closePrice?: number;
  rsi14?: number | null;
  macdSignal?: { macd: number; signal: number; histogram: number } | null;
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  bollinger?: { upper: number; middle: number; lower: number } | null;
  supportResistance?: { supports: number[]; resistances: number[] } | null;
  overallSignal?: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}
