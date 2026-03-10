/**
 * Market Brief API Route
 *
 * GET /api/news/brief?date=YYYY-MM-DD — Tageszusammenfassung laden
 * Default: heutiger Tag
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = request.nextUrl.searchParams.get('date')
      || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('market_briefs')
      .select('*')
      .eq('brief_date', date)
      .single();

    if (error || !data) {
      return NextResponse.json({ brief: null });
    }

    return NextResponse.json({
      brief: {
        id: data.id,
        briefDate: data.brief_date,
        titleDe: data.title_de,
        contentDe: data.content_de,
        keyEvents: data.key_events,
        overallSentiment: data.overall_sentiment,
        articleCount: data.article_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
