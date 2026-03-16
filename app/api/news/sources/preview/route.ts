/**
 * Source Preview API Route
 *
 * POST /api/news/sources/preview — Testet RSS/Website-Selektoren
 * Gibt Beispiel-Artikel zurück ohne in die DB zu speichern.
 * Rate-Limited: 10/h pro User
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { getProvider } from '@/lib/news/newsProvider';
import { checkRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

// Provider importieren
import '@/lib/news/providers/rssNews';
import '@/lib/news/providers/websiteNews';

const previewSchema = z.object({
  providerType: z.enum(['rss', 'website']),
  config: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();

    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.claims.sub;

    // Rate-Limit: 10 Previews pro Stunde
    const { allowed } = checkRateLimit(`news-preview:${userId}`, {
      interval: 3_600_000,
      maxRequests: 10,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Vorschau-Anfragen. Maximal 10 pro Stunde.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = previewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { providerType, config } = parsed.data;
    const provider = getProvider(providerType);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider '${providerType}' nicht verfügbar` },
        { status: 400 }
      );
    }

    const articles = await provider.fetch(config as Record<string, unknown>);

    // Nur die ersten 5 Artikel als Vorschau
    const preview = articles.slice(0, 5).map((a) => ({
      title: a.title,
      summary: a.summary || null,
      url: a.url || null,
      imageUrl: a.imageUrl || null,
      publishedAt: a.publishedAt.toISOString(),
      sourceName: a.sourceName,
    }));

    return NextResponse.json({
      articles: preview,
      totalFound: articles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Vorschau fehlgeschlagen', details: message },
      { status: 500 }
    );
  }
}
