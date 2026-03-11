/**
 * Macro Data Fetch API Route
 *
 * GET /api/macro/fetch -- Cron-Endpoint fuer Makrodaten (FRED API)
 *
 * Holt aktuelle makrooekonomische Indikatoren und speichert sie in der DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMacroIndicators } from '@/lib/news/macroDataProvider';
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
  if (!cronSecret) return false;

  const headerSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!headerSecret) return false;

  return safeCompare(headerSecret, cronSecret);
}

export async function GET(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    const { allowed } = checkRateLimit(`macro-fetch:${clientId}`, {
      interval: 60_000,
      maxRequests: 5,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('Starting macro indicators fetch...');
    const result = await fetchMacroIndicators();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Macro fetch error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
