import { CellValue } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnMapping {
  name: string | null
  isin: string | null
  ticker: string | null
  buyPrice: string | null
  quantity: string | null
  buyDate: string | null
  currency: string | null
}

export interface MappedTrade {
  name: string
  isin: string
  ticker: string
  buyPrice: number
  quantity: number
  buyDate: string      // ISO string
  currency: 'EUR' | 'USD'
  isValid: boolean
  errors: string[]     // validation errors
}

// ─── Pattern matching for column auto-detection ─────────────────────────────

const FIELD_PATTERNS: Record<keyof ColumnMapping, string[]> = {
  name: ['name', 'bezeichnung', 'titel', 'wertpapier', 'stock', 'aktie', 'position'],
  isin: ['isin', 'wkn', 'kennnummer', 'identifier'],
  ticker: ['ticker', 'symbol', 'kuerzel', 'kürzel'],
  buyPrice: ['kaufpreis', 'buy price', 'preis', 'price', 'kurs', 'einstandskurs', 'cost'],
  quantity: ['menge', 'quantity', 'anzahl', 'stueck', 'stück', 'amount', 'shares'],
  buyDate: ['datum', 'date', 'kaufdatum', 'buy date'],
  currency: ['waehrung', 'währung', 'currency', 'curr'],
}

// ─── Auto-detection ─────────────────────────────────────────────────────────

/**
 * Matches Excel column headers to Trade fields using common German/English patterns.
 * Returns a mapping from trade field -> matched Excel header name.
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    isin: null,
    ticker: null,
    buyPrice: null,
    quantity: null,
    buyDate: null,
    currency: null,
  }

  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

  for (const field of Object.keys(FIELD_PATTERNS) as (keyof ColumnMapping)[]) {
    const patterns = FIELD_PATTERNS[field]

    for (const pattern of patterns) {
      const index = normalizedHeaders.findIndex(
        (h) => h === pattern || h.includes(pattern)
      )
      if (index !== -1) {
        mapping[field] = headers[index] // preserve original casing
        break
      }
    }
  }

  return mapping
}

// ─── Parsing helpers ────────────────────────────────────────────────────────

/**
 * Parses a number value, handling German format (1.234,56 -> 1234.56).
 */
function parseNumber(value: CellValue): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  // German format: 1.234,56 -> remove dots, replace comma with dot
  if (trimmed.includes(',')) {
    const cleaned = trimmed.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

/**
 * Parses a date value into an ISO date string (YYYY-MM-DD).
 * Handles: ISO strings, German dates (DD.MM.YYYY), Excel serial date numbers.
 */
function parseDate(value: CellValue): string | null {
  if (value == null) return null

  // Excel serial date number
  if (typeof value === 'number') {
    // Excel epoch is 1899-12-30, serial number = days since then
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 86400000)
    return date.toISOString().split('T')[0]
  }

  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  // ISO format: YYYY-MM-DD or full ISO string
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed)
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  }

  // German format: DD.MM.YYYY
  const germanMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  }

  return null
}

function getString(value: CellValue): string {
  if (value == null) return ''
  return String(value).trim()
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Row mapping ────────────────────────────────────────────────────────────

/**
 * Maps a single row from parsed Excel data to a MappedTrade using the column mapping.
 */
export function mapRowToTrade(
  row: Record<string, CellValue>,
  mapping: ColumnMapping
): MappedTrade {
  const errors: string[] = []

  // Extract values using mapping
  const name = mapping.name ? getString(row[mapping.name]) : ''
  const isin = mapping.isin ? getString(row[mapping.isin]) : ''
  const ticker = mapping.ticker ? getString(row[mapping.ticker]) : ''
  const rawPrice = mapping.buyPrice ? row[mapping.buyPrice] : null
  const rawQuantity = mapping.quantity ? row[mapping.quantity] : null
  const rawDate = mapping.buyDate ? row[mapping.buyDate] : null
  const rawCurrency = mapping.currency ? getString(row[mapping.currency]).toUpperCase() : ''

  // Parse numbers
  const buyPrice = parseNumber(rawPrice)
  const quantity = parseNumber(rawQuantity)

  // Parse date
  const buyDate = parseDate(rawDate) ?? getTodayISO()

  // Parse currency
  const currency: 'EUR' | 'USD' =
    rawCurrency === 'USD' ? 'USD' : 'EUR'

  // Validate
  if (!name) {
    errors.push('Name ist erforderlich')
  }
  if (buyPrice == null || buyPrice <= 0) {
    errors.push('Kaufpreis muss größer als 0 sein')
  }
  if (quantity == null || quantity <= 0) {
    errors.push('Menge muss größer als 0 sein')
  }

  return {
    name,
    isin,
    ticker,
    buyPrice: buyPrice ?? 0,
    quantity: quantity ?? 0,
    buyDate,
    currency,
    isValid: errors.length === 0,
    errors,
  }
}

// ─── Bulk mapping ───────────────────────────────────────────────────────────

/**
 * Maps all rows from parsed Excel data to MappedTrades.
 */
export function mapAllRows(
  rows: Record<string, CellValue>[],
  mapping: ColumnMapping
): MappedTrade[] {
  return rows.map((row) => mapRowToTrade(row, mapping))
}
