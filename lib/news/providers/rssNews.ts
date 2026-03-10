import Parser from 'rss-parser';
import type { NewsArticleRaw } from '@/types/news';
import type { NewsProvider } from '../newsProvider';
import { registerProvider } from '../newsProvider';
import { logError, logInfo } from '@/lib/logger';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'TradingApp/1.0 (News Aggregator)',
  },
});

const rssNewsProvider: NewsProvider = {
  name: 'RSS Feed',
  type: 'rss',

  async fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]> {
    const url = config.url as string;
    if (!url) {
      logError('RSS source has no URL configured', new Error('Missing URL'));
      return [];
    }

    try {
      const feed = await parser.parseURL(url);
      const items = feed.items || [];
      logInfo(`RSS (${feed.title || url}): ${items.length} Artikel geholt`);

      return items.map((item) => ({
        externalId: item.guid || item.link || item.title || '',
        title: item.title || 'Ohne Titel',
        summary: item.contentSnippet || item.content || undefined,
        url: item.link || undefined,
        imageUrl: item.enclosure?.url || undefined,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        rawContent: item.content || undefined,
        category: item.categories?.[0] || undefined,
        sourceName: `RSS (${feed.title || new URL(url).hostname})`,
      }));
    } catch (error) {
      logError(`RSS feed fetch failed: ${url}`, error);
      return [];
    }
  },
};

registerProvider(rssNewsProvider);

export default rssNewsProvider;
