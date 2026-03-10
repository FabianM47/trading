'use client';

import { Newspaper, Clock } from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import type { MarketBrief as MarketBriefType } from '@/types/news';

interface MarketBriefProps {
  brief: MarketBriefType | null;
  isLoading?: boolean;
}

function renderMarkdown(content: string): string {
  // Einfaches Markdown-Rendering fuer den Brief
  return content
    .replace(/## (.+)/g, '<h3 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">$1</h3>')
    .replace(/### (.+)/g, '<h4 class="text-xs font-semibold text-zinc-300 mt-3 mb-1">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="text-sm text-zinc-300 ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/>')
    .replace(/\n/g, ' ');
}

export default function MarketBrief({ brief, isLoading }: MarketBriefProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 h-6 w-3/4 rounded bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-zinc-800" />
          <div className="h-4 w-5/6 rounded bg-zinc-800" />
          <div className="h-4 w-4/6 rounded bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <Newspaper size={32} className="mb-2 text-zinc-600" />
        <p className="text-sm text-zinc-500">
          Noch keine Tageszusammenfassung verfuegbar.
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          Die naechste Analyse wird automatisch um 07:00 Uhr erstellt.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <Newspaper size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            {brief.titleDe}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <SentimentBadge sentiment={brief.overallSentiment} />
          <span className="text-xs text-zinc-500">
            {brief.articleCount} Artikel
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div
          className="prose-invert text-sm text-zinc-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(brief.contentDe) }}
        />
      </div>

      {/* Key Events */}
      {brief.keyEvents && brief.keyEvents.length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Wichtigste Ereignisse
          </h4>
          <div className="space-y-1.5">
            {brief.keyEvents.map((event, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <SentimentBadge sentiment={event.sentiment} size="sm" />
                <span className="text-sm text-zinc-300">{event.headline}</span>
                {event.tickers.length > 0 && (
                  <span className="text-xs font-mono text-zinc-500">
                    {event.tickers.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-1 text-xs text-zinc-600">
        <Clock size={10} />
        Zuletzt aktualisiert: {new Date(brief.updatedAt).toLocaleString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })}
      </div>
    </div>
  );
}
