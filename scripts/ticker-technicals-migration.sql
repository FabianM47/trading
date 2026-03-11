-- Ticker Technicals Migration
-- Speichert berechnete technische Indikatoren pro Ticker und Tag

CREATE TABLE IF NOT EXISTS ticker_technicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  close_price DECIMAL,
  rsi_14 DECIMAL,
  macd_signal JSONB,                    -- { macd, signal, histogram }
  ema_20 DECIMAL,
  ema_50 DECIMAL,
  ema_200 DECIMAL,
  sma_50 DECIMAL,
  sma_200 DECIMAL,
  bollinger JSONB,                      -- { upper, middle, lower }
  support_resistance JSONB,             -- { supports: [], resistances: [] }
  overall_signal TEXT                   -- BULLISH / BEARISH / SIDEWAYS
    CHECK (overall_signal IN ('BULLISH', 'BEARISH', 'SIDEWAYS')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (ticker, date)
);

CREATE INDEX IF NOT EXISTS idx_ticker_technicals_ticker ON ticker_technicals(ticker, date DESC);

ALTER TABLE ticker_technicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticker_technicals_select" ON ticker_technicals
  FOR SELECT USING (true);

CREATE POLICY "ticker_technicals_insert" ON ticker_technicals
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "ticker_technicals_update" ON ticker_technicals
  FOR UPDATE USING (auth.role() = 'service_role');
