'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NewsSentiment, OverallSentiment } from '@/types/news';

interface SentimentBadgeProps {
  sentiment: NewsSentiment | OverallSentiment;
  size?: 'sm' | 'md';
}

const config = {
  bullish: {
    label: 'Bullish',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    Icon: TrendingUp,
  },
  bearish: {
    label: 'Bearish',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    Icon: TrendingDown,
  },
  neutral: {
    label: 'Neutral',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-400',
    Icon: Minus,
  },
  mixed: {
    label: 'Mixed',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    Icon: Minus,
  },
};

export default function SentimentBadge({ sentiment, size = 'sm' }: SentimentBadgeProps) {
  const { label, bgClass, textClass, Icon } = config[sentiment] || config.neutral;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${bgClass} ${textClass} ${sizeClass}`}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
