/**
 * Price Chip Component
 * 
 * Displays price with optional change indicators
 * Color-coded for positive/negative changes
 */

'use client';

import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface PriceChipProps {
  /** Current price */
  price: number;

  /** Currency code */
  currency?: string;

  /** Price change (absolute) */
  change?: number;

  /** Price change (percentage) */
  changePercent?: number;

  /** Show trend icon */
  showIcon?: boolean;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Custom className */
  className?: string;
}

export function PriceChip({
  price,
  currency = 'EUR',
  change,
  changePercent,
  showIcon = true,
  size = 'md',
  className,
}: PriceChipProps) {
  const isPositive = change !== undefined ? change > 0 : false;
  const isNegative = change !== undefined ? change < 0 : false;

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  const colorClasses = isPositive
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    : isNegative
      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border font-medium',
        sizeClasses[size],
        colorClasses,
        className
      )}
    >
      {showIcon && (isPositive || isNegative) && (
        <span>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </span>
      )}

      <span className="font-bold">
        {new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency,
        }).format(price)}
      </span>

      {changePercent !== undefined && (
        <span className="text-xs">
          ({changePercent > 0 ? '+' : ''}
          {changePercent.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}

/**
 * Simple price display without chip styling
 */
export function PriceText({
  price,
  currency = 'EUR',
  className,
}: {
  price: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={cn('font-mono', className)}>
      {new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency,
      }).format(price)}
    </span>
  );
}
