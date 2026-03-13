'use client';

import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Upload,
  X,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { Trade } from '@/types';
import type { SheetData, WorkbookData } from '@/types';
import { parseWorkbook } from '@/lib/excelParser';
import {
  autoMapColumns,
  mapAllRows,
  type ColumnMapping,
  type MappedTrade,
} from '@/lib/tradeMapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrades: (trades: Trade[]) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing';

const TRADE_FIELDS: { key: keyof ColumnMapping; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'isin', label: 'ISIN' },
  { key: 'ticker', label: 'Ticker' },
  { key: 'buyPrice', label: 'Kaufpreis' },
  { key: 'quantity', label: 'Menge' },
  { key: 'buyDate', label: 'Kaufdatum' },
  { key: 'currency', label: 'Wahrung' },
];

const STEP_LABELS: Record<Step, string> = {
  upload: 'Datei hochladen',
  mapping: 'Spalten zuordnen',
  preview: 'Vorschau',
  importing: 'Importieren',
};

const STEPS: Step[] = ['upload', 'mapping', 'preview', 'importing'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportTrades,
}: ExcelImportModalProps) {
  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Step 1: Upload
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    isin: null,
    ticker: null,
    buyPrice: null,
    quantity: null,
    buyDate: null,
    currency: null,
  });

  // Step 3: Preview
  const [mappedTrades, setMappedTrades] = useState<MappedTrade[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Step 4: Importing
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const currentSheet: SheetData | null =
    workbook && workbook.sheets.length > 0
      ? workbook.sheets[selectedSheetIdx]
      : null;

  const stepIndex = STEPS.indexOf(step);

  const reset = useCallback(() => {
    setStep('upload');
    setWorkbook(null);
    setSelectedSheetIdx(0);
    setIsDragging(false);
    setUploadError(null);
    setMapping({
      name: null,
      isin: null,
      ticker: null,
      buyPrice: null,
      quantity: null,
      buyDate: null,
      currency: null,
    });
    setMappedTrades([]);
    setSelectedRows(new Set());
    setImportDone(false);
    setImportedCount(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ─── Step 1: File handling ──────────────────────────────────────────────

  const processFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      if (!file.name.endsWith('.xlsx')) {
        setUploadError('Nur .xlsx-Dateien werden unterstutzt.');
        return;
      }

      try {
        const wb = await parseWorkbook(file);

        if (wb.sheets.length === 0 || wb.sheets.every((s) => s.rows.length === 0)) {
          setUploadError('Die Datei enthalt keine Daten.');
          return;
        }

        setWorkbook(wb);

        // Find first sheet with data
        const firstWithData = wb.sheets.findIndex((s) => s.rows.length > 0);
        const idx = firstWithData >= 0 ? firstWithData : 0;
        setSelectedSheetIdx(idx);

        // Auto-map and advance
        const sheet = wb.sheets[idx];
        const autoMapping = autoMapColumns(sheet.headers);
        setMapping(autoMapping);
        setStep('mapping');
      } catch {
        setUploadError('Fehler beim Lesen der Datei. Ist sie eine gultige Excel-Datei?');
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ─── Step 2: Mapping ───────────────────────────────────────────────────

  const handleMappingChange = useCallback(
    (field: keyof ColumnMapping, value: string) => {
      setMapping((prev) => ({
        ...prev,
        [field]: value === '' ? null : value,
      }));
    },
    []
  );

  const handleSheetChange = useCallback(
    (idx: number) => {
      if (!workbook) return;
      setSelectedSheetIdx(idx);
      const sheet = workbook.sheets[idx];
      setMapping(autoMapColumns(sheet.headers));
    },
    [workbook]
  );

  const advanceToPreview = useCallback(() => {
    if (!currentSheet) return;
    const trades = mapAllRows(currentSheet.rows, mapping);
    setMappedTrades(trades);

    // Select all valid rows by default
    const validIndices = new Set<number>();
    trades.forEach((t, i) => {
      if (t.isValid) validIndices.add(i);
    });
    setSelectedRows(validIndices);
    setStep('preview');
  }, [currentSheet, mapping]);

  // ─── Step 3: Preview ───────────────────────────────────────────────────

  const toggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedRows.size === mappedTrades.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(mappedTrades.map((_, i) => i)));
    }
  }, [selectedRows.size, mappedTrades]);

  const selectedValidCount = Array.from(selectedRows).filter(
    (i) => mappedTrades[i]?.isValid
  ).length;

  // ─── Step 4: Import ────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    setStep('importing');

    const trades: Trade[] = Array.from(selectedRows)
      .filter((i) => mappedTrades[i]?.isValid)
      .map((i) => {
        const mt = mappedTrades[i];
        return {
          id: uuidv4(),
          name: mt.name,
          isin: mt.isin,
          ticker: mt.ticker || undefined,
          buyPrice: mt.buyPrice,
          quantity: mt.quantity,
          investedEur: mt.buyPrice * mt.quantity,
          buyDate: mt.buyDate,
          currency: mt.currency,
        } as Trade;
      });

    onImportTrades(trades);
    setImportedCount(trades.length);
    setImportDone(true);
  }, [selectedRows, mappedTrades, onImportTrades]);

  // ─── Render guards ─────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ─── Step Indicator ────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              i < stepIndex
                ? 'bg-profit text-white'
                : i === stepIndex
                  ? 'bg-accent text-white'
                  : 'bg-background-elevated text-text-secondary border border-border'
            }`}
          >
            {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
          </span>
          <span className={i === stepIndex ? 'text-text-primary font-medium' : ''}>
            {STEP_LABELS[s]}
          </span>
          {i < STEPS.length - 1 && (
            <ChevronRight className="w-4 h-4 text-text-secondary/50" />
          )}
        </span>
      ))}
    </div>
  );

  // ─── Step 1: Upload ────────────────────────────────────────────────────

  const renderUploadStep = () => (
    <div className="p-6 flex flex-col items-center gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-lg p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/50 hover:bg-background-elevated'
        }`}
      >
        <Upload className="w-10 h-10 text-text-secondary" />
        <p className="text-text-primary font-medium">
          Excel-Datei hierher ziehen oder klicken
        </p>
        <p className="text-text-secondary text-sm">Nur .xlsx-Dateien</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadError && (
        <div className="w-full p-3 rounded-md bg-loss/10 border border-loss/30 text-loss text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );

  // ─── Step 2: Mapping ───────────────────────────────────────────────────

  const renderMappingStep = () => {
    if (!currentSheet) return null;

    return (
      <div className="p-6 space-y-4">
        {/* Sheet selector */}
        {workbook && workbook.sheets.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary font-medium">Blatt:</label>
            <select
              value={selectedSheetIdx}
              onChange={(e) => handleSheetChange(Number(e.target.value))}
              className="bg-background-elevated border border-border rounded-md px-3 py-1.5 text-sm text-text-primary"
            >
              {workbook.sheets.map((s, i) => (
                <option key={i} value={i}>
                  {s.sheetName} ({s.rows.length} Zeilen)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <FileSpreadsheet className="w-4 h-4" />
          <span>
            {currentSheet.headers.length} Spalten, {currentSheet.rows.length} Zeilen
            erkannt
          </span>
        </div>

        {/* Mapping fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRADE_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">{label}</label>
              <select
                value={mapping[key] ?? ''}
                onChange={(e) => handleMappingChange(key, e.target.value)}
                className="bg-background-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary"
              >
                <option value="">-- Nicht zuordnen --</option>
                {currentSheet.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Zuruck
          </button>
          <button
            onClick={advanceToPreview}
            className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-md hover:bg-accent/90 transition-colors flex items-center gap-1"
          >
            Weiter <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ─── Step 3: Preview ───────────────────────────────────────────────────

  const renderPreviewStep = () => {
    const totalCount = mappedTrades.length;
    const validCount = mappedTrades.filter((t) => t.isValid).length;

    return (
      <div className="p-6 space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {selectedValidCount} von {totalCount} Trades bereit zum Import
            {validCount < totalCount && (
              <span className="text-yellow-500 ml-2">
                ({totalCount - validCount} ungultig)
              </span>
            )}
          </span>
          <button
            onClick={toggleAll}
            className="text-xs text-accent hover:underline"
          >
            {selectedRows.size === totalCount ? 'Alle abwahlen' : 'Alle auswahlen'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-elevated text-text-secondary text-left">
                <th className="p-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === totalCount && totalCount > 0}
                    onChange={toggleAll}
                    className="accent-accent"
                  />
                </th>
                <th className="p-2 w-8"></th>
                <th className="p-2">Name</th>
                <th className="p-2">ISIN</th>
                <th className="p-2 text-right">Kaufpreis</th>
                <th className="p-2 text-right">Menge</th>
                <th className="p-2">Datum</th>
                <th className="p-2">Wahrung</th>
              </tr>
            </thead>
            <tbody>
              {mappedTrades.map((trade, i) => (
                <tr
                  key={i}
                  className={`border-t border-border hover:bg-background-elevated/50 transition-colors ${
                    !trade.isValid ? 'opacity-70' : ''
                  }`}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(i)}
                      onChange={() => toggleRow(i)}
                      className="accent-accent"
                    />
                  </td>
                  <td className="p-2">
                    {trade.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-profit" />
                    ) : (
                      <span title={trade.errors.join(', ')}>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-text-primary font-medium truncate max-w-[200px]">
                    {trade.name || '-'}
                  </td>
                  <td className="p-2 text-text-secondary font-mono text-xs">
                    {trade.isin || '-'}
                  </td>
                  <td className="p-2 text-right text-text-primary tabular-nums">
                    {trade.buyPrice > 0 ? trade.buyPrice.toFixed(2) : '-'}
                  </td>
                  <td className="p-2 text-right text-text-primary tabular-nums">
                    {trade.quantity > 0 ? trade.quantity : '-'}
                  </td>
                  <td className="p-2 text-text-secondary">{trade.buyDate}</td>
                  <td className="p-2 text-text-secondary">{trade.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => setStep('mapping')}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Zuruck
          </button>
          <button
            onClick={handleImport}
            disabled={selectedValidCount === 0}
            className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-md hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {selectedValidCount} Trades importieren
          </button>
        </div>
      </div>
    );
  };

  // ─── Step 4: Importing ─────────────────────────────────────────────────

  const renderImportingStep = () => (
    <div className="p-6 flex flex-col items-center gap-4 py-12">
      {importDone ? (
        <>
          <CheckCircle2 className="w-12 h-12 text-profit" />
          <p className="text-text-primary text-lg font-semibold">
            {importedCount} {importedCount === 1 ? 'Trade' : 'Trades'} erfolgreich
            importiert
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
          >
            Fertig
          </button>
        </>
      ) : (
        <>
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-text-secondary">Trades werden importiert...</p>
        </>
      )}
    </div>
  );

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-background-card rounded-card w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background-elevated flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-text-primary">
              Excel-Import
            </h2>
            {renderStepIndicator()}
          </div>
          <button
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
      </div>
    </div>
  );
}
