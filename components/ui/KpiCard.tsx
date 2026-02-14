/**
 * KPI Card Component
 * 
 * Displays key performance indicators with optional comparison
 * Used in dashboard for portfolio metrics
 */

'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  /** Card title */
  title: string;

  /** Main value to display */
  value: string | number;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Optional icon */
  icon?: LucideIcon;

  /** Optional change value (e.g., "+5.2%") */
  change?: string;

  /** Change trend: positive, negative, or neutral */
  trend?: 'positive' | 'negative' | 'neutral';

  /** Custom className */
  className?: string;

  /** Loading state */
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  trend = 'neutral',
  className,
  isLoading = false,
}: KpiCardProps) {
  const trendColors = {
    positive: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    negative: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    neutral: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20',
  };

  if (isLoading) {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6',
        className
      )}>
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 transition-shadow hover:shadow-md',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {value}
          </p>

          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {subtitle}
            </p>
          )}

          {change && (
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2',
              trendColors[trend]
            )}>
              {trend === 'positive' && '↑'}
              {trend === 'negative' && '↓'}
              {change}
            </div>
          )}
        </div>

        {Icon && (
          <div className="ml-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900">
              <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact KPI variant for smaller spaces
 */
export function KpiCardCompact({
  title,
  value,
  change,
  trend = 'neutral',
  className,
}: Omit<KpiCardProps, 'subtitle' | 'icon' | 'isLoading'>) {
  const trendColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4',
      className
    )}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </p>
      <div className="flex items-baseline justify-between">
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </p>
        {change && (
          <p className={cn('text-sm font-medium', trendColors[trend])}>
            {trend === 'positive' && '↑ '}
            {trend === 'negative' && '↓ '}
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
