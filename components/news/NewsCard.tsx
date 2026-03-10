'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import TickerChip from './TickerChip';
import type { AnalyzedNewsItem } from '@/types/news';

interface NewsCardProps {
  item: AnalyzedNewsItem;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 60) return `vor ${diffMins}m`;
  if (diffHours < 24) return `vor ${diffHours}h`;
  if (diffDays < 7) return `vor ${diffDays}d`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function NewsCard({ item }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { article, analysis } = item;
  const hasDetails = analysis.prognosisDe || (analysis.indicators && analysis.indicators.length > 0);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              {article.title}
              <ExternalLink size={12} className="ml-1 inline-block opacity-50" />
            </a>
          ) : (
            article.title
          )}
        </h3>
        <SentimentBadge sentiment={analysis.sentiment} />
      </div>

      {/* Source + Time */}
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
        {article.sourceName && <span>{article.sourceName}</span>}
        {article.sourceName && article.publishedAt && <span>·</span>}
        {article.publishedAt && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatRelativeTime(article.publishedAt)}
          </span>
        )}
      </div>

      {/* AI Summary */}
      <p className="mb-3 text-sm text-zinc-300 leading-relaxed">
        {analysis.summaryDe}
      </p>

      {/* Affected Tickers */}
      {analysis.affectedTickers && analysis.affectedTickers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {analysis.affectedTickers.map((ticker) => (
            <TickerChip key={ticker.ticker} ticker={ticker} />
          ))}
        </div>
      )}

      {/* Expandable Details */}
      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Weniger' : 'Prognose & Indikatoren'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
              {/* Prognosis */}
              {analysis.prognosisDe && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Prognose
                  </h4>
                  <p className="text-sm text-zinc-300">{analysis.prognosisDe}</p>
                </div>
              )}

              {/* Indicators */}
              {analysis.indicators && analysis.indicators.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Indikatoren
                  </h4>
                  <div className="space-y-1">
                    {analysis.indicators.map((ind, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-mono text-blue-400">{ind.name}</span>
                        <span className="text-zinc-500"> — </span>
                        <span className="text-zinc-300">{ind.interpretation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {analysis.confidence != null && (
                <div className="text-xs text-zinc-500">
                  Confidence: {Math.round(analysis.confidence * 100)}%
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
