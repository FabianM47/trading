-- =============================================
-- Supabase Migration: Price Alerts & Push Subscriptions
-- =============================================
-- Führe dieses Script in der Supabase SQL-Konsole aus

-- =============================================
-- 1. Push Subscriptions Tabelle
-- =============================================
-- Speichert Web Push Subscription-Endpunkte pro Benutzer/Gerät

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Logto User ID
  
  -- Web Push Subscription Daten
  endpoint TEXT NOT NULL,               -- Push Service URL
  p256dh TEXT NOT NULL,                 -- Client Public Key
  auth TEXT NOT NULL,                   -- Auth Secret
  
  -- Device Info
  user_agent TEXT,                      -- Browser/Device Info
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ein Endpunkt pro User (Gerät kann sich neu registrieren)
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- =============================================
-- 2. Price Alerts Tabelle
-- =============================================
-- Speichert Preisalarme die bei Erreichen eines Zielpreises Push-Notifications auslösen

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Logto User ID
  
  -- Was wird überwacht?
  isin TEXT NOT NULL,                    -- ISIN oder Ticker
  ticker TEXT,                           -- Ticker Symbol (für Anzeige)
  name TEXT NOT NULL,                    -- Name des Wertpapiers
  
  -- Alert-Bedingung
  target_price NUMERIC(12, 4) NOT NULL,  -- Zielpreis
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),  -- 'above' = Preis >= target, 'below' = Preis <= target
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,        -- Alert ist aktiv?
  triggered_at TIMESTAMP WITH TIME ZONE, -- Wann wurde der Alert ausgelöst?
  last_checked_price NUMERIC(12, 4),     -- Letzter geprüfter Preis
  last_checked_at TIMESTAMP WITH TIME ZONE, -- Letzte Prüfung
  
  -- Wiederholung
  repeat BOOLEAN DEFAULT FALSE,          -- Soll der Alert nach Auslösung erneut aktiv werden?
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_isin ON price_alerts(isin);

-- RLS
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON price_alerts FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own alerts"
  ON price_alerts FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own alerts"
  ON price_alerts FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own alerts"
  ON price_alerts FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Trigger für updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Kommentare
COMMENT ON TABLE push_subscriptions IS 'Web Push Subscription-Endpunkte pro Benutzer/Gerät';
COMMENT ON TABLE price_alerts IS 'Preisalarme für Push-Benachrichtigungen';
COMMENT ON COLUMN price_alerts.direction IS 'above = Preis steigt über target, below = Preis fällt unter target';
