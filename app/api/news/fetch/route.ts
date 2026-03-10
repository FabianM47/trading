/**
 * News Fetch API Route
 *
 * GET  /api/news/fetch — Vercel Cron (CRON_SECRET)
 * POST /api/news/fetch — Externer Cron-Service (Bearer Token)
 *
 * Holt News von allen aktivierten Quellen und speichert sie in der DB.
 * Chainet optional zu /api/news/analyze.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/news/newsFetcher';
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

async function handleFetch(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    const { allowed } = checkRateLimit(`news-fetch:${clientId}`, {
      interval: 60_000,
      maxRequests: 5,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('Starting news fetch...');
    const result = await fetchAllNews();

    // Optional: Analyse automatisch triggern
    const shouldAnalyze = request.nextUrl.searchParams.get('analyze') !== 'false';
    if (shouldAnalyze && result.fetched > 0) {
      try {
        const analyzeUrl = new URL('/api/news/analyze', request.url);
        const secret = process.env.CRON_SECRET;
        if (secret) {
          // Fire-and-forget: Analyse im Hintergrund starten
          fetch(analyzeUrl.toString(), {
            method: 'POST',
            headers: { Authorization: `Bearer ${secret}` },
          }).catch((err) => logError('Failed to chain analyze', err));
        }
      } catch (chainError) {
        logError('Failed to chain to analyze endpoint', chainError);
      }
    }

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('News fetch error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleFetch(request);
}

export async function POST(request: NextRequest) {
  return handleFetch(request);
}
