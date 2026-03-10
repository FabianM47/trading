'use client';

import { Rss, Globe, Database } from 'lucide-react';
import type { NewsProviderType } from '@/types/news';

interface SourceTypeBadgeProps {
  type: NewsProviderType;
}

const config: Record<NewsProviderType, { label: string; icon: typeof Rss; color: string }> = {
  finnhub: { label: 'API', icon: Database, color: 'bg-blue-500/10 text-blue-400' },
  alphavantage: { label: 'API', icon: Database, color: 'bg-blue-500/10 text-blue-400' },
  newsapi: { label: 'API', icon: Database, color: 'bg-blue-500/10 text-blue-400' },
  rss: { label: 'RSS', icon: Rss, color: 'bg-orange-500/10 text-orange-400' },
  website: { label: 'Web', icon: Globe, color: 'bg-purple-500/10 text-purple-400' },
};

export default function SourceTypeBadge({ type }: SourceTypeBadgeProps) {
  const { label, icon: Icon, color } = config[type] || config.rss;

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
