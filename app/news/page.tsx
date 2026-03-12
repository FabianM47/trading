'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MarketBrief from '@/components/news/MarketBrief';
import NewsFeed from '@/components/news/NewsFeed';
import NewsDisclaimer from '@/components/news/NewsDisclaimer';
import { useMarketBrief, useNewsFeed } from '@/hooks/useNewsFeed';
import RoleGate from '@/components/RoleGate';

const SENTIMENT_FILTERS: Array<{ value: string | undefined; label: string }> = [
  { value: undefined, label: 'Alle' },
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
];

export default function NewsPage() {
  const [sentimentFilter, setSentimentFilter] = useState<string | undefined>(undefined);

  const { brief, isLoading: briefLoading } = useMarketBrief();
  const {
    items,
    isLoading: feedLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useNewsFeed(sentimentFilter);

  return (
    <RoleGate role="trading">
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft size={16} />
            Zurueck
          </Link>
          <h1 className="text-lg font-bold text-zinc-100">News & Analyse</h1>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mb-4">
        <NewsDisclaimer />
      </div>

      {/* Market Brief */}
      <div className="mb-6">
        <MarketBrief brief={brief} isLoading={briefLoading} />
      </div>

      {/* Feed Header + Filter */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">News Feed</h2>
        <div className="flex items-center gap-1">
          {SENTIMENT_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setSentimentFilter(filter.value)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sentimentFilter === filter.value
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      <NewsFeed
        items={items}
        isLoading={feedLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        isLoadingMore={isLoadingMore}
      />
    </div>
    </RoleGate>
  );
}
