-- Migration: currency und price_provider Spalten zur trades Tabelle hinzufügen
-- Diese Felder speichern die Handelswährung und den erfolgreichen Kurs-Provider

ALTER TABLE trades ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('EUR', 'USD'));
ALTER TABLE trades ADD COLUMN IF NOT EXISTS price_provider TEXT;

COMMENT ON COLUMN trades.currency IS 'Handelswährung (EUR oder USD)';
COMMENT ON COLUMN trades.price_provider IS 'Kurs-Provider der erfolgreich Preise liefert (yahoo, ing, finnhub, coingecko)';
