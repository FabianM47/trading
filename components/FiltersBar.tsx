'use client';

import type { FilterOptions, TimeRange, SortOption } from '@/types';
import { useState } from 'react';

interface FiltersBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export default function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
  const [showCustomRange, setShowCustomRange] = useState(false);

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    if (timeRange === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
    onFiltersChange({ ...filters, timeRange });
  };

  return (
    <div className="bg-background-card rounded-card p-4 border border-border shadow-card mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Zeitraum */}
        <div className="flex-1">
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
            Zeitraum
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
            className="w-full px-3 py-2 bg-background-elevated border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
          >
            <option value="all">Alle</option>
            <option value="month">Dieser Monat</option>
            <option value="last30">Letzte 30 Tage</option>
            <option value="ytd">YTD</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Range */}
        {showCustomRange && (
          <>
            <div className="flex-1">
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
                Von
              </label>
              <input
                type="date"
                value={filters.customStart || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, customStart: e.target.value })
                }
                className="w-full px-3 py-2 bg-background-elevated border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
                Bis
              </label>
              <input
                type="date"
                value={filters.customEnd || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, customEnd: e.target.value })
                }
                className="w-full px-3 py-2 bg-background-elevated border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
              />
            </div>
          </>
        )}

        {/* Sortierung */}
        <div className="flex-1">
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
            Sortierung
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({ ...filters, sortBy: e.target.value as SortOption })
            }
            className="w-full px-3 py-2 bg-background-elevated border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
          >
            <option value="date">Datum (neueste)</option>
            <option value="pnlEur">P/L (EUR)</option>
            <option value="pnlPct">P/L (%)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Suche */}
        <div className="flex-1">
          <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wide font-medium">
            Suche
          </label>
          <input
            type="text"
            placeholder="Name, Ticker, ISIN..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full px-3 py-2 bg-background-elevated border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
          />
        </div>

        {/* Nur Gewinner */}
        <div className="flex items-end">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlyWinners}
              onChange={(e) =>
                onFiltersChange({ ...filters, onlyWinners: e.target.checked })
              }
              className="w-4 h-4 text-white border-border-light rounded focus:ring-white"
            />
            <span className="text-sm font-medium text-text-primary">
              Nur Gewinner
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
