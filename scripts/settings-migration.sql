-- Supabase Migration: User Settings Tabelle
-- Speichert benutzerspezifische Einstellungen als Key-Value

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Benachrichtigungen
  trade_notifications BOOLEAN DEFAULT TRUE,  -- Chat-Nachricht bei neuem Trade anderer User

  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ein Eintrag pro User
  CONSTRAINT user_settings_user_id_unique UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Auto-update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ALTER Statement für bestehende DB:
-- ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS trade_notifications BOOLEAN DEFAULT TRUE;
