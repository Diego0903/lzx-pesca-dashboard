// Helper para exportar arrays de objetos como CSV (UTF-8 com BOM para Excel ler acentos)

export interface CsvColumn<T> {
  key: keyof T | string
  label: string
  /** Transformação opcional do valor — útil pra formatar datas, numeros, joins, etc. */
  format?: (row: T) => string | number | null | undefined
}

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : String(v)
  // Sempre envolve em aspas se tem vírgula, aspas, quebra de linha, ou ;
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map(c => escapeCell(c.label)).join(',')
  const lines = rows.map(row =>
    columns.map(c => {
      const value = c.format ? c.format(row) : (row as Record<string, unknown>)[c.key as string]
      return escapeCell(value)
    }).join(',')
  )
  // BOM UTF-8 pra Excel reconhecer encoding
  const bom = '\uFEFF'
  const csv = bom + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
