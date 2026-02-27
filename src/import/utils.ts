import { preflightCsvAll } from 'ustaxes/data/csvImport'
import { Either, left, run } from 'ustaxes/core/util'

export const normalizeHeader = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

export const parseCsvRows = (contents: string): Either<string[], string[][]> =>
  run(preflightCsvAll(contents))
    .mapLeft((errors) => errors.map((e) => e.message))
    .value()

export const getHeaderAndRows = (
  rows: string[][]
): { headers: string[]; dataRows: string[][] } | undefined => {
  const nonEmptyRows = rows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  )
  if (nonEmptyRows.length === 0) {
    return undefined
  }
  const [rawHeaders, ...dataRows] = nonEmptyRows
  const headers = rawHeaders.map((h) => h.trim())
  return { headers, dataRows }
}

export const findHeaderIndex = (
  headers: string[],
  candidates: string[]
): number | undefined => {
  const normalizedHeaders = headers.map(normalizeHeader)
  for (const candidate of candidates) {
    const target = normalizeHeader(candidate)
    const idx = normalizedHeaders.indexOf(target)
    if (idx >= 0) {
      return idx
    }
  }
  return undefined
}

export const parseNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  const negativeParens = trimmed.startsWith('(') && trimmed.endsWith(')')
  const cleaned = trimmed
    .replace(/[$,%]/g, '')
    .replace(/[()]/g, '')
    .replace(/,/g, '')
  if (cleaned.length === 0) {
    return undefined
  }
  const parsed = Number.parseFloat(cleaned)
  if (Number.isNaN(parsed)) {
    return undefined
  }
  return negativeParens ? -parsed : parsed
}

export const parseDate = (value: string | undefined): Date | undefined => {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  return parsed
}

export const parseCsvOrError = (
  contents: string
): { headers: string[]; dataRows: string[][] } | Either<string[], never> => {
  const parsed = parseCsvRows(contents)
  if (parsed._tag === 'left') {
    return left(parsed.left)
  }
  const headerAndRows = getHeaderAndRows(parsed.right)
  if (headerAndRows === undefined) {
    return left(['CSV file contained no usable rows'])
  }
  return headerAndRows
}
