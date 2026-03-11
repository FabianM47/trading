-- Predictions Migration
-- Speichert KI-Prognosen fuer spaetere Verifizierung (Feedback-Loop)

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES news_analyses(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  confidence DECIMAL(3,2) NOT NULL,
  price_at_prediction DECIMAL,
  timeframe_hours INT NOT NULL DEFAULT 24,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_price DECIMAL,
  was_correct BOOLEAN,
  brier_score DECIMAL(5,4),
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_expires ON predictions(expires_at) WHERE was_correct IS NULL;
CREATE INDEX IF NOT EXISTS idx_predictions_ticker ON predictions(ticker, created_at DESC);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select" ON predictions
  FOR SELECT USING (true);

CREATE POLICY "predictions_insert" ON predictions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "predictions_update" ON predictions
  FOR UPDATE USING (auth.role() = 'service_role');
