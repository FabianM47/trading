import type { NewsArticleRaw } from '@/types/news';
import type { NewsProvider } from '../newsProvider';
import { registerProvider } from '../newsProvider';
import { logError, logInfo } from '@/lib/logger';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const finnhubNewsProvider: NewsProvider = {
  name: 'Finnhub',
  type: 'finnhub',

  async fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      logError('FINNHUB_API_KEY not configured', new Error('Missing API key'));
      return [];
    }

    const category = (config.category as string) || 'general';

    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/news?category=${category}&token=${apiKey}`,
        { next: { revalidate: 0 } }
      );

      if (!response.ok) {
        throw new Error(`Finnhub news API returned ${response.status}`);
      }

      const items: FinnhubNewsItem[] = await response.json();
      logInfo(`Finnhub: ${items.length} Artikel geholt`);

      return items.map((item) => ({
        externalId: String(item.id),
        title: item.headline,
        summary: item.summary || undefined,
        url: item.url || undefined,
        imageUrl: item.image || undefined,
        publishedAt: new Date(item.datetime * 1000),
        relatedTickers: item.related
          ? item.related.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        category: item.category || undefined,
        sourceName: `Finnhub (${item.source || 'General'})`,
      }));
    } catch (error) {
      logError('Finnhub news fetch failed', error);
      return [];
    }
  },
};

registerProvider(finnhubNewsProvider);

export default finnhubNewsProvider;
