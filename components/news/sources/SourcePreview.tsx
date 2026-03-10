'use client';

import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PreviewArticle {
  title: string;
  summary: string | null;
  url: string | null;
  publishedAt: string;
  sourceName: string;
}

interface SourcePreviewProps {
  articles: PreviewArticle[];
  totalFound: number;
  isLoading: boolean;
  error: string | null;
}

export default function SourcePreview({ articles, totalFound, isLoading, error }: SourcePreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
        <span className="ml-2 text-sm text-zinc-400">Vorschau wird geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
        <div>
          <p className="text-sm font-medium text-red-400">Vorschau fehlgeschlagen</p>
          <p className="text-xs text-red-300/70 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-sm font-medium text-zinc-300">Vorschau</span>
        </div>
        <span className="text-xs text-zinc-500">{totalFound} Artikel gefunden</span>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {articles.map((article, idx) => (
          <div key={idx} className="px-4 py-3">
            <h4 className="text-sm font-medium text-zinc-200 leading-snug">
              {article.url ? (
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                  {article.title}
                </a>
              ) : (
                article.title
              )}
            </h4>
            {article.summary && (
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{article.summary}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
              <span>{article.sourceName}</span>
              <span>·</span>
              <span>{new Date(article.publishedAt).toLocaleString('de-DE')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
