-- ==========================================
-- News Feature Migration
-- Erstellt Tabellen fuer News-Quellen, Artikel, Analysen und Market Briefs
-- ==========================================

-- 1. News Sources (Built-in + User-definierte Konnektoren)
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,                          -- NULL = built-in/global, non-null = user-added
  name TEXT NOT NULL,                    -- Display name ("Finnhub", "Mein RSS Feed")
  provider_type TEXT NOT NULL            -- 'finnhub', 'alphavantage', 'newsapi', 'rss', 'website'
    CHECK (provider_type IN ('finnhub', 'alphavantage', 'newsapi', 'rss', 'website')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Provider-spezifische Config (url, selectors, etc.)
  is_enabled BOOLEAN DEFAULT TRUE,
  is_builtin BOOLEAN DEFAULT FALSE,     -- Built-in Sources koennen nicht geloescht werden
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_sources_user_id ON news_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_news_sources_enabled ON news_sources(is_enabled);

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

-- Built-in Sources (user_id IS NULL) sind fuer alle lesbar
-- User Sources nur fuer den Besitzer
CREATE POLICY "news_sources_select" ON news_sources
  FOR SELECT USING (
    user_id IS NULL
    OR auth.role() = 'service_role'
    OR user_id = current_setting('app.current_user_id', TRUE)
  );

CREATE POLICY "news_sources_insert" ON news_sources
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR user_id = current_setting('app.current_user_id', TRUE)
  );

CREATE POLICY "news_sources_update" ON news_sources
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR (user_id = current_setting('app.current_user_id', TRUE) AND is_builtin = FALSE)
  );

CREATE POLICY "news_sources_delete" ON news_sources
  FOR DELETE USING (
    user_id = current_setting('app.current_user_id', TRUE)
    AND is_builtin = FALSE
  );

-- 2. News Articles (Rohe Artikel von den Quellen)
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES news_sources(id) ON DELETE SET NULL,
  external_id TEXT,                       -- Provider-eigene Artikel-ID fuer Deduplizierung
  title TEXT NOT NULL,
  summary TEXT,                           -- Original-Zusammenfassung/-Beschreibung
  url TEXT,                               -- Link zum Original-Artikel
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  raw_content TEXT,                       -- Volltext falls verfuegbar
  related_tickers TEXT[],                 -- Ticker die von der Quelle zugeordnet wurden
  category TEXT,                          -- Kategorie (general, forex, crypto, merger)
  fetch_batch_id TEXT,                    -- Gruppiert Artikel des gleichen Fetch-Runs
  is_analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT news_articles_external_unique UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_analyzed ON news_articles(is_analyzed) WHERE is_analyzed = FALSE;
CREATE INDEX IF NOT EXISTS idx_news_articles_batch ON news_articles(fetch_batch_id);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Alle Artikel sind global lesbar (News sind oeffentlich)
CREATE POLICY "news_articles_select" ON news_articles
  FOR SELECT USING (true);

-- Nur service_role kann Artikel einfuegen/aktualisieren
CREATE POLICY "news_articles_insert" ON news_articles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "news_articles_update" ON news_articles
  FOR UPDATE USING (auth.role() = 'service_role');

-- 3. News Analyses (Claude AI Analysen pro Artikel-Batch)
CREATE TABLE IF NOT EXISTS news_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_ids UUID[] NOT NULL,            -- Referenzen auf analysierte Artikel
  summary_de TEXT NOT NULL,               -- Deutsche Zusammenfassung
  sentiment TEXT NOT NULL                 -- 'bullish', 'bearish', 'neutral'
    CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  affected_tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array von { ticker, name, sentiment, relevance }
  indicators JSONB,                       -- Array von { name, interpretation }
  prognosis_de TEXT,                      -- Deutsche Prognose/Ausblick
  confidence NUMERIC(3, 2),              -- 0.00 - 1.00
  model_used TEXT,                        -- z.B. 'claude-sonnet-4-20250514'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  analysis_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_analyses_created ON news_analyses(created_at DESC);

ALTER TABLE news_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_analyses_select" ON news_analyses
  FOR SELECT USING (true);

CREATE POLICY "news_analyses_insert" ON news_analyses
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 4. Market Briefs (Taegliche KI-Zusammenfassungen)
CREATE TABLE IF NOT EXISTS market_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL UNIQUE,        -- Ein Brief pro Kalendertag
  title_de TEXT NOT NULL,                 -- z.B. "Tageszusammenfassung 10. Maerz 2026"
  content_de TEXT NOT NULL,               -- Markdown-Inhalt
  key_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array von { headline, sentiment, tickers[] }
  overall_sentiment TEXT NOT NULL
    CHECK (overall_sentiment IN ('bullish', 'bearish', 'neutral', 'mixed')),
  article_count INTEGER NOT NULL DEFAULT 0,
  analysis_ids UUID[],                    -- Referenzen auf zugrundeliegende Analysen
  model_used TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_briefs_date ON market_briefs(brief_date DESC);

ALTER TABLE market_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_briefs_select" ON market_briefs
  FOR SELECT USING (true);

CREATE POLICY "market_briefs_insert" ON market_briefs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "market_briefs_update" ON market_briefs
  FOR UPDATE USING (auth.role() = 'service_role');

-- ==========================================
-- Built-in News Sources (Seed Data)
-- ==========================================

INSERT INTO news_sources (user_id, name, provider_type, config, is_enabled, is_builtin)
VALUES
  (NULL, 'Finnhub', 'finnhub', '{"category": "general"}'::jsonb, TRUE, TRUE),
  (NULL, 'Alpha Vantage', 'alphavantage', '{"topics": "financial_markets"}'::jsonb, TRUE, TRUE),
  (NULL, 'NewsAPI.org', 'newsapi', '{"country": "de", "category": "business"}'::jsonb, TRUE, TRUE)
ON CONFLICT DO NOTHING;
