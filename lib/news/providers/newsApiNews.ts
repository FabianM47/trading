import type { NewsArticleRaw } from '@/types/news';
import type { NewsProvider } from '../newsProvider';
import { registerProvider } from '../newsProvider';
import { logError, logInfo } from '@/lib/logger';

const NEWSAPI_BASE_URL = 'https://newsapi.org/v2';

interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string; // ISO string
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
  code?: string;
  message?: string;
}

const newsApiProvider: NewsProvider = {
  name: 'NewsAPI.org',
  type: 'newsapi',

  async fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      logError('NEWSAPI_KEY not configured', new Error('Missing API key'));
      return [];
    }

    const country = (config.country as string) || 'de';
    const category = (config.category as string) || 'business';

    try {
      const response = await fetch(
        `${NEWSAPI_BASE_URL}/top-headlines?country=${country}&category=${category}&pageSize=50&apiKey=${apiKey}`,
        { next: { revalidate: 0 } }
      );

      if (!response.ok) {
        throw new Error(`NewsAPI returned ${response.status}`);
      }

      const data: NewsApiResponse = await response.json();

      if (data.status !== 'ok') {
        logError('NewsAPI error response', new Error(data.message || data.code || 'Unknown'));
        return [];
      }

      const articles = data.articles || [];
      logInfo(`NewsAPI: ${articles.length} Artikel geholt`);

      return articles
        .filter((a) => a.title && a.title !== '[Removed]')
        .map((item) => ({
          externalId: item.url,
          title: item.title,
          summary: item.description || undefined,
          url: item.url,
          imageUrl: item.urlToImage || undefined,
          publishedAt: new Date(item.publishedAt),
          rawContent: item.content || undefined,
          category: category,
          sourceName: `NewsAPI (${item.source?.name || 'Unknown'})`,
        }));
    } catch (error) {
      logError('NewsAPI news fetch failed', error);
      return [];
    }
  },
};

registerProvider(newsApiProvider);

export default newsApiProvider;
