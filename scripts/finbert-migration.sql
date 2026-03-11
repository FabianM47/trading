-- FinBERT Migration
-- Fuegt FinBERT-Sentiment-Spalten zu news_articles hinzu

ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS finbert_sentiment TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS finbert_confidence DECIMAL(4,3);

COMMENT ON COLUMN news_articles.finbert_sentiment IS 'FinBERT Sentiment: positive, negative, neutral';
COMMENT ON COLUMN news_articles.finbert_confidence IS 'FinBERT Konfidenz-Score (0.000-1.000)';

CREATE INDEX IF NOT EXISTS idx_news_articles_finbert ON news_articles(finbert_sentiment) WHERE finbert_sentiment IS NOT NULL;
