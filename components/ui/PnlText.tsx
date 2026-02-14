/**
 * P&L Text Component
 * 
 * Displays profit/loss with automatic color coding
 * Includes sign (+/-) and optional percentage
 */

'use client';

import { getPnLColor } from '@/lib/portfolio/calculations';
import { cn } from '@/lib/utils';

interface PnlTextProps {
  /** P&L value in EUR */
  value: number;

  /** Optional percentage */
  percent?: number;

  /** Show sign for positive values */
  showSign?: boolean;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Use bold font */
  bold?: boolean;

  /** Custom className */
  className?: string;
}

export function PnlText({
  value,
  percent,
  showSign = true,
  size = 'md',
  bold = false,
  className,
}: PnlTextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const formattedValue = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Math.abs(value));

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return (
    <span
      className={cn(
        'font-mono',
        sizeClasses[size],
        bold && 'font-bold',
        getPnLColor(value),
        className
      )}
    >
      {showSign && sign}
      {formattedValue}
      {percent !== undefined && (
        <span className="ml-1 text-xs">
          ({percent > 0 ? '+' : ''}
          {percent.toFixed(2)}%)
        </span>
      )}
    </span>
  );
}

/**
 * Compact P&L Badge
 */
export function PnlBadge({
  value,
  percent,
  className,
}: {
  value: number;
  percent?: number;
  className?: string;
}) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const colorClasses = isPositive
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200'
    : isNegative
      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200'
      : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        colorClasses,
        className
      )}
    >
      {isPositive && '↑'}
      {isNegative && '↓'}
      {new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(value))}
      {percent !== undefined && (
        <span>
          ({percent > 0 ? '+' : ''}
          {percent.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
