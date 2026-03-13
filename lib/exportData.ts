import type { CellValue } from "@/types"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportAsJson(
  rows: Record<string, CellValue>[],
  filename: string
) {
  const json = JSON.stringify(rows, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  downloadBlob(blob, filename.replace(/\.\w+$/, "") + ".json")
}

export function exportAsCsv(
  rows: Record<string, CellValue>[],
  headers: string[],
  filename: string
) {
  if (rows.length === 0) return

  const escapeCsv = (val: CellValue): string => {
    if (val == null) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv" })
  downloadBlob(blob, filename.replace(/\.\w+$/, "") + ".csv")
}
