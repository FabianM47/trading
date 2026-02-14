/**
 * Deprecated: Route entfernt. Nutze /api/prices für Kurse und Server Actions für Trades.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Gone', message: 'This endpoint has been removed. Use /api/prices for live prices.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Gone', message: 'This endpoint has been removed. Use server actions for trades.' },
    { status: 410 }
  );
}
