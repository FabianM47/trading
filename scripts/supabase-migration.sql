-- Supabase Migration: Trades Tabelle
-- Diese Migration erstellt die Tabelle für benutzerspezifische Trades

-- Trades Tabelle erstellen
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Logto User ID
  
  -- Trade Basis-Daten
  trade_id TEXT NOT NULL,  -- Frontend-generierte UUID (für Kompatibilität)
  isin TEXT NOT NULL,
  ticker TEXT,
  name TEXT NOT NULL,
  
  -- Kauf-Daten
  buy_price NUMERIC(12, 4) NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  invested_eur NUMERIC(12, 4) NOT NULL,
  buy_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Aktueller Preis (gecached)
  current_price NUMERIC(12, 4),
  
  -- Derivate-spezifische Felder
  is_derivative BOOLEAN DEFAULT FALSE,
  leverage NUMERIC(8, 2),
  product_type TEXT,
  underlying TEXT,
  knock_out NUMERIC(12, 4),
  option_type TEXT CHECK (option_type IN ('call', 'put')),
  
  -- Teilverkauf-Felder
  original_quantity NUMERIC(12, 4),
  partial_sales JSONB DEFAULT '[]'::jsonb,
  
  -- Verkaufs-Daten (für geschlossene Trades)
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMP WITH TIME ZONE,
  sell_price NUMERIC(12, 4),
  sell_total NUMERIC(12, 4),
  realized_pnl NUMERIC(12, 4),
  is_partial_sale BOOLEAN DEFAULT FALSE,
  parent_trade_id TEXT,
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT trades_user_id_trade_id_unique UNIQUE (user_id, trade_id)
);

-- Index für schnellere Abfragen nach user_id
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);

-- Index für offene Trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id_is_closed ON trades(user_id, is_closed);

-- Index für Suche nach ISIN
CREATE INDEX IF NOT EXISTS idx_trades_user_id_isin ON trades(user_id, isin);

-- Row Level Security (RLS) aktivieren
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Benutzer können nur ihre eigenen Trades sehen
CREATE POLICY "Users can view their own trades"
  ON trades
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- RLS Policy: Benutzer können nur ihre eigenen Trades erstellen
CREATE POLICY "Users can insert their own trades"
  ON trades
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

-- RLS Policy: Benutzer können nur ihre eigenen Trades aktualisieren
CREATE POLICY "Users can update their own trades"
  ON trades
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- RLS Policy: Benutzer können nur ihre eigenen Trades löschen
CREATE POLICY "Users can delete their own trades"
  ON trades
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Funktion zum automatischen Aktualisieren des updated_at Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatisches Aktualisieren des updated_at Feldes
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Kommentare für Dokumentation
COMMENT ON TABLE trades IS 'Speichert alle Trading-Positionen der Benutzer';
COMMENT ON COLUMN trades.user_id IS 'Logto User ID zur Identifikation des Besitzers';
COMMENT ON COLUMN trades.trade_id IS 'Frontend-generierte UUID für Kompatibilität';
COMMENT ON COLUMN trades.partial_sales IS 'JSON Array mit Historie aller Teilverkäufe';
