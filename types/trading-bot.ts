// Trading Bot Types

export interface BotStrategy {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  markdownContent: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotUserConfig {
  id: string;
  userId: string;
  isEnabled: boolean;
  virtualBudget: number;
  remainingBudget: number;
  includeInPortfolio: boolean;
  activeStrategyId?: string;
  maxPositions: number;
  maxPositionSizePct: number;
  createdAt: string;
  updatedAt: string;
}

export interface BotWatchlistItem {
  id: string;
  userId: string;
  isin: string;
  ticker?: string;
  name: string;
  currency: string;
  addedAt: string;
  isActive: boolean;
  notes?: string;
}

export type BotSignalType = 'manual' | 'bot_signal' | 'bot_auto';

export interface BotTrade {
  id: string;
  userId: string;
  tradeId: string;
  isin: string;
  ticker?: string;
  name: string;
  buyPrice: number;
  quantity: number;
  investedAmount: number;
  buyDate: string;
  currency: string;
  currentPrice?: number;

  // Close fields
  isClosed: boolean;
  closedAt?: string;
  sellPrice?: number;
  sellTotal?: number;
  realizedPnL?: number;

  // Bot metadata
  signalType: BotSignalType;
  strategyId?: string;
  entryReason?: string;
  exitReason?: string;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;

  // Portfolio sync
  syncedTradeId?: string;

  createdAt: string;
  updatedAt: string;
}

export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export interface BotTradeLearning {
  id: string;
  userId: string;
  botTradeId: string;
  isin: string;
  ticker?: string;
  outcome: TradeOutcome;
  pnlAmount?: number;
  pnlPercent?: number;
  holdingDays?: number;
  marketConditions?: string;
  whatWorked?: string;
  whatFailed?: string;
  lessonSummary?: string;
  tags: string[];
  strategyId?: string;
  strategyName?: string;
  createdAt: string;
}

export interface BotNotificationConfig {
  id: string;
  userId: string;
  notifyOnSignal: boolean;
  notifyOnTradeOpen: boolean;
  notifyOnTradeClose: boolean;
  notifyOnStopLoss: boolean;
  notifyViaPush: boolean;
  notifyViaChat: boolean;
}

export type BotTab = 'dashboard' | 'strategies' | 'watchlist' | 'trades' | 'settings';

// Stats aggregation for dashboard
export interface BotStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  totalRealizedPnL: number;
  avgHoldingDays: number;
  virtualBudget: number;
  remainingBudget: number;
  activeStrategyName?: string;
}
