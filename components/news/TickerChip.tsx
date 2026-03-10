'use client';

import type { AffectedTicker } from '@/types/news';

interface TickerChipProps {
  ticker: AffectedTicker;
}

const sentimentColors = {
  bullish: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bearish: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function TickerChip({ ticker }: TickerChipProps) {
  const colorClass = sentimentColors[ticker.sentiment] || sentimentColors.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-mono ${colorClass}`}
      title={`${ticker.name} - Relevanz: ${Math.round(ticker.relevance * 100)}%`}
    >
      {ticker.ticker}
    </span>
  );
}
