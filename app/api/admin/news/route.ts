/**
 * Admin News Status API
 *
 * GET /api/admin/news — News-Statistiken und letzte Aktualisierung
 * Nur für Admins zugänglich.
 */

import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface AdminNewsStats {
  totalArticles: number;
  analyzedArticles: number;
  unanalyzedArticles: number;
  totalSources: number;
  enabledSources: number;
  lastFetchedAt: string | null;
  lastAnalyzedAt: string | null;
  lastBriefDate: string | null;
  articlesBySource: Array<{ sourceName: string; count: number }>;
}

export async function GET() {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;

    // Parallel alle Statistiken laden
    const [
      articlesResult,
      sourcesResult,
      lastArticleResult,
      lastAnalysisResult,
      lastBriefResult,
      articlesBySourceResult,
    ] = await Promise.all([
      // Artikel-Zaehler
      supabase.from('news_articles').select('is_analyzed', { count: 'exact' }),
      // Quellen-Zaehler
      supabase.from('news_sources').select('is_enabled', { count: 'exact' }),
      // Letzter Artikel
      supabase
        .from('news_articles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      // Letzte Analyse
      supabase
        .from('news_analyses')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      // Letzter Brief
      supabase
        .from('market_briefs')
        .select('brief_date')
        .order('brief_date', { ascending: false })
        .limit(1)
        .single(),
      // Artikel pro Quelle
      supabase
        .from('news_articles')
        .select('source_name'),
    ]);

    // Artikel-Statistiken berechnen
    const articles = articlesResult.data || [];
    const totalArticles = articles.length;
    const analyzedArticles = articles.filter((a) => a.is_analyzed).length;

    // Quellen-Statistiken
    const sources = sourcesResult.data || [];
    const totalSources = sources.length;
    const enabledSources = sources.filter((s) => s.is_enabled).length;

    // Artikel pro Quelle aggregieren
    const sourceCountMap = new Map<string, number>();
    if (articlesBySourceResult.data) {
      for (const article of articlesBySourceResult.data) {
        const name = article.source_name || 'Unbekannt';
        sourceCountMap.set(name, (sourceCountMap.get(name) || 0) + 1);
      }
    }
    const articlesBySource = Array.from(sourceCountMap.entries())
      .map(([sourceName, count]) => ({ sourceName, count }))
      .sort((a, b) => b.count - a.count);

    const stats: AdminNewsStats = {
      totalArticles,
      analyzedArticles,
      unanalyzedArticles: totalArticles - analyzedArticles,
      totalSources,
      enabledSources,
      lastFetchedAt: lastArticleResult.data?.created_at || null,
      lastAnalyzedAt: lastAnalysisResult.data?.created_at || null,
      lastBriefDate: lastBriefResult.data?.brief_date || null,
      articlesBySource,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    logError('Admin news stats API error', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
