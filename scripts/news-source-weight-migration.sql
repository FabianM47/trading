-- Source Weight Migration
-- Fuegt Gewichtung fuer Nachrichtenquellen hinzu

ALTER TABLE news_sources ADD COLUMN IF NOT EXISTS source_weight FLOAT DEFAULT 1.0;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_weight FLOAT DEFAULT 1.0;

COMMENT ON COLUMN news_sources.source_weight IS 'Gewichtung der Quelle (0.0-2.0). Built-in: 1.0, RSS: 0.8, Reddit: 0.3';
COMMENT ON COLUMN news_articles.source_weight IS 'Gewichtung der Quelle zum Zeitpunkt des Fetch';

-- Default-Werte fuer bestehende Built-in Sources
UPDATE news_sources SET source_weight = 1.0 WHERE is_builtin = true;
