# Trade Import & Export Design

## Overview

Add Excel import functionality to the trade creation flow and export functionality (CSV, JSON, Excel) to the trade listing and position detail views.

## Import

### Entry Point

A secondary button "Excel importieren" in `TradeFormModal.tsx` that opens a dedicated `ExcelImportModal.tsx`.

### Flow

1. **File Upload** - Drag & drop zone or file picker, accepts `.xlsx` files only
2. **Sheet Selection** - Dropdown if workbook contains multiple sheets, auto-select if single sheet
3. **Column Mapping** - Auto-detect Excel columns to Trade fields via `lib/tradeMapper.ts`. User can override mappings via dropdowns. Target fields: Name, ISIN/Ticker, Buy Price, Quantity, Buy Date, Currency
4. **Preview Table** - All parsed rows shown with validation status icons. Valid rows get checkmark, invalid rows get warning with tooltip explaining the issue
5. **Row Editing** - Click a row to open `TradeFormModal` with pre-filled fields from that row. Edited trade is saved individually
6. **Bulk Import** - "Alle importieren" button saves all valid (checked) trades via `addTrade()` per row. Progress indicator during bulk save

### New Files

- `components/ExcelImportModal.tsx` - Import wizard UI (file upload, mapping, preview, bulk save)
- `lib/tradeMapper.ts` - Column-to-field mapping logic with auto-detection heuristics

### Mapping Heuristics (`tradeMapper.ts`)

Auto-match Excel headers to Trade fields by checking common German/English column names:

| Trade Field | Match Patterns |
|-------------|---------------|
| name | name, bezeichnung, titel, wertpapier, stock |
| isin | isin, wkn, kennnummer |
| ticker | ticker, symbol, kuerzel |
| buyPrice | kaufpreis, buy price, preis, price, kurs, einstandskurs |
| quantity | menge, quantity, anzahl, stueck, amount |
| buyDate | datum, date, kaufdatum, buy date |
| currency | waehrung, currency, curr |

Returns `MappingResult` with confidence scores. User sees auto-mapped fields with option to change.

### Validation Rules

Each row is validated before import:
- `name` required (non-empty string)
- `buyPrice` required (positive number)
- `quantity` required (positive number)
- `buyDate` optional (defaults to today, must be valid date if provided)
- `isin` optional (validated format if provided)
- `currency` optional (defaults to EUR, must be EUR or USD)

## Export

### Entry Points

1. **TradeTable header** - `Download` icon (lucide) in the table header area. Exports all trades across all positions
2. **PositionDetailModal header** - `Download` icon next to the close button. Exports only trades of the currently viewed position

### Interaction

Click on icon opens a small dropdown (`ExportDropdown.tsx`) with three options:
- CSV
- JSON
- Excel (.xlsx)

Dropdown closes on selection or outside click.

### New Files

- `components/ExportDropdown.tsx` - Reusable dropdown with format selection, receives `trades: Trade[]` and `filename: string`
- `lib/excelExporter.ts` - Excel export using `xlsx` library

### Export Data Format

All formats export the same fields per trade:

| Column | Source |
|--------|--------|
| Name | trade.name |
| ISIN | trade.isin |
| Ticker | trade.ticker |
| Kaufpreis | trade.buyPrice |
| Menge | trade.quantity |
| Investiert (EUR) | trade.investedEur |
| Kaufdatum | trade.buyDate |
| Waehrung | trade.currency |
| Status | open/closed |
| Verkaufspreis | trade.sellPrice (if closed) |
| Verkaufsdatum | trade.closedAt (if closed) |
| Realisierter P/L | trade.realizedPnL (if closed) |
| Demo | trade.isDemo |

### Excel Export (`excelExporter.ts`)

Uses `xlsx` library (already installed) to create formatted workbook:
- Single sheet named "Trades"
- Auto-width columns
- Header row bold styling
- Number formatting for prices and quantities

## Data Flow

```
Import:  .xlsx File
         → parseWorkbook() (existing lib/excelParser.ts)
         → tradeMapper.mapColumns() (new)
         → Preview UI with validation
         → addTrade() per valid row (existing lib/apiStorage.ts)

Export:  trades[] (from state)
         → ExportDropdown format selection
         → exportAsCsv() / exportAsJson() (existing lib/exportData.ts)
         → exportAsExcel() (new lib/excelExporter.ts)
         → Browser download trigger
```

## Affected Existing Files

- `components/TradeFormModal.tsx` - Add "Excel importieren" button
- `components/TradeTable.tsx` - Add export icon in header
- `components/PositionDetailModal.tsx` - Add export icon in header
- `app/page.tsx` - Wire up ExcelImportModal state and pass trades to export components

## UI Patterns

- Icons: lucide-react (`Upload`, `Download`, `FileSpreadsheet`, `Check`, `AlertTriangle`)
- Modal styling: Matches existing modal pattern (dark overlay, rounded card, X close button)
- Buttons: Follow existing TailwindCSS patterns from TradeFormModal
- Dropdown: Absolute positioned, shadow-xl, rounded-lg, white background
