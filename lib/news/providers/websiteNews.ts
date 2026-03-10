import * as cheerio from 'cheerio';
import type { NewsArticleRaw } from '@/types/news';
import type { NewsProvider } from '../newsProvider';
import { registerProvider } from '../newsProvider';
import { logError, logInfo } from '@/lib/logger';

interface WebsiteSelectors {
  articleList: string;
  title: string;
  summary?: string;
  date?: string;
  link?: string;
  image?: string;
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

const websiteNewsProvider: NewsProvider = {
  name: 'Website',
  type: 'website',

  async fetch(config: Record<string, unknown>): Promise<NewsArticleRaw[]> {
    const url = config.url as string;
    const selectors = config.selectors as WebsiteSelectors | undefined;

    if (!url || !selectors?.articleList || !selectors?.title) {
      logError('Website source: missing url or required selectors', new Error('Invalid config'));
      return [];
    }

    const baseUrl = (config.baseUrl as string) || url;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TradingApp/1.0; News Aggregator)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        throw new Error(`Website returned ${response.status}: ${url}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const articles: NewsArticleRaw[] = [];

      $(selectors.articleList).each((index, element) => {
        const $el = $(element);

        const title = $el.find(selectors.title).first().text().trim();
        if (!title) return;

        const summary = selectors.summary
          ? $el.find(selectors.summary).first().text().trim() || undefined
          : undefined;

        let dateStr: string | undefined;
        if (selectors.date) {
          const $date = $el.find(selectors.date).first();
          dateStr = $date.attr('datetime') || $date.text().trim() || undefined;
        }

        let link: string | undefined;
        if (selectors.link) {
          const href = $el.find(selectors.link).first().attr('href');
          link = href ? resolveUrl(href, baseUrl) : undefined;
        } else {
          // Fallback: Link aus dem Titel-Element
          const href = $el.find(selectors.title).first().closest('a').attr('href')
            || $el.find(selectors.title).first().find('a').attr('href')
            || $el.find('a').first().attr('href');
          link = href ? resolveUrl(href, baseUrl) : undefined;
        }

        let imageUrl: string | undefined;
        if (selectors.image) {
          const src = $el.find(selectors.image).first().attr('src')
            || $el.find(selectors.image).first().attr('data-src');
          imageUrl = src ? resolveUrl(src, baseUrl) : undefined;
        }

        let publishedAt = new Date();
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        }

        articles.push({
          externalId: link || `${url}#${index}`,
          title,
          summary,
          url: link,
          imageUrl,
          publishedAt,
          category: undefined,
          sourceName: `Website (${new URL(url).hostname})`,
        });
      });

      logInfo(`Website (${new URL(url).hostname}): ${articles.length} Artikel extrahiert`);
      return articles;
    } catch (error) {
      logError(`Website news fetch failed: ${url}`, error);
      return [];
    }
  },
};

registerProvider(websiteNewsProvider);

export default websiteNewsProvider;
