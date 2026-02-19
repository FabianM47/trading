'use client';

type TimeRange = '1W' | '1M' | 'YTD' | '1J' | '3J' | '5J' | 'MAX';

interface TimeRangeFilterProps {
  selectedRange: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: TimeRange[] = ['1W', '1M', 'YTD', '1J', '3J', '5J', 'MAX'];

export default function TimeRangeFilter({ selectedRange, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex gap-1 bg-background-card border border-border rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
            selectedRange === range
              ? 'bg-blue-500 text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
