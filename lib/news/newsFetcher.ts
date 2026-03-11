import { supabase } from '@/lib/supabase';
import { getProvider } from './newsProvider';
import type { NewsArticleRaw, NewsProviderType, NewsFetchResult } from '@/types/news';
import { logError, logInfo } from '@/lib/logger';

// Provider-Module importieren um sie zu registrieren
import './providers/finnhubNews';
import './providers/alphaVantageNews';
import './providers/newsApiNews';
import './providers/rssNews';
import './providers/websiteNews';

interface DbNewsSource {
  id: string;
  user_id: string | null;
  name: string;
  provider_type: NewsProviderType;
  config: Record<string, unknown>;
  is_enabled: boolean;
  is_builtin: boolean;
  source_weight: number;
}

export interface FetchOptions {
  /** 'hourly' = nur unlimitierte Quellen, 'morning' = alle + Brief */
  type?: 'hourly' | 'morning';
}

/**
 * Holt News von allen aktivierten Quellen und speichert sie in der DB.
 * Dedupliziert anhand von (source_id, external_id).
 */
export async function fetchAllNews(options: FetchOptions = {}): Promise<NewsFetchResult> {
  const batchId = crypto.randomUUID();
  const errors: Array<{ source: string; error: string }> = [];
  let totalFetched = 0;
  let totalDuplicates = 0;

  // 1. Alle aktivierten Quellen laden
  const { data: sources, error: sourcesError } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_enabled', true);

  if (sourcesError) {
    logError('Failed to load news sources', sourcesError);
    return { fetched: 0, duplicates: 0, errors: [{ source: 'DB', error: sourcesError.message }] };
  }

  if (!sources || sources.length === 0) {
    logInfo('No enabled news sources found');
    return { fetched: 0, duplicates: 0, errors: [] };
  }

  // Bei stündlichem Fetch: nur unlimitierte Quellen (keine API-Limits)
  let filteredSources = sources as DbNewsSource[];
  if (options.type === 'hourly') {
    const unlimitedTypes: NewsProviderType[] = ['finnhub', 'rss', 'website'];
    filteredSources = filteredSources.filter((s) => unlimitedTypes.includes(s.provider_type as NewsProviderType));
    logInfo(`Hourly fetch: ${filteredSources.length} of ${sources.length} sources (unlimited only)`);
  }

  logInfo(`Fetching news from ${filteredSources.length} sources (batch: ${batchId})`);

  // 2. Alle Provider parallel ausfuehren
  const fetchPromises = filteredSources.map(async (source) => {
    const provider = getProvider(source.provider_type);
    if (!provider) {
      errors.push({ source: source.name, error: `Provider '${source.provider_type}' nicht gefunden` });
      return [];
    }

    try {
      const articles = await provider.fetch(source.config);
      return articles.map((article) => ({
        ...article,
        sourceId: source.id,
        sourceWeight: source.source_weight ?? 1.0,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ source: source.name, error: message });
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);

  // 3. Ergebnisse sammeln
  const allArticles: Array<NewsArticleRaw & { sourceId: string; sourceWeight: number }> = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }

  if (allArticles.length === 0) {
    logInfo('No articles fetched from any source');
    return { fetched: 0, duplicates: 0, errors };
  }

  // 4. Deduplizierung nach URL
  const seen = new Set<string>();
  const uniqueArticles = allArticles.filter((article) => {
    const key = article.url || `${article.sourceId}:${article.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logInfo(`${allArticles.length} Artikel geholt, ${uniqueArticles.length} nach Deduplizierung`);

  // 5. In die DB einfuegen (mit ON CONFLICT fuer source_id + external_id)
  for (const article of uniqueArticles) {
    const { error: insertError } = await supabase
      .from('news_articles')
      .upsert(
        {
          source_id: article.sourceId,
          external_id: article.externalId,
          title: article.title,
          summary: article.summary || null,
          url: article.url || null,
          image_url: article.imageUrl || null,
          published_at: article.publishedAt.toISOString(),
          raw_content: article.rawContent || null,
          related_tickers: article.relatedTickers || null,
          category: article.category || null,
          fetch_batch_id: batchId,
          is_analyzed: false,
          source_weight: article.sourceWeight ?? 1.0,
        },
        {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: true,
        }
      );

    if (insertError) {
      // Duplicate (UNIQUE constraint) -> erwartet bei wiederholtem Fetch
      if (insertError.code === '23505') {
        totalDuplicates++;
      } else {
        logError(`Failed to insert article: ${article.title}`, insertError);
      }
    } else {
      totalFetched++;
    }
  }

  logInfo(`News fetch complete: ${totalFetched} neue, ${totalDuplicates} Duplikate, ${errors.length} Fehler`);
  return { fetched: totalFetched, duplicates: totalDuplicates, errors };
}
