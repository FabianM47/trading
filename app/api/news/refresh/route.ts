/**
 * News Refresh API Route
 *
 * POST /api/news/refresh — Manueller News-Refresh (Fetch + Analyse)
 * Rate-Limited: 3 Requests pro Stunde pro User
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { fetchAllNews } from '@/lib/news/newsFetcher';
import { analyzeUnprocessedNews } from '@/lib/news/newsAnalyzer';
import { checkRateLimit } from '@/lib/rateLimit';
import { logInfo, logError } from '@/lib/logger';

export async function POST() {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // Rate-Limit: 3 Refreshes pro Stunde
    const { allowed } = checkRateLimit(`news-refresh:${userId}`, {
      interval: 3_600_000, // 1 Stunde
      maxRequests: 3,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Maximal 3 Aktualisierungen pro Stunde.' },
        { status: 429 }
      );
    }

    logInfo(`Manual news refresh triggered by user ${userId}`);

    // 1. News holen
    const fetchResult = await fetchAllNews();

    // 2. Analysieren (nur wenn neue Artikel vorhanden)
    let analyzeResult = { analyzed: 0, briefGenerated: false, errors: [] as string[] };
    if (fetchResult.fetched > 0) {
      analyzeResult = await analyzeUnprocessedNews();
    }

    return NextResponse.json({
      fetch: fetchResult,
      analyze: analyzeResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('News refresh error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
