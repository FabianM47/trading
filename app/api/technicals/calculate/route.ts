/**
 * Technicals Calculate API Route
 *
 * GET /api/technicals/calculate — Cron-Endpoint
 *
 * Berechnet technische Indikatoren (RSI, MACD, SMA, etc.) fuer alle
 * Ticker aus offenen Trades via Alpha Vantage Historical Data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateAllTechnicals } from '@/lib/news/technicalCalculator';
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
    const { allowed } = checkRateLimit(`technicals-calc:${clientId}`, {
      interval: 60_000,
      maxRequests: 3,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('Starting technical indicators calculation...');
    const result = await calculateAllTechnicals();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Technicals calculate error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
