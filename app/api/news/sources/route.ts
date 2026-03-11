/**
 * News Sources API Route
 *
 * GET    /api/news/sources — Alle Quellen laden (built-in + custom)
 * POST   /api/news/sources — Neue custom Quelle erstellen
 * PUT    /api/news/sources — Custom Quelle aktualisieren
 * DELETE /api/news/sources?id=UUID — Custom Quelle loeschen
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation Schemas
const rssConfigSchema = z.object({
  url: z.string().url('Ungueltige URL'),
});

const websiteSelectorsSchema = z.object({
  articleList: z.string().min(1, 'Artikel-Container Selektor ist Pflicht'),
  title: z.string().min(1, 'Titel Selektor ist Pflicht'),
  summary: z.string().optional(),
  date: z.string().optional(),
  link: z.string().optional(),
  image: z.string().optional(),
});

const websiteConfigSchema = z.object({
  url: z.string().url('Ungueltige URL'),
  selectors: websiteSelectorsSchema,
  dateFormat: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

const createSourceSchema = z.object({
  name: z.string().min(1).max(100),
  providerType: z.enum(['rss', 'website']),
  config: z.record(z.unknown()),
});

const updateSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const authResult = await requireApiRole('trading');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    // Built-in Sources (user_id IS NULL)
    const { data: builtinSources } = await supabase
      .from('news_sources')
      .select('*')
      .is('user_id', null)
      .order('name');

    // User's custom sources
    const { data: customSources } = await supabase
      .from('news_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const mapSource = (s: Record<string, unknown>) => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      providerType: s.provider_type,
      config: s.config,
      isEnabled: s.is_enabled,
      isBuiltin: s.is_builtin,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });

    return NextResponse.json({
      builtin: (builtinSources || []).map(mapSource),
      custom: (customSources || []).map(mapSource),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const parsed = createSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, providerType, config } = parsed.data;

    // Config-spezifische Validierung
    if (providerType === 'rss') {
      const rssResult = rssConfigSchema.safeParse(config);
      if (!rssResult.success) {
        return NextResponse.json(
          { error: 'Ungueltige RSS-Konfiguration', details: rssResult.error.flatten() },
          { status: 400 }
        );
      }
    } else if (providerType === 'website') {
      const webResult = websiteConfigSchema.safeParse(config);
      if (!webResult.success) {
        return NextResponse.json(
          { error: 'Ungueltige Website-Konfiguration', details: webResult.error.flatten() },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('news_sources')
      .insert({
        user_id: userId,
        name,
        provider_type: providerType,
        config,
        is_enabled: true,
        is_builtin: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Quelle konnte nicht erstellt werden' }, { status: 500 });
    }

    return NextResponse.json({
      source: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        providerType: data.provider_type,
        config: data.config,
        isEnabled: data.is_enabled,
        isBuiltin: data.is_builtin,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();
    const parsed = updateSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, name, config, isEnabled } = parsed.data;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config;
    if (isEnabled !== undefined) updateData.is_enabled = isEnabled;

    const { data, error } = await supabase
      .from('news_sources')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_builtin', false)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Quelle nicht gefunden oder keine Berechtigung' }, { status: 404 });
    }

    return NextResponse.json({
      source: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        providerType: data.provider_type,
        config: data.config,
        isEnabled: data.is_enabled,
        isBuiltin: data.is_builtin,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiRole('admin');
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('news_sources')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_builtin', false);

    if (error) {
      return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
