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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {indices.map((index) => (
        <div
          key={index.ticker}
          className="bg-white rounded-lg p-4 border border-gray-200"
        >
          <div className="text-xs text-gray-500 mb-1">{index.name}</div>
          <div className="text-lg font-semibold mb-1">
            {formatCurrency(index.price)}
          </div>
          <div className={`text-sm font-medium ${getPnLColorClass(index.change)}`}>
            {formatPercent(index.change)}
          </div>
        </div>
      ))}
    </div>
  );
}
