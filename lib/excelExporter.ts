import * as XLSX from 'xlsx';
import type { Trade } from '@/types';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsExcel(trades: Trade[], filename: string): void {
  const headers = [
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
  ];

  const rows = trades.map((t) => ({
    'Name': t.name,
    'ISIN': t.isin,
    'Ticker': t.ticker || '',
    'Kaufpreis': t.buyPrice,
    'Menge': t.quantity,
    'Investiert (EUR)': t.investedEur,
    'Kaufdatum': formatDate(t.buyDate),
    'Währung': t.currency || 'EUR',
    'Status': t.isClosed ? 'Geschlossen' : 'Offen',
    'Verkaufspreis': t.sellPrice ?? '',
    'Verkaufsdatum': t.closedAt ? formatDate(t.closedAt) : '',
    'Realisierter P/L': t.realizedPnL ?? '',
    'Demo': t.isDemo ? 'Ja' : 'Nein',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  ws['!cols'] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h as keyof typeof r] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 30) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, filename.replace(/\.\w+$/, '') + '.xlsx');
}
