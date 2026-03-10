'use client';

import { Loader2 } from 'lucide-react';
import NewsCard from './NewsCard';
import type { AnalyzedNewsItem } from '@/types/news';

interface NewsFeedProps {
  items: AnalyzedNewsItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export default function NewsFeed({
  items,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: NewsFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-2 h-5 w-3/4 rounded bg-zinc-800" />
            <div className="mb-3 h-3 w-1/4 rounded bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-5/6 rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm text-zinc-500">Noch keine analysierten News vorhanden.</p>
        <p className="text-xs text-zinc-600 mt-1">
          Nutze den Refresh-Button oder warte auf die naechste automatische Analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NewsCard key={item.article.id} item={item} />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-3 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors disabled:opacity-50"
        >
          {isLoadingMore ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Laden...
            </span>
          ) : (
            'Mehr laden'
          )}
        </button>
      )}
    </div>
  );
}
