'use client';

import { useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import SelectorConfig from './SelectorConfig';
import SourcePreview from './SourcePreview';

interface SourceFormProps {
  onSave: (data: {
    name: string;
    providerType: 'rss' | 'website';
    config: Record<string, unknown>;
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    name: string;
    providerType: 'rss' | 'website';
    config: Record<string, unknown>;
  };
}

interface PreviewArticle {
  title: string;
  summary: string | null;
  url: string | null;
  publishedAt: string;
  sourceName: string;
}

export default function SourceForm({ onSave, onCancel, initialData }: SourceFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [providerType, setProviderType] = useState<'rss' | 'website'>(initialData?.providerType || 'rss');
  const [rssUrl, setRssUrl] = useState((initialData?.config?.url as string) || '');
  const [websiteUrl, setWebsiteUrl] = useState((initialData?.config?.url as string) || '');
  const [selectors, setSelectors] = useState<{
    articleList: string;
    title: string;
    summary?: string;
    date?: string;
    link?: string;
    image?: string;
  }>(
    (initialData?.config?.selectors as { articleList: string; title: string }) || {
      articleList: '',
      title: '',
    }
  );
  const [baseUrl, setBaseUrl] = useState((initialData?.config?.baseUrl as string) || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewArticles, setPreviewArticles] = useState<PreviewArticle[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildConfig = () => {
    if (providerType === 'rss') {
      return { url: rssUrl };
    }
    return {
      url: websiteUrl,
      selectors,
      ...(baseUrl ? { baseUrl } : {}),
    };
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewArticles([]);

    try {
      const res = await fetch('/api/news/sources/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerType, config: buildConfig() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.details || data.error || 'Unbekannter Fehler');
        return;
      }

      setPreviewArticles(data.articles || []);
      setPreviewTotal(data.totalFound || 0);
    } catch {
      setPreviewError('Netzwerkfehler beim Laden der Vorschau');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    if (providerType === 'rss' && !rssUrl.trim()) {
      setError('Feed-URL ist erforderlich');
      return;
    }

    if (providerType === 'website') {
      if (!websiteUrl.trim()) {
        setError('Seiten-URL ist erforderlich');
        return;
      }
      if (!selectors.articleList || !selectors.title) {
        setError('Artikel-Container und Titel Selektoren sind Pflichtfelder');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), providerType, config: buildConfig() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">
        {initialData ? 'Quelle bearbeiten' : 'Neue Quelle hinzufuegen'}
      </h3>

      {/* Name */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Handelsblatt RSS"
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Type Selection */}
      <div>
        <label className="mb-2 block text-xs text-zinc-400">Typ</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProviderType('rss')}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              providerType === 'rss'
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            RSS/Atom Feed
          </button>
          <button
            type="button"
            onClick={() => setProviderType('website')}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              providerType === 'website'
                ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            Website (CSS-Selektoren)
          </button>
        </div>
      </div>

      {/* RSS Config */}
      {providerType === 'rss' && (
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Feed-URL</label>
          <input
            type="url"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Website Config */}
      {providerType === 'website' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Seiten-URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com/news"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <SelectorConfig selectors={selectors} onChange={setSelectors} />

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Basis-URL (optional, fuer relative Links)</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      <div>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing}
          className="flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          {isPreviewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
          Vorschau testen
        </button>
      </div>

      <SourcePreview
        articles={previewArticles}
        totalFound={previewTotal}
        isLoading={isPreviewing}
        error={previewError}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1 rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          Speichern
        </button>
      </div>
    </div>
  );
}
