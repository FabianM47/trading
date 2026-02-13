-- ============================================================================
-- Trading Portfolio App - Database Schema
-- Version: 1.0.0
-- PostgreSQL 14+
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  totp_secret VARCHAR(255),
  totp_enabled BOOLEAN DEFAULT false,
  default_currency VARCHAR(3) DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_users_currency_iso CHECK (LENGTH(default_currency) = 3)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

COMMENT ON TABLE users IS 'Application users with authentication details';
COMMENT ON COLUMN users.totp_secret IS 'TOTP secret for 2FA (encrypted)';

-- ============================================================================
-- PORTFOLIOS
-- ============================================================================

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  currency VARCHAR(3) DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_portfolios_currency_iso CHECK (LENGTH(currency) = 3),
  CONSTRAINT uq_portfolios_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_is_default ON portfolios(user_id, is_default) WHERE is_default = true;

COMMENT ON TABLE portfolios IS 'User portfolios for grouping trades';
COMMENT ON COLUMN portfolios.is_default IS 'Only one default portfolio per user';

-- Trigger: Ensure only one default portfolio per user
CREATE OR REPLACE FUNCTION ensure_single_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE portfolios 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portfolios_default
BEFORE INSERT OR UPDATE ON portfolios
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION ensure_single_default_portfolio();

-- ============================================================================
-- INSTRUMENTS (Stocks, ETFs, etc.)
-- ============================================================================

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isin VARCHAR(12) UNIQUE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  exchange VARCHAR(50) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  type VARCHAR(50) DEFAULT 'STOCK',
  country VARCHAR(2),
  sector VARCHAR(100),
  industry VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_instruments_isin_format CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  CONSTRAINT chk_instruments_currency_iso CHECK (LENGTH(currency) = 3),
  CONSTRAINT chk_instruments_country_iso CHECK (country IS NULL OR LENGTH(country) = 2),
  CONSTRAINT chk_instruments_type CHECK (type IN ('STOCK', 'ETF', 'BOND', 'FUND', 'CRYPTO', 'OTHER'))
);

CREATE UNIQUE INDEX idx_instruments_isin ON instruments(isin);
CREATE INDEX idx_instruments_symbol ON instruments(symbol);
CREATE INDEX idx_instruments_name ON instruments USING gin(to_tsvector('simple', name));
CREATE INDEX idx_instruments_currency ON instruments(currency);
CREATE INDEX idx_instruments_exchange ON instruments(exchange);
CREATE INDEX idx_instruments_is_active ON instruments(is_active) WHERE is_active = true;
CREATE INDEX idx_instruments_metadata ON instruments USING gin(metadata);

COMMENT ON TABLE instruments IS 'Financial instruments master data (stocks, ETFs, etc.)';
COMMENT ON COLUMN instruments.isin IS 'International Securities Identification Number (12 chars)';
COMMENT ON COLUMN instruments.metadata IS 'Additional flexible data in JSON format';

-- ============================================================================
-- TRADES (Transaction Log)
-- ============================================================================

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  trade_type VARCHAR(10) NOT NULL,
  quantity NUMERIC(20,8) NOT NULL,
  price_per_unit NUMERIC(20,8) NOT NULL,
  total_amount NUMERIC(20,8) NOT NULL,
  fees NUMERIC(20,8) DEFAULT 0,
  currency VARCHAR(3) NOT NULL,
  exchange_rate NUMERIC(20,10) DEFAULT 1.0,
  notes TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_trades_type CHECK (trade_type IN ('BUY', 'SELL')),
  CONSTRAINT chk_trades_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_trades_price_positive CHECK (price_per_unit > 0),
  CONSTRAINT chk_trades_amount_positive CHECK (total_amount > 0),
  CONSTRAINT chk_trades_fees_non_negative CHECK (fees >= 0),
  CONSTRAINT chk_trades_currency_iso CHECK (LENGTH(currency) = 3),
  CONSTRAINT chk_trades_exchange_rate_positive CHECK (exchange_rate > 0)
);

CREATE INDEX idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX idx_trades_instrument_id ON trades(instrument_id);
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);
CREATE INDEX idx_trades_trade_type ON trades(trade_type);
CREATE INDEX idx_trades_portfolio_executed ON trades(portfolio_id, executed_at DESC);

COMMENT ON TABLE trades IS 'Immutable trade transaction log (never update, only insert)';
COMMENT ON COLUMN trades.total_amount IS 'Total amount paid/received (including fees for BUY, excluding for SELL)';
COMMENT ON COLUMN trades.exchange_rate IS 'Exchange rate at time of trade (frozen for historical accuracy)';

-- ============================================================================
-- POSITIONS (Aggregated View)
-- ============================================================================

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  total_quantity NUMERIC(20,8) NOT NULL,
  avg_buy_price NUMERIC(20,8) NOT NULL,
  total_invested NUMERIC(20,8) NOT NULL,
  realized_pnl NUMERIC(20,8) DEFAULT 0,
  total_fees NUMERIC(20,8) DEFAULT 0,
  first_buy_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_trade_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  currency VARCHAR(3) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_positions_quantity_non_negative CHECK (total_quantity >= 0),
  CONSTRAINT chk_positions_avg_price_non_negative CHECK (avg_buy_price >= 0),
  CONSTRAINT chk_positions_invested_non_negative CHECK (total_invested >= 0),
  CONSTRAINT chk_positions_fees_non_negative CHECK (total_fees >= 0),
  CONSTRAINT chk_positions_currency_iso CHECK (LENGTH(currency) = 3),
  CONSTRAINT chk_positions_closed_logic CHECK (
    (is_closed = false AND closed_at IS NULL) OR
    (is_closed = true AND closed_at IS NOT NULL)
  ),
  CONSTRAINT uq_positions_portfolio_instrument UNIQUE (portfolio_id, instrument_id)
);

CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_instrument_id ON positions(instrument_id);
CREATE INDEX idx_positions_is_closed ON positions(is_closed);
CREATE INDEX idx_positions_portfolio_active ON positions(portfolio_id, is_closed) 
  WHERE is_closed = false;

COMMENT ON TABLE positions IS 'Aggregated position data (cache, can be recalculated from trades)';
COMMENT ON COLUMN positions.avg_buy_price IS 'Average cost basis (weighted average of all buys)';
COMMENT ON COLUMN positions.realized_pnl IS 'Sum of all realized profits/losses from sells';

-- ============================================================================
-- PRICE SNAPSHOTS (Historical Price Data)
-- ============================================================================

CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  price NUMERIC(20,8) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  source VARCHAR(50) NOT NULL,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_price_snapshots_price_positive CHECK (price > 0),
  CONSTRAINT chk_price_snapshots_currency_iso CHECK (LENGTH(currency) = 3),
  CONSTRAINT uq_price_snapshots_instrument_time UNIQUE (instrument_id, snapshot_at)
);

CREATE INDEX idx_price_snapshots_instrument_id ON price_snapshots(instrument_id);
CREATE INDEX idx_price_snapshots_instrument_time ON price_snapshots(instrument_id, snapshot_at DESC);
CREATE INDEX idx_price_snapshots_snapshot_at ON price_snapshots(snapshot_at DESC);

COMMENT ON TABLE price_snapshots IS 'Historical price data for instruments';
COMMENT ON COLUMN price_snapshots.source IS 'Data source (e.g., Alpha Vantage, Yahoo Finance)';
COMMENT ON COLUMN price_snapshots.snapshot_at IS 'Timestamp of the price (not when it was saved)';

-- ============================================================================
-- EXCHANGE RATES (Multi-Currency Support)
-- ============================================================================

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(20,10) NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_exchange_rates_from_iso CHECK (LENGTH(from_currency) = 3),
  CONSTRAINT chk_exchange_rates_to_iso CHECK (LENGTH(to_currency) = 3),
  CONSTRAINT chk_exchange_rates_rate_positive CHECK (rate > 0),
  CONSTRAINT chk_exchange_rates_different_currencies CHECK (from_currency != to_currency),
  CONSTRAINT uq_exchange_rates_currencies_time UNIQUE (from_currency, to_currency, valid_from)
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency, valid_from DESC);
CREATE INDEX idx_exchange_rates_valid_from ON exchange_rates(valid_from DESC);

COMMENT ON TABLE exchange_rates IS 'Historical exchange rates for multi-currency support';
COMMENT ON COLUMN exchange_rates.valid_from IS 'When this rate became valid';

-- ============================================================================
-- INSTRUMENT GROUPS (Tags/Categories)
-- ============================================================================

CREATE TABLE instrument_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_instrument_groups_color_hex CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT uq_instrument_groups_portfolio_name UNIQUE (portfolio_id, name)
);

CREATE INDEX idx_instrument_groups_portfolio_id ON instrument_groups(portfolio_id);

COMMENT ON TABLE instrument_groups IS 'User-defined groups/tags for instruments';
COMMENT ON COLUMN instrument_groups.color IS 'Hex color code for UI display (e.g., #FF5733)';

-- ============================================================================
-- INSTRUMENT GROUP ASSIGNMENTS (Many-to-Many)
-- ============================================================================

CREATE TABLE instrument_group_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES instrument_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT uq_instrument_group_assignments UNIQUE (instrument_id, group_id)
);

CREATE INDEX idx_instrument_group_assignments_instrument ON instrument_group_assignments(instrument_id);
CREATE INDEX idx_instrument_group_assignments_group ON instrument_group_assignments(group_id);

COMMENT ON TABLE instrument_group_assignments IS 'Join table for instrument-to-group many-to-many relationship';

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_audit_logs_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'))
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

COMMENT ON TABLE audit_logs IS 'Audit trail for all critical operations';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_instruments_updated_at
  BEFORE UPDATE ON instruments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_groups ENABLE ROW LEVEL SECURITY;

-- Policies (Example - requires session variable)
-- Note: Implement in application layer if using connection pooling

-- CREATE POLICY portfolios_user_isolation ON portfolios
--   FOR ALL
--   USING (user_id = current_setting('app.current_user_id')::uuid);

-- CREATE POLICY trades_user_isolation ON trades
--   FOR ALL
--   USING (portfolio_id IN (
--     SELECT id FROM portfolios 
--     WHERE user_id = current_setting('app.current_user_id')::uuid
--   ));

COMMENT ON TABLE portfolios IS 'Row Level Security enabled - users can only access their own portfolios';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get latest price for an instrument
CREATE OR REPLACE FUNCTION get_latest_price(p_instrument_id UUID)
RETURNS NUMERIC AS $$
  SELECT price 
  FROM price_snapshots 
  WHERE instrument_id = p_instrument_id 
  ORDER BY snapshot_at DESC 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_latest_price IS 'Get the most recent price for an instrument';

-- Function to get exchange rate at specific time
CREATE OR REPLACE FUNCTION get_exchange_rate(
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3),
  p_at_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS NUMERIC AS $$
  SELECT rate 
  FROM exchange_rates 
  WHERE from_currency = p_from_currency 
    AND to_currency = p_to_currency 
    AND valid_from <= p_at_time 
  ORDER BY valid_from DESC 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_exchange_rate IS 'Get exchange rate at a specific point in time';

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- Create default currencies in exchange_rates (1:1 for same currency)
INSERT INTO exchange_rates (from_currency, to_currency, rate, valid_from, source)
VALUES 
  ('EUR', 'EUR', 1.0, '2020-01-01', 'SYSTEM'),
  ('USD', 'USD', 1.0, '2020-01-01', 'SYSTEM'),
  ('GBP', 'GBP', 1.0, '2020-01-01', 'SYSTEM')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANTS (Adjust based on your user setup)
-- ============================================================================

-- GRANT ALL ON ALL TABLES IN SCHEMA public TO trading_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO trading_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO trading_app_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
