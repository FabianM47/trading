'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import type { Trade } from '@/types';
import { exportAsCsv, exportAsJson } from '@/lib/exportData';
import { exportAsExcel } from '@/lib/excelExporter';

interface ExportDropdownProps {
  trades: Trade[];
  filename: string;
}

const HEADERS = [
  'Name',
  'ISIN',
  'Ticker',
  'Kaufpreis',
  'Menge',
  'Investiert (EUR)',
  'Kaufdatum',
  'Währung',
  'Status',
  'Verkaufspreis',
  'Verkaufsdatum',
  'Realisierter P/L',
  'Demo',
] as const;

function tradesToExportRows(trades: Trade[]): {
  rows: Record<string, string | number | boolean | null>[];
  headers: string[];
} {
  const headers = [...HEADERS];

  const rows = trades.map((t) => ({
    Name: t.name,
    ISIN: t.isin,
    Ticker: t.ticker ?? null,
    Kaufpreis: t.buyPrice,
    Menge: t.quantity,
    'Investiert (EUR)': t.investedEur,
    Kaufdatum: t.buyDate,
    Währung: t.currency ?? 'EUR',
    Status: t.isClosed ? 'Geschlossen' : 'Offen',
    Verkaufspreis: t.sellPrice ?? null,
    Verkaufsdatum: t.closedAt ?? null,
    'Realisierter P/L': t.realizedPnL ?? null,
    Demo: t.isDemo ? 'Ja' : 'Nein',
  }));

  return { rows, headers };
}

const FORMAT_OPTIONS = [
  {
    key: 'csv' as const,
    label: 'CSV',
    description: 'Komma-getrennte Werte',
    Icon: FileText,
  },
  {
    key: 'json' as const,
    label: 'JSON',
    description: 'Strukturierte Daten',
    Icon: FileJson,
  },
  {
    key: 'excel' as const,
    label: 'Excel',
    description: 'Excel-Arbeitsmappe',
    Icon: FileSpreadsheet,
  },
];

export default function ExportDropdown({ trades, filename }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleExport(format: 'csv' | 'json' | 'excel') {
    if (format === 'excel') {
      exportAsExcel(trades, filename);
    } else {
      const { rows, headers } = tradesToExportRows(trades);
      if (format === 'csv') {
        exportAsCsv(rows, headers, filename);
      } else {
        exportAsJson(rows, filename);
      }
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label="Exportieren"
      >
        <Download className="w-5 h-5 text-text-secondary" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-background-elevated border border-border rounded-lg shadow-xl z-20">
          {FORMAT_OPTIONS.map(({ key, label, description, Icon }) => (
            <button
              key={key}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-background-card transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
              onClick={() => handleExport(key)}
            >
              <Icon className="w-5 h-5 text-text-secondary shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">{label}</div>
                <div className="text-xs text-text-secondary">{description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
