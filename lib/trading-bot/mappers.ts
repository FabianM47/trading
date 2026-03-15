import type {
  BotStrategy,
  BotUserConfig,
  BotWatchlistItem,
  BotTrade,
  BotTradeLearning,
  BotNotificationConfig,
} from '@/types/trading-bot';

// ── Bot Strategy ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToStrategy(row: any): BotStrategy {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    markdownContent: row.markdown_content,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function strategyToDbRow(s: Partial<BotStrategy> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (s.userId !== undefined) row.user_id = s.userId;
  if (s.name !== undefined) row.name = s.name;
  if (s.slug !== undefined) row.slug = s.slug;
  if (s.description !== undefined) row.description = s.description;
  if (s.markdownContent !== undefined) row.markdown_content = s.markdownContent;
  if (s.isActive !== undefined) row.is_active = s.isActive;
  return row;
}

// ── Bot User Config ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToConfig(row: any): BotUserConfig {
  return {
    id: row.id,
    userId: row.user_id,
    isEnabled: row.is_enabled,
    virtualBudget: parseFloat(row.virtual_budget),
    remainingBudget: parseFloat(row.remaining_budget),
    includeInPortfolio: row.include_in_portfolio,
    activeStrategyId: row.active_strategy_id || undefined,
    maxPositions: row.max_positions,
    maxPositionSizePct: parseFloat(row.max_position_size_pct),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function configToDbRow(c: Partial<BotUserConfig> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (c.userId !== undefined) row.user_id = c.userId;
  if (c.isEnabled !== undefined) row.is_enabled = c.isEnabled;
  if (c.virtualBudget !== undefined) row.virtual_budget = c.virtualBudget;
  if (c.remainingBudget !== undefined) row.remaining_budget = c.remainingBudget;
  if (c.includeInPortfolio !== undefined) row.include_in_portfolio = c.includeInPortfolio;
  if (c.activeStrategyId !== undefined) row.active_strategy_id = c.activeStrategyId;
  if (c.maxPositions !== undefined) row.max_positions = c.maxPositions;
  if (c.maxPositionSizePct !== undefined) row.max_position_size_pct = c.maxPositionSizePct;
  return row;
}

// ── Bot Watchlist ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToWatchlistItem(row: any): BotWatchlistItem {
  return {
    id: row.id,
    userId: row.user_id,
    isin: row.isin,
    ticker: row.ticker || undefined,
    name: row.name,
    currency: row.currency,
    addedAt: row.added_at,
    isActive: row.is_active,
    notes: row.notes || undefined,
  };
}

export function watchlistItemToDbRow(w: Partial<BotWatchlistItem> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (w.userId !== undefined) row.user_id = w.userId;
  if (w.isin !== undefined) row.isin = w.isin;
  if (w.ticker !== undefined) row.ticker = w.ticker;
  if (w.name !== undefined) row.name = w.name;
  if (w.currency !== undefined) row.currency = w.currency;
  if (w.isActive !== undefined) row.is_active = w.isActive;
  if (w.notes !== undefined) row.notes = w.notes;
  return row;
}

// ── Bot Trade ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToTrade(row: any): BotTrade {
  return {
    id: row.id,
    userId: row.user_id,
    tradeId: row.trade_id,
    isin: row.isin,
    ticker: row.ticker || undefined,
    name: row.name,
    buyPrice: parseFloat(row.buy_price),
    quantity: parseFloat(row.quantity),
    investedAmount: parseFloat(row.invested_amount),
    buyDate: row.buy_date,
    currency: row.currency,
    currentPrice: row.current_price ? parseFloat(row.current_price) : undefined,
    isClosed: row.is_closed,
    closedAt: row.closed_at || undefined,
    sellPrice: row.sell_price ? parseFloat(row.sell_price) : undefined,
    sellTotal: row.sell_total ? parseFloat(row.sell_total) : undefined,
    realizedPnL: row.realized_pnl ? parseFloat(row.realized_pnl) : undefined,
    signalType: row.signal_type,
    strategyId: row.strategy_id || undefined,
    entryReason: row.entry_reason || undefined,
    exitReason: row.exit_reason || undefined,
    stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : undefined,
    takeProfit: row.take_profit ? parseFloat(row.take_profit) : undefined,
    riskRewardRatio: row.risk_reward_ratio ? parseFloat(row.risk_reward_ratio) : undefined,
    syncedTradeId: row.synced_trade_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function tradeToDbRow(t: Partial<BotTrade> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (t.userId !== undefined) row.user_id = t.userId;
  if (t.tradeId !== undefined) row.trade_id = t.tradeId;
  if (t.isin !== undefined) row.isin = t.isin;
  if (t.ticker !== undefined) row.ticker = t.ticker;
  if (t.name !== undefined) row.name = t.name;
  if (t.buyPrice !== undefined) row.buy_price = t.buyPrice;
  if (t.quantity !== undefined) row.quantity = t.quantity;
  if (t.investedAmount !== undefined) row.invested_amount = t.investedAmount;
  if (t.buyDate !== undefined) row.buy_date = t.buyDate;
  if (t.currency !== undefined) row.currency = t.currency;
  if (t.currentPrice !== undefined) row.current_price = t.currentPrice;
  if (t.isClosed !== undefined) row.is_closed = t.isClosed;
  if (t.closedAt !== undefined) row.closed_at = t.closedAt;
  if (t.sellPrice !== undefined) row.sell_price = t.sellPrice;
  if (t.sellTotal !== undefined) row.sell_total = t.sellTotal;
  if (t.realizedPnL !== undefined) row.realized_pnl = t.realizedPnL;
  if (t.signalType !== undefined) row.signal_type = t.signalType;
  if (t.strategyId !== undefined) row.strategy_id = t.strategyId;
  if (t.entryReason !== undefined) row.entry_reason = t.entryReason;
  if (t.exitReason !== undefined) row.exit_reason = t.exitReason;
  if (t.stopLoss !== undefined) row.stop_loss = t.stopLoss;
  if (t.takeProfit !== undefined) row.take_profit = t.takeProfit;
  if (t.riskRewardRatio !== undefined) row.risk_reward_ratio = t.riskRewardRatio;
  if (t.syncedTradeId !== undefined) row.synced_trade_id = t.syncedTradeId;
  return row;
}

// ── Bot Trade Learning ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToLearning(row: any): BotTradeLearning {
  return {
    id: row.id,
    userId: row.user_id,
    botTradeId: row.bot_trade_id,
    isin: row.isin,
    ticker: row.ticker || undefined,
    outcome: row.outcome,
    pnlAmount: row.pnl_amount ? parseFloat(row.pnl_amount) : undefined,
    pnlPercent: row.pnl_percent ? parseFloat(row.pnl_percent) : undefined,
    holdingDays: row.holding_days || undefined,
    marketConditions: row.market_conditions || undefined,
    whatWorked: row.what_worked || undefined,
    whatFailed: row.what_failed || undefined,
    lessonSummary: row.lesson_summary || undefined,
    tags: row.tags || [],
    strategyId: row.strategy_id || undefined,
    strategyName: row.strategy_name || undefined,
    createdAt: row.created_at,
  };
}

export function learningToDbRow(l: Partial<BotTradeLearning> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (l.userId !== undefined) row.user_id = l.userId;
  if (l.botTradeId !== undefined) row.bot_trade_id = l.botTradeId;
  if (l.isin !== undefined) row.isin = l.isin;
  if (l.ticker !== undefined) row.ticker = l.ticker;
  if (l.outcome !== undefined) row.outcome = l.outcome;
  if (l.pnlAmount !== undefined) row.pnl_amount = l.pnlAmount;
  if (l.pnlPercent !== undefined) row.pnl_percent = l.pnlPercent;
  if (l.holdingDays !== undefined) row.holding_days = l.holdingDays;
  if (l.marketConditions !== undefined) row.market_conditions = l.marketConditions;
  if (l.whatWorked !== undefined) row.what_worked = l.whatWorked;
  if (l.whatFailed !== undefined) row.what_failed = l.whatFailed;
  if (l.lessonSummary !== undefined) row.lesson_summary = l.lessonSummary;
  if (l.tags !== undefined) row.tags = l.tags;
  if (l.strategyId !== undefined) row.strategy_id = l.strategyId;
  if (l.strategyName !== undefined) row.strategy_name = l.strategyName;
  return row;
}

// ── Bot Notification Config ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToNotificationConfig(row: any): BotNotificationConfig {
  return {
    id: row.id,
    userId: row.user_id,
    notifyOnSignal: row.notify_on_signal,
    notifyOnTradeOpen: row.notify_on_trade_open,
    notifyOnTradeClose: row.notify_on_trade_close,
    notifyOnStopLoss: row.notify_on_stop_loss,
    notifyViaPush: row.notify_via_push,
    notifyViaChat: row.notify_via_chat,
  };
}

export function notificationConfigToDbRow(n: Partial<BotNotificationConfig> & { userId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (n.userId !== undefined) row.user_id = n.userId;
  if (n.notifyOnSignal !== undefined) row.notify_on_signal = n.notifyOnSignal;
  if (n.notifyOnTradeOpen !== undefined) row.notify_on_trade_open = n.notifyOnTradeOpen;
  if (n.notifyOnTradeClose !== undefined) row.notify_on_trade_close = n.notifyOnTradeClose;
  if (n.notifyOnStopLoss !== undefined) row.notify_on_stop_loss = n.notifyOnStopLoss;
  if (n.notifyViaPush !== undefined) row.notify_via_push = n.notifyViaPush;
  if (n.notifyViaChat !== undefined) row.notify_via_chat = n.notifyViaChat;
  return row;
}
