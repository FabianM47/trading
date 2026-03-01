-- Supabase Migration: Sankey Configs Tabelle
-- Speichert die Sankey-Diagramm Konfigurationen pro Benutzer

CREATE TABLE IF NOT EXISTS sankey_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,  -- Logto User ID (1 Config pro User)
  
  -- Die komplette Sankey-Konfiguration als JSON
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Abfragen nach user_id
CREATE INDEX IF NOT EXISTS idx_sankey_configs_user_id ON sankey_configs(user_id);

-- Row Level Security (RLS) aktivieren
ALTER TABLE sankey_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sankey config"
  ON sankey_configs
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own sankey config"
  ON sankey_configs
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own sankey config"
  ON sankey_configs
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own sankey config"
  ON sankey_configs
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Trigger für auto-update von updated_at
CREATE OR REPLACE FUNCTION update_sankey_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sankey_configs_updated_at
  BEFORE UPDATE ON sankey_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_sankey_configs_updated_at();
