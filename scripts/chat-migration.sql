-- Supabase Migration: Global Chat
-- Ein einziger Chat-Raum fuer alle Benutzer

-- ================================================
-- 1. chat_users: Benutzerverzeichnis fuer Chat
-- ================================================
CREATE TABLE IF NOT EXISTS chat_users (
  user_id TEXT PRIMARY KEY,              -- Logto User ID
  username TEXT UNIQUE NOT NULL,         -- Anzeigename
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 2. chat_messages: Globale Chat-Nachrichten
-- ================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES chat_users(user_id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index fuer chronologische Abfrage
CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON chat_messages(created_at DESC);

-- RLS aktivieren
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Kommentare
COMMENT ON TABLE chat_users IS 'Benutzerverzeichnis fuer den Chat (sync mit Logto)';
COMMENT ON TABLE chat_messages IS 'Globale Chat-Nachrichten aller Benutzer';
