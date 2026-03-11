/**
 * Predictions Verify API Route
 *
 * GET /api/predictions/verify — Cron-Endpoint (taeglich 22:00 Uhr)
 *
 * Verifiziert abgelaufene KI-Prognosen gegen aktuelle Kurse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyExpiredPredictions } from '@/lib/news/predictionVerifier';
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
    const { allowed } = checkRateLimit(`predictions-verify:${clientId}`, {
      interval: 60_000,
      maxRequests: 3,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!validateAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('Starting predictions verification...');
    const result = await verifyExpiredPredictions();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Predictions verify error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
