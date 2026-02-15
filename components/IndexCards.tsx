'use client';

import type { MarketIndex } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface IndexCardsProps {
  indices: MarketIndex[];
}

export default function IndexCards({ indices }: IndexCardsProps) {
  if (indices.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {indices.map((index) => (
        <div
          key={index.ticker}
          className="bg-background-card rounded-card p-4 border border-border shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className="text-xs text-text-secondary mb-1 font-medium">{index.name}</div>
          <div className="text-xl font-bold mb-1 tabular-nums">
            {index.price > 0 ? formatCurrency(index.price) : (
              <span className="text-text-secondary text-sm">No Data</span>
            )}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${index.price > 0 ? getPnLColorClass(index.change) : 'text-text-secondary'}`}>
            {index.price > 0 ? formatPercent(index.change) : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
