/**
 * News Feed API Route
 *
 * GET /api/news/feed?cursor=ISO_DATE&limit=20&sentiment=bullish
 * Paginierter Feed analysierter News-Artikel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import type { AnalyzedNewsItem } from '@/types/news';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;

    const cursor = request.nextUrl.searchParams.get('cursor');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 50);
    const sentimentFilter = request.nextUrl.searchParams.get('sentiment');

    // Analysierte Artikel laden (mit zugehoeriger Analyse)
    let articlesQuery = supabase
      .from('news_articles')
      .select(`
        id, title, summary, url, image_url, published_at,
        related_tickers, category, is_analyzed, created_at,
        source:news_sources(name, provider_type)
      `)
      .eq('is_analyzed', true)
      .order('published_at', { ascending: false })
      .limit(limit + 1); // +1 fuer hasMore Check

    if (cursor) {
      articlesQuery = articlesQuery.lt('published_at', cursor);
    }

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) {
      return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 });
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ items: [], hasMore: false });
    }

    // Analysen fuer diese Artikel laden
    const articleIds = articles.slice(0, limit).map((a) => a.id);

    // Alle Analysen laden die einen dieser Artikel referenzieren
    const { data: analyses } = await supabase
      .from('news_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    // Analyse-Map: article_id -> analysis
    const analysisMap = new Map<string, typeof analyses extends (infer T)[] | null ? T : never>();
    if (analyses) {
      for (const analysis of analyses) {
        const ids = analysis.article_ids as string[];
        for (const id of ids) {
          if (articleIds.includes(id)) {
            analysisMap.set(id, analysis);
          }
        }
      }
    }

    // Items zusammenstellen
    let items: AnalyzedNewsItem[] = articles.slice(0, limit).map((article) => {
      const analysis = analysisMap.get(article.id);
      const sourceRaw = article.source;
      const source = (Array.isArray(sourceRaw) ? sourceRaw[0] : sourceRaw) as { name: string; provider_type: string } | null | undefined;

      return {
        article: {
          id: article.id,
          title: article.title,
          summary: article.summary,
          url: article.url,
          imageUrl: article.image_url,
          publishedAt: article.published_at,
          relatedTickers: article.related_tickers,
          category: article.category,
          isAnalyzed: article.is_analyzed,
          createdAt: article.created_at,
          sourceName: source?.name || undefined,
        },
        analysis: analysis
          ? {
              id: analysis.id,
              articleIds: analysis.article_ids,
              summaryDe: analysis.summary_de,
              sentiment: analysis.sentiment,
              affectedTickers: analysis.affected_tickers,
              indicators: analysis.indicators,
              prognosisDe: analysis.prognosis_de,
              confidence: analysis.confidence,
              createdAt: analysis.created_at,
            }
          : {
              id: '',
              articleIds: [article.id],
              summaryDe: article.summary || article.title,
              sentiment: 'neutral' as const,
              affectedTickers: [],
              createdAt: article.created_at,
            },
      };
    });

    // Sentiment-Filter anwenden (nach dem Laden, da es in der Analyse-Tabelle steht)
    if (sentimentFilter) {
      items = items.filter((item) => item.analysis.sentiment === sentimentFilter);
    }

    const hasMore = articles.length > limit;
    const nextCursor = hasMore && articles[limit - 1]
      ? articles[limit - 1].published_at
      : undefined;

    return NextResponse.json({ items, hasMore, nextCursor });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
