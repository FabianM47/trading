-- Supabase Migration: Trading Bot Tabellen
-- Diese Migration erstellt die Tabellen fuer den Trading Bot

-- ============================================
-- 1. Bot Strategien
-- ============================================
CREATE TABLE IF NOT EXISTS bot_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  markdown_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_bot_strategies_user_id ON bot_strategies(user_id);

-- ============================================
-- 2. Bot User Configs
-- ============================================
CREATE TABLE IF NOT EXISTS bot_user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  virtual_budget NUMERIC(12, 2) DEFAULT 10000.00,
  remaining_budget NUMERIC(12, 2) DEFAULT 10000.00,
  include_in_portfolio BOOLEAN DEFAULT false,
  active_strategy_id UUID REFERENCES bot_strategies(id) ON DELETE SET NULL,
  max_positions INTEGER DEFAULT 5,
  max_position_size_pct NUMERIC(5, 2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_user_configs_user_id ON bot_user_configs(user_id);

-- ============================================
-- 3. Bot Watchlist
-- ============================================
CREATE TABLE IF NOT EXISTS bot_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  isin TEXT NOT NULL,
  ticker TEXT,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  added_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(user_id, isin)
);

CREATE INDEX IF NOT EXISTS idx_bot_watchlist_user_id ON bot_watchlist(user_id);

-- ============================================
-- 4. Bot Trades
-- ============================================
CREATE TABLE IF NOT EXISTS bot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  isin TEXT NOT NULL,
  ticker TEXT,
  name TEXT NOT NULL,
  buy_price NUMERIC(12, 4) NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  invested_amount NUMERIC(12, 2) NOT NULL,
  buy_date TIMESTAMPTZ NOT NULL,
  currency TEXT DEFAULT 'EUR',
  current_price NUMERIC(12, 4),

  -- Close fields
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  sell_price NUMERIC(12, 4),
  sell_total NUMERIC(12, 2),
  realized_pnl NUMERIC(12, 2),

  -- Bot metadata
  signal_type TEXT CHECK (signal_type IN ('manual', 'bot_signal', 'bot_auto')) DEFAULT 'manual',
  strategy_id UUID REFERENCES bot_strategies(id) ON DELETE SET NULL,
  entry_reason TEXT,
  exit_reason TEXT,
  stop_loss NUMERIC(12, 4),
  take_profit NUMERIC(12, 4),
  risk_reward_ratio NUMERIC(5, 2),

  -- Portfolio sync
  synced_trade_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trade_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_trades_user_id ON bot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_trades_isin ON bot_trades(isin);
CREATE INDEX IF NOT EXISTS idx_bot_trades_is_closed ON bot_trades(is_closed);

-- ============================================
-- 5. Bot Trade Learnings
-- ============================================
CREATE TABLE IF NOT EXISTS bot_trade_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  bot_trade_id UUID NOT NULL REFERENCES bot_trades(id) ON DELETE CASCADE,
  isin TEXT NOT NULL,
  ticker TEXT,

  -- Outcome data
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),
  pnl_amount NUMERIC(12, 2),
  pnl_percent NUMERIC(8, 2),
  holding_days INTEGER,

  -- Learning content
  market_conditions TEXT,
  what_worked TEXT,
  what_failed TEXT,
  lesson_summary TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Strategy context
  strategy_id UUID REFERENCES bot_strategies(id) ON DELETE SET NULL,
  strategy_name TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_trade_learnings_user_id ON bot_trade_learnings(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_trade_learnings_isin ON bot_trade_learnings(isin);

-- ============================================
-- 6. Bot Notifications
-- ============================================
CREATE TABLE IF NOT EXISTS bot_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  notify_on_signal BOOLEAN DEFAULT true,
  notify_on_trade_open BOOLEAN DEFAULT true,
  notify_on_trade_close BOOLEAN DEFAULT true,
  notify_on_stop_loss BOOLEAN DEFAULT true,
  notify_via_push BOOLEAN DEFAULT true,
  notify_via_chat BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_notifications_user_id ON bot_notifications(user_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE bot_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_trade_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_notifications ENABLE ROW LEVEL SECURITY;

-- Updated-at Trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_strategies_updated_at BEFORE UPDATE ON bot_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_user_configs_updated_at BEFORE UPDATE ON bot_user_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_trades_updated_at BEFORE UPDATE ON bot_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_notifications_updated_at BEFORE UPDATE ON bot_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
