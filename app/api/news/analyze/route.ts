/**
 * News Analyze API Route
 *
 * POST /api/news/analyze — Vercel Cron oder interner Chain-Call
 *
 * Analysiert unverarbeitete Artikel mit Claude und generiert den Market Brief.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeUnprocessedNews } from '@/lib/news/newsAnalyzer';
import { logError, logInfo } from '@/lib/logger';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function validateAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (headerSecret && safeCompare(headerSecret, cronSecret)) return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const apiKey = authHeader.substring(7);
  const expectedKey = process.env.NEWS_API_KEY || process.env.CRON_SECRET;
  if (!expectedKey) return false;

  return safeCompare(apiKey, expectedKey);
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    const { allowed } = checkRateLimit(`news-analyze:${clientId}`, {
      interval: 60_000,
      maxRequests: 5,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('Starting news analysis...');
    const result = await analyzeUnprocessedNews();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('News analyze error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
