-- ============================================================================
-- Trading Portfolio App - Seed Data for Development
-- ============================================================================

-- Clean existing data (DEVELOPMENT ONLY!)
-- TRUNCATE TABLE audit_logs, instrument_group_assignments, instrument_groups, 
--          positions, trades, price_snapshots, portfolios, instruments, users 
--          RESTART IDENTITY CASCADE;

-- ============================================================================
-- USERS
-- ============================================================================

INSERT INTO users (id, email, password_hash, name, default_currency, created_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo@trading.app',
    -- Password: 'Demo123!' (hash with argon2 in real app!)
    '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
    'Demo User',
    'EUR',
    NOW() - INTERVAL '6 months'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'investor@trading.app',
    '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
    'Pro Investor',
    'USD',
    NOW() - INTERVAL '1 year'
  );

-- ============================================================================
-- PORTFOLIOS
-- ============================================================================

INSERT INTO portfolios (id, user_id, name, description, is_default, currency, created_at)
VALUES 
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Hauptportfolio',
    'Mein langfristiges Aktienportfolio',
    true,
    'EUR',
    NOW() - INTERVAL '6 months'
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Trading',
    'Kurzfristige Trades',
    false,
    'EUR',
    NOW() - INTERVAL '3 months'
  ),
  (
    '10000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Tech Portfolio',
    'Technology stocks focus',
    true,
    'USD',
    NOW() - INTERVAL '1 year'
  );

-- ============================================================================
-- INSTRUMENTS (Popular Stocks & ETFs)
-- ============================================================================

INSERT INTO instruments (id, isin, symbol, name, exchange, currency, type, country, sector, is_active)
VALUES 
  -- Deutsche Aktien
  (
    '20000000-0000-0000-0000-000000000001'::uuid,
    'DE0005140008',
    'DBK',
    'Deutsche Bank AG',
    'XETRA',
    'EUR',
    'STOCK',
    'DE',
    'Financial Services',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    'DE0007164600',
    'SAP',
    'SAP SE',
    'XETRA',
    'EUR',
    'STOCK',
    'DE',
    'Technology',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003'::uuid,
    'DE0008404005',
    'ALV',
    'Allianz SE',
    'XETRA',
    'EUR',
    'STOCK',
    'DE',
    'Financial Services',
    true
  ),
  
  -- US Tech Stocks
  (
    '20000000-0000-0000-0000-000000000004'::uuid,
    'US0378331005',
    'AAPL',
    'Apple Inc.',
    'NASDAQ',
    'USD',
    'STOCK',
    'US',
    'Technology',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000005'::uuid,
    'US5949181045',
    'MSFT',
    'Microsoft Corporation',
    'NASDAQ',
    'USD',
    'STOCK',
    'US',
    'Technology',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000006'::uuid,
    'US02079K3059',
    'GOOGL',
    'Alphabet Inc. Class A',
    'NASDAQ',
    'USD',
    'STOCK',
    'US',
    'Technology',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000007'::uuid,
    'US88160R1014',
    'TSLA',
    'Tesla Inc.',
    'NASDAQ',
    'USD',
    'STOCK',
    'US',
    'Automotive',
    true
  ),
  
  -- ETFs
  (
    '20000000-0000-0000-0000-000000000008'::uuid,
    'IE00B4L5Y983',
    'IWDA',
    'iShares Core MSCI World UCITS ETF',
    'XETRA',
    'EUR',
    'ETF',
    'IE',
    'Global Equity',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000009'::uuid,
    'IE00BJ0KDQ92',
    'XMME',
    'Xtrackers MSCI Emerging Markets UCITS ETF',
    'XETRA',
    'EUR',
    'ETF',
    'IE',
    'Emerging Markets',
    true
  );

-- ============================================================================
-- INSTRUMENT GROUPS
-- ============================================================================

INSERT INTO instrument_groups (id, portfolio_id, name, color, icon, description)
VALUES 
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Tech Aktien',
    '#4CAF50',
    '💻',
    'Technologie-Unternehmen'
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Dividenden',
    '#2196F3',
    '💰',
    'Dividenden-starke Aktien'
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'ETFs',
    '#9C27B0',
    '📊',
    'Exchange Traded Funds'
  );

-- ============================================================================
-- INSTRUMENT GROUP ASSIGNMENTS
-- ============================================================================

INSERT INTO instrument_group_assignments (instrument_id, group_id)
VALUES 
  -- Tech Gruppe
  ('20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000001'::uuid), -- SAP
  ('20000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000001'::uuid), -- Apple
  ('20000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000001'::uuid), -- Microsoft
  ('20000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000001'::uuid), -- Alphabet
  
  -- Dividenden Gruppe
  ('20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000002'::uuid), -- Allianz
  ('20000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000002'::uuid), -- Microsoft
  
  -- ETF Gruppe
  ('20000000-0000-0000-0000-000000000008'::uuid, '30000000-0000-0000-0000-000000000003'::uuid), -- MSCI World
  ('20000000-0000-0000-0000-000000000009'::uuid, '30000000-0000-0000-0000-000000000003'::uuid); -- EM ETF

-- ============================================================================
-- TRADES (Sample transactions)
-- ============================================================================

INSERT INTO trades (id, portfolio_id, instrument_id, trade_type, quantity, price_per_unit, total_amount, fees, currency, executed_at, created_at)
VALUES 
  -- SAP Käufe
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    'BUY',
    10,
    120.50,
    1215.00, -- 10 * 120.50 + 10€ fees
    10.00,
    'EUR',
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '5 months'
  ),
  (
    '40000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    'BUY',
    5,
    118.00,
    595.00, -- 5 * 118.00 + 5€ fees
    5.00,
    'EUR',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '3 months'
  ),
  
  -- Apple Kauf
  (
    '40000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000004'::uuid,
    'BUY',
    20,
    175.50,
    3520.00, -- 20 * 175.50 + 10€ fees
    10.00,
    'USD',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '4 months'
  ),
  
  -- Microsoft Käufe
  (
    '40000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000005'::uuid,
    'BUY',
    15,
    380.00,
    5710.00, -- 15 * 380.00 + 10€ fees
    10.00,
    'USD',
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '6 months'
  ),
  
  -- ETF Sparplan (monatlich)
  (
    '40000000-0000-0000-0000-000000000005'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    'BUY',
    12.5,
    80.00,
    1000.00,
    0.00, -- Keine Gebühren bei Sparplan
    'EUR',
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '5 months'
  ),
  (
    '40000000-0000-0000-0000-000000000006'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    'BUY',
    12.3,
    81.30,
    1000.00,
    0.00,
    'EUR',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '4 months'
  ),
  (
    '40000000-0000-0000-0000-000000000007'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    'BUY',
    12.1,
    82.64,
    1000.00,
    0.00,
    'EUR',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '3 months'
  ),
  
  -- Tesla Trade (Buy + Sell mit Gewinn)
  (
    '40000000-0000-0000-0000-000000000008'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000007'::uuid,
    'BUY',
    5,
    240.00,
    1210.00, -- 5 * 240.00 + 10€ fees
    10.00,
    'USD',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '2 months'
  ),
  (
    '40000000-0000-0000-0000-000000000009'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000007'::uuid,
    'SELL',
    5,
    270.00,
    1340.00, -- 5 * 270.00 - 10€ fees
    10.00,
    'USD',
    NOW() - INTERVAL '1 week',
    NOW() - INTERVAL '1 week'
  );

-- ============================================================================
-- POSITIONS (Aggregated - should match trades above)
-- ============================================================================

INSERT INTO positions (
  id, portfolio_id, instrument_id, total_quantity, avg_buy_price, 
  total_invested, realized_pnl, total_fees, first_buy_at, last_trade_at, 
  is_closed, currency
)
VALUES 
  -- SAP Position (15 Stück, Durchschnitt aus 2 Käufen)
  (
    '50000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    15,
    119.67, -- (10*120.50 + 5*118.00) / 15 ≈ 119.67
    1810.00, -- 1215 + 595
    0,
    15.00,
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '3 months',
    false,
    'EUR'
  ),
  
  -- Apple Position
  (
    '50000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000004'::uuid,
    20,
    176.00, -- (20 * 175.50 + 10 fees) / 20
    3520.00,
    0,
    10.00,
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '4 months',
    false,
    'USD'
  ),
  
  -- Microsoft Position
  (
    '50000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000005'::uuid,
    15,
    380.67, -- (15 * 380 + 10 fees) / 15
    5710.00,
    0,
    10.00,
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '6 months',
    false,
    'USD'
  ),
  
  -- ETF Position (Sparplan-Anteile)
  (
    '50000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    36.9, -- 12.5 + 12.3 + 12.1
    81.30, -- Durchschnitt
    3000.00,
    0,
    0.00,
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '3 months',
    false,
    'EUR'
  ),
  
  -- Tesla Position (CLOSED - verkauft mit Gewinn)
  (
    '50000000-0000-0000-0000-000000000005'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000007'::uuid,
    0, -- Alle verkauft
    242.00, -- Kaufpreis inkl. Fees
    1210.00,
    130.00, -- Realized: (270 * 5 - 10) - (240 * 5 + 10) = 1340 - 1210 = 130
    20.00, -- Buy fees + Sell fees
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 week',
    true,
    'USD'
  );

-- ============================================================================
-- PRICE SNAPSHOTS (Current & Historical)
-- ============================================================================

-- Helper: Generate timestamps for last 7 days, every 15 minutes
-- In real app, this would be populated by cron job

INSERT INTO price_snapshots (instrument_id, price, currency, source, snapshot_at)
SELECT
  '20000000-0000-0000-0000-000000000002'::uuid, -- SAP
  125.00 + (random() * 5)::numeric(20,2), -- Price between 125-130
  'EUR',
  'DEMO_SEED',
  snapshot_time
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '15 minutes'
) AS snapshot_time;

-- Apple prices
INSERT INTO price_snapshots (instrument_id, price, currency, source, snapshot_at)
SELECT
  '20000000-0000-0000-0000-000000000004'::uuid, -- AAPL
  182.00 + (random() * 8)::numeric(20,2), -- Price between 182-190
  'USD',
  'DEMO_SEED',
  snapshot_time
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '15 minutes'
) AS snapshot_time;

-- Microsoft prices
INSERT INTO price_snapshots (instrument_id, price, currency, source, snapshot_at)
SELECT
  '20000000-0000-0000-0000-000000000005'::uuid, -- MSFT
  395.00 + (random() * 10)::numeric(20,2),
  'USD',
  'DEMO_SEED',
  snapshot_time
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '15 minutes'
) AS snapshot_time;

-- ETF prices (more stable)
INSERT INTO price_snapshots (instrument_id, price, currency, source, snapshot_at)
SELECT
  '20000000-0000-0000-0000-000000000008'::uuid, -- MSCI World ETF
  83.50 + (random() * 1.5)::numeric(20,2),
  'EUR',
  'DEMO_SEED',
  snapshot_time
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '15 minutes'
) AS snapshot_time;

-- ============================================================================
-- EXCHANGE RATES (Sample EUR/USD rates)
-- ============================================================================

INSERT INTO exchange_rates (from_currency, to_currency, rate, valid_from, source)
SELECT
  'EUR',
  'USD',
  1.08 + (random() * 0.02)::numeric(20,10), -- Rate between 1.08-1.10
  rate_time,
  'DEMO_SEED'
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '1 day'
) AS rate_time;

INSERT INTO exchange_rates (from_currency, to_currency, rate, valid_from, source)
SELECT
  'USD',
  'EUR',
  0.92 + (random() * 0.02)::numeric(20,10), -- Rate between 0.92-0.94
  rate_time,
  'DEMO_SEED'
FROM generate_series(
  NOW() - INTERVAL '7 days',
  NOW(),
  INTERVAL '1 day'
) AS rate_time;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check portfolio summary
SELECT 
  u.name as user_name,
  p.name as portfolio_name,
  COUNT(pos.id) as positions_count,
  SUM(pos.total_invested) as total_invested,
  SUM(pos.realized_pnl) as total_realized_pnl
FROM users u
JOIN portfolios p ON u.id = p.user_id
LEFT JOIN positions pos ON p.id = pos.portfolio_id
GROUP BY u.id, u.name, p.id, p.name
ORDER BY u.name, p.name;

-- Check current prices
SELECT 
  i.symbol,
  i.name,
  ps.price as current_price,
  ps.currency,
  ps.snapshot_at
FROM instruments i
JOIN LATERAL (
  SELECT price, currency, snapshot_at
  FROM price_snapshots
  WHERE instrument_id = i.id
  ORDER BY snapshot_at DESC
  LIMIT 1
) ps ON true
ORDER BY i.symbol;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
