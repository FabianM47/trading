-- Macro Indicators Migration
-- Speichert makrooekonomische Daten (FRED API, EZB, etc.)

CREATE TABLE IF NOT EXISTS macro_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_key TEXT NOT NULL,
  name TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT,
  observation_date DATE NOT NULL,
  source TEXT DEFAULT 'FRED',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (indicator_key, observation_date)
);

CREATE INDEX IF NOT EXISTS idx_macro_indicators_key ON macro_indicators(indicator_key, observation_date DESC);

ALTER TABLE macro_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "macro_indicators_select" ON macro_indicators
  FOR SELECT USING (true);

CREATE POLICY "macro_indicators_insert" ON macro_indicators
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "macro_indicators_update" ON macro_indicators
  FOR UPDATE USING (auth.role() = 'service_role');
