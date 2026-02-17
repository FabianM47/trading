'use client';

import type { MarketIndex } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface IndexCardsProps {
  indices: MarketIndex[];
  isLoading?: boolean;
}

export default function IndexCards({ indices, isLoading = false }: IndexCardsProps) {
  if (indices.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {indices.map((index) => {
        const isPositive = index.change >= 0;
        const changeColor = index.price > 0 
          ? (isPositive ? 'text-green-500' : 'text-red-500')
          : 'text-text-secondary';
        
        return (
          <div
            key={index.ticker}
            className="bg-background-card rounded-card p-4 border border-border shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="text-xs text-text-secondary mb-1 font-medium truncate" title={index.name}>
              {index.name}
            </div>
            <div className="text-lg font-bold mb-1 tabular-nums">
              {index.price > 0 ? formatCurrency(index.price) : (
                <span className="text-text-secondary text-sm">Keine Daten</span>
              )}
            </div>
            <div className={`text-sm font-semibold tabular-nums flex items-center ${changeColor}`}>
              {index.price > 0 ? (
                <>
                  <span 
                    className={`mr-1 inline-block ${isLoading ? 'animate-spin' : ''}`}
                    style={{
                      animation: isLoading 
                        ? 'spin 1s linear infinite' 
                        : 'none'
                    }}
                  >
                    {isPositive ? '▲' : '▼'}
                  </span>
                  <span>{formatPercent(Math.abs(index.change))}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
