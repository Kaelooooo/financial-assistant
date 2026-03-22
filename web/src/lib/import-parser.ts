// src/lib/import-parser.ts
import Papa from 'papaparse'
import type { ParsedTransaction, TransactionType } from '@/types/database'

/** Parse a date string to YYYY-MM-DD without timezone shifting. */
function normalizeDate(dateStr: string): string {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // MM/DD/YYYY or M/D/YYYY
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  // Fallback: parse and extract UTC date to avoid local-time offset
  const dt = new Date(dateStr)
  if (isNaN(dt.getTime())) return ''
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function inferType(amount: number, rawType?: string): TransactionType {
  if (rawType) {
    const t = rawType.toLowerCase()
    if (t.includes('income') || t.includes('credit')) return 'income'
    if (t.includes('transfer')) return 'transfer'
  }
  return amount >= 0 ? 'income' : 'expense'
}

export async function parseCSV(file: File): Promise<Omit<ParsedTransaction, 'row_id'>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[]
        const parsed = rows.map((row) => {
          const date = row['Date'] ?? row['date'] ?? row['Transaction Date'] ?? ''
          const rawAmount = parseFloat(row['Amount'] ?? row['amount'] ?? row['Debit'] ?? '0')
          const amount = Math.abs(rawAmount)
          const description = row['Description'] ?? row['Payee'] ?? row['Merchant'] ?? row['description'] ?? ''
          const rawType = row['Type'] ?? row['type'] ?? ''
          const rawCategory = row['Category'] ?? row['category'] ?? ''
          return {
            date: normalizeDate(date),
            amount,
            description,
            type: inferType(rawAmount, rawType),
            ...(rawCategory ? { raw_category: rawCategory } : {}),
          }
        }).filter((r) => r.date && r.amount > 0 && r.description)
        resolve(parsed)
      },
      error: reject,
    })
  })
}

export async function parseOFX(file: File): Promise<Omit<ParsedTransaction, 'row_id'>[]> {
  const text = await file.text()
  const { parse } = await import('ofx-js')
  const ofx = await parse(text)
  const stmtTrn = ofx?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN ?? []
  const rows = Array.isArray(stmtTrn) ? stmtTrn : [stmtTrn]
  return rows.map((t: Record<string, string>) => {
    const rawAmount = parseFloat(t.TRNAMT ?? '0')
    return {
      date: t.DTPOSTED ? `${t.DTPOSTED.slice(0, 4)}-${t.DTPOSTED.slice(4, 6)}-${t.DTPOSTED.slice(6, 8)}` : '',
      amount: Math.abs(rawAmount),
      description: t.NAME ?? t.MEMO ?? '',
      type: inferType(rawAmount),
    }
  }).filter((r: any) => r.date && r.amount > 0 && r.description)
}

export async function parseFile(file: File): Promise<Omit<ParsedTransaction, 'row_id'>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'ofx' || ext === 'qfx') return parseOFX(file)
  return parseCSV(file)
}
