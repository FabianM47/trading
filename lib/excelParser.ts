import * as XLSX from "xlsx"
import type { CellValue, SheetData, WorkbookData } from "@/types"

const KNOWN_STOP_LABELS = new Set([
  "profit/loss",
  "total",
  "subtotal",
  "sum",
])

const METADATA_FIRST_CELLS = new Set([
  "account",
  "account number",
  "date from (utc)",
  "date to (utc)",
])

function normalizeHeader(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function isBlankRow(values: unknown[]): boolean {
  return values.every((v) => v == null || String(v).trim() === "")
}

function looksLikeHeader(rowValues: unknown[]): boolean {
  const nonEmpty = rowValues
    .map((v) => normalizeHeader(v))
    .filter((v) => v !== "")

  if (nonEmpty.length < 2) return false

  let alphaLike = 0
  for (const value of nonEmpty) {
    if (/[a-zA-Z]/.test(value)) alphaLike++
  }

  return alphaLike >= Math.max(2, Math.floor(nonEmpty.length / 2))
}

function excelValueToJson(value: unknown): CellValue {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "number") return value
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.trim() === "" ? null : value
  return String(value)
}

function findHeaderRow(rows: unknown[][]): number | null {
  for (let i = 0; i < rows.length; i++) {
    const rowValues = rows[i]
    if (looksLikeHeader(rowValues)) {
      const first = normalizeHeader(rowValues[0]).toLowerCase()
      if (!METADATA_FIRST_CELLS.has(first)) {
        return i
      }
    }
  }
  return null
}

function extractSheet(sheet: XLSX.WorkSheet, sheetName: string): SheetData {
  const jsonRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
  const rows: unknown[][] = jsonRows.map((r) => (Array.isArray(r) ? r : []))

  const headerRowIdx = findHeaderRow(rows)

  const metadata: Record<string, CellValue> = {}
  let headers: string[] = []
  const dataRows: Record<string, CellValue>[] = []

  if (headerRowIdx === null) {
    return { sheetName, metadata, headers, rows: dataRows }
  }

  // Extract metadata from rows above header
  for (let i = 0; i < headerRowIdx; i++) {
    const row = rows[i]
    if (row.length >= 2 && row[0] != null && String(row[0]).trim() !== "") {
      const key = normalizeHeader(row[0])
      metadata[key] = excelValueToJson(row[1])
    }
  }

  // Extract headers
  headers = rows[headerRowIdx].map((v) => normalizeHeader(v))
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop()
  }

  // Extract data rows
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const trimmed = row.slice(0, headers.length)

    if (isBlankRow(trimmed)) continue

    const firstCell = normalizeHeader(trimmed[0]).toLowerCase()
    if (KNOWN_STOP_LABELS.has(firstCell)) continue

    const obj: Record<string, CellValue> = {}
    let hasRealValue = false

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      if (!header) continue
      const value = j < trimmed.length ? trimmed[j] : null
      const jsonValue = excelValueToJson(value)
      obj[header] = jsonValue
      if (jsonValue != null && jsonValue !== "") hasRealValue = true
    }

    if (hasRealValue) dataRows.push(obj)
  }

  return { sheetName, metadata, headers, rows: dataRows }
}

export async function parseWorkbook(file: File): Promise<WorkbookData> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: "array", cellDates: true })

  const sheets: SheetData[] = wb.SheetNames.map((name) =>
    extractSheet(wb.Sheets[name], name)
  )

  return { fileName: file.name, sheets }
}
