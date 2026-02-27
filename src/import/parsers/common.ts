import { Either, left, right } from 'ustaxes/core/util'
import { ParsedTransaction, ParseError } from '../index'

/** Clean a dollar string: remove $, commas, parens (negative), whitespace. */
export const parseDollar = (s: string): number => {
  const cleaned = s.replace(/[$,\s]/g, '')
  // Handle parenthesized negatives: (123.45) -> -123.45
  const isNeg = cleaned.startsWith('(') && cleaned.endsWith(')')
  const numStr = isNeg ? cleaned.slice(1, -1) : cleaned
  const val = parseFloat(numStr)
  return isNaN(val) ? 0 : isNeg ? -val : val
}

/** Determine term type from date strings. >1 year holding = LONG. */
export const determineTermType = (
  dateAcquired: string | undefined,
  dateSold: string
): 'SHORT' | 'LONG' => {
  if (!dateAcquired) return 'SHORT'
  try {
    const acquired = new Date(dateAcquired)
    const sold = new Date(dateSold)
    const diffMs = sold.getTime() - acquired.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays > 365 ? 'LONG' : 'SHORT'
  } catch {
    return 'SHORT'
  }
}

/** Determine term type from an explicit label (e.g. "Short Term", "Long-Term"). */
export const termTypeFromLabel = (label: string): 'SHORT' | 'LONG' => {
  const lower = label.toLowerCase()
  if (lower.includes('long')) return 'LONG'
  return 'SHORT'
}

/** Find column index by checking multiple possible header names. */
export const findColumn = (headers: string[], candidates: string[]): number => {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  for (const c of candidates) {
    const idx = normalized.indexOf(c.toLowerCase())
    if (idx >= 0) return idx
  }
  return -1
}

/**
 * Parse rows using column indices, collecting per-row errors.
 * Rows that return left([]) (empty error array) are treated as
 * "skip this row" — used by parsers to skip section headers, totals, etc.
 */
export const parseRowsWithColumns = (
  rows: string[][],
  extractTransaction: (
    row: string[],
    rowIdx: number
  ) => Either<string[], ParsedTransaction>
): Either<ParseError[], ParsedTransaction[]> => {
  const transactions: ParsedTransaction[] = []
  const errors: ParseError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Skip empty rows
    if (row.every((cell) => cell.trim() === '')) continue

    const result = extractTransaction(row, i)
    if (result._tag === 'left') {
      // Empty error array means "skip this row" (section headers, totals)
      if (result.left.length > 0) {
        errors.push({ row: i + 1, messages: result.left })
      }
    } else {
      transactions.push(result.right)
    }
  }

  if (errors.length > 0) {
    return left(errors)
  }
  return right(transactions)
}
