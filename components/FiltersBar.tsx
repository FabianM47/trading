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
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Zeitraum */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeitraum
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Von
              </label>
              <input
                type="date"
                value={filters.customStart || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, customStart: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bis
              </label>
              <input
                type="date"
                value={filters.customEnd || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, customEnd: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </>
        )}

        {/* Sortierung */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sortierung
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({ ...filters, sortBy: e.target.value as SortOption })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="date">Datum (neueste)</option>
            <option value="pnlEur">P/L (EUR)</option>
            <option value="pnlPct">P/L (%)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Suche */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Suche
          </label>
          <input
            type="text"
            placeholder="Name, Ticker, ISIN..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <span className="text-sm font-medium text-gray-700">
              Nur Gewinner
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
