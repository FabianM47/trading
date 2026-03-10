import type { NewsArticleRaw } from '@/types/news';
import type { NewsProvider } from '../newsProvider';
import { registerProvider } from '../newsProvider';
import { logError, logInfo } from '@/lib/logger';

const AV_BASE_URL = 'https://www.alphavantage.co/query';

interface AlphaVantageNewsItem {
  title: string;
  url: string;
  time_published: string; // "20260310T120000"
  authors: string[];
  summary: string;
  banner_image: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: Array<{ topic: string; relevance_score: string }>;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment?: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
}

interface AlphaVantageResponse {
  feed?: AlphaVantageNewsItem[];
  Information?: string;
  Note?: string;
}

function parseAVDateTime(dateStr: string): Date {
  // Format: "20260310T120000"
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(9, 11));
  const minute = parseInt(dateStr.substring(11, 13));
  const second = parseInt(dateStr.substring(13, 15));
  return new Date(year, month, day, hour, minute, second);
}

const alphaVantageNewsProvider: NewsProvider = {
  name: 'Alpha Vantage',
  type: 'alphavantage',

  async fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      logError('ALPHA_VANTAGE_API_KEY not configured', new Error('Missing API key'));
      return [];
    }

    const topics = (config.topics as string) || 'financial_markets';

    try {
      const response = await fetch(
        `${AV_BASE_URL}?function=NEWS_SENTIMENT&topics=${topics}&apikey=${apiKey}&limit=50`,
        { next: { revalidate: 0 } }
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage news API returned ${response.status}`);
      }

      const data: AlphaVantageResponse = await response.json();

      if (data.Information || data.Note) {
        logError('Alpha Vantage rate limit or info', new Error(data.Information || data.Note));
        return [];
      }

      const items = data.feed || [];
      logInfo(`Alpha Vantage: ${items.length} Artikel geholt`);

      return items.map((item) => ({
        externalId: item.url, // URL als ID (kein eigenes ID-Feld)
        title: item.title,
        summary: item.summary || undefined,
        url: item.url,
        imageUrl: item.banner_image || undefined,
        publishedAt: parseAVDateTime(item.time_published),
        relatedTickers: item.ticker_sentiment
          ?.map((ts) => ts.ticker)
          .filter((t) => !t.startsWith('CRYPTO:') && !t.startsWith('FOREX:'))
          || undefined,
        category: item.topics?.[0]?.topic || undefined,
        sourceName: `Alpha Vantage (${item.source || 'News'})`,
      }));
    } catch (error) {
      logError('Alpha Vantage news fetch failed', error);
      return [];
    }
  },
};

registerProvider(alphaVantageNewsProvider);

export default alphaVantageNewsProvider;
