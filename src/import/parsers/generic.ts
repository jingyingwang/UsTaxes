import { left, right } from 'ustaxes/core/util'
import {
  CSVParser,
  ParsedTransaction,
  ParseResult,
  ValidationResult,
  validateF1099BData
} from '../index'
import { parseDollar, determineTermType, termTypeFromLabel } from './common'

/**
 * Field mapping configuration for the generic parser.
 * Users assign CSV column indices to these standard fields
 * via the ConfigurableDataTable UI.
 */
export interface GenericColumnMapping {
  description?: number
  dateAcquired?: number
  dateSold?: number
  proceeds: number
  costBasis: number
  washSale?: number
  termType?: number
  basisReported?: number
}

/**
 * Generic CSV parser for unknown broker formats.
 * Uses manual column mapping (the user assigns columns via dropdowns).
 *
 * The detect() method always returns false since this is the fallback parser.
 * The parse() method uses a column mapping provided externally.
 */
export const genericParser: CSVParser = {
  name: 'Generic (Manual Column Mapping)',

  detect(): boolean {
    return false
  },

  parse(headers: string[], rows: string[][]): ParseResult {
    // The generic parser relies on column mapping, which must be
    // configured through the UI. When called without mapping, it
    // attempts auto-detection using common header names.
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

    const mapping = autoMapColumns(normalizedHeaders)
    if (mapping === undefined) {
      return left([
        {
          row: 0,
          messages: [
            'Could not auto-detect column mapping. Please assign columns manually.'
          ]
        }
      ])
    }

    return parseWithMapping(rows, mapping)
  },

  validate(data): ValidationResult {
    return validateF1099BData(data)
  }
}

/** Standard column field definitions for the manual mapping UI. */
export const genericFields = [
  { name: 'Description', required: false },
  { name: 'Date Acquired', required: false },
  { name: 'Date Sold', required: false },
  { name: 'Proceeds', required: true },
  { name: 'Cost Basis', required: true },
  { name: 'Wash Sale Loss', required: false },
  { name: 'Term (Short/Long)', required: false },
  { name: 'Basis Reported to IRS', required: false }
]

/** Try to automatically detect column indices from common header names. */
const autoMapColumns = (
  headers: string[]
): GenericColumnMapping | undefined => {
  const find = (candidates: string[]): number | undefined => {
    for (const c of candidates) {
      const idx = headers.indexOf(c.toLowerCase())
      if (idx >= 0) return idx
    }
    return undefined
  }

  const proceeds = find([
    'proceeds',
    'sales price',
    'sale price',
    'gross proceeds'
  ])
  const costBasis = find([
    'cost basis',
    'cost or other basis',
    'cost or basis',
    'cost',
    'basis'
  ])

  if (proceeds === undefined || costBasis === undefined) {
    return undefined
  }

  return {
    description: find([
      'description',
      'symbol',
      'security',
      'name',
      'fund name'
    ]),
    dateAcquired: find([
      'date acquired',
      'date of acquisition',
      'acquisition date',
      'buy date'
    ]),
    dateSold: find([
      'date sold',
      'date sold or disposed',
      'date of sale',
      'date of sale/exchange',
      'sell date',
      'sale date'
    ]),
    proceeds,
    costBasis,
    washSale: find([
      'wash sale loss disallowed',
      'wash sale',
      'wash sale adjustment'
    ]),
    termType: find([
      'term',
      'type of gain/loss',
      'short-term or long-term',
      'short-term/long-term',
      'holding period'
    ]),
    basisReported: find([
      'basis reported to irs',
      'reported',
      'covered',
      'noncovered/covered'
    ])
  }
}

/** Parse rows using an explicit column mapping. */
export const parseWithMapping = (
  rows: string[][],
  mapping: GenericColumnMapping
): ParseResult => {
  const transactions: ParsedTransaction[] = []
  const errors: { row: number; messages: string[] }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((cell) => cell.trim() === '')) continue

    const proceedsStr = (row[mapping.proceeds] ?? '').trim()
    const costBasisStr = (row[mapping.costBasis] ?? '').trim()

    if (proceedsStr === '' && costBasisStr === '') {
      // Skip fully empty data rows (likely section headers/footers)
      continue
    }

    // Validate required fields
    if (proceedsStr === '') {
      errors.push({ row: i + 1, messages: ['Missing proceeds value'] })
      continue
    }

    const proceeds = parseDollar(proceedsStr)
    const costBasis = parseDollar(costBasisStr)

    const washSale =
      mapping.washSale !== undefined
        ? parseDollar(row[mapping.washSale] ?? '')
        : 0

    const dateAcquired =
      mapping.dateAcquired !== undefined
        ? (row[mapping.dateAcquired] ?? '').trim()
        : undefined

    const dateSold =
      mapping.dateSold !== undefined ? (row[mapping.dateSold] ?? '').trim() : ''

    // Term type: from explicit column or calculated from dates
    let termType: 'SHORT' | 'LONG' = 'SHORT'
    if (mapping.termType !== undefined) {
      const label = (row[mapping.termType] ?? '').trim()
      termType = label ? termTypeFromLabel(label) : 'SHORT'
    } else {
      termType = determineTermType(
        dateAcquired && dateAcquired !== '' ? dateAcquired : undefined,
        dateSold
      )
    }

    // Basis reported
    let basisReported = true
    if (mapping.basisReported !== undefined) {
      const val = (row[mapping.basisReported] ?? '').trim().toLowerCase()
      basisReported =
        val !== 'no' && val !== 'n' && val !== 'noncovered' && val !== 'false'
    }

    transactions.push({
      description:
        mapping.description !== undefined
          ? (row[mapping.description] ?? '').trim()
          : '',
      dateAcquired:
        dateAcquired && dateAcquired !== '' ? dateAcquired : undefined,
      dateSold,
      proceeds,
      costBasis,
      washSaleLossDisallowed: Math.abs(washSale),
      termType,
      basisReportedToIRS: basisReported
    })
  }

  if (errors.length > 0) {
    return left(errors)
  }
  return right(transactions)
}

/** Build column mapping from user's field assignments (from ConfigurableDataTable). */
export const buildMappingFromAssignments = (
  assignments: (string | undefined)[]
): GenericColumnMapping | undefined => {
  const findIdx = (name: string): number | undefined => {
    const idx = assignments.indexOf(name)
    return idx >= 0 ? idx : undefined
  }

  const proceeds = findIdx('Proceeds')
  const costBasis = findIdx('Cost Basis')

  if (proceeds === undefined || costBasis === undefined) {
    return undefined
  }

  return {
    description: findIdx('Description'),
    dateAcquired: findIdx('Date Acquired'),
    dateSold: findIdx('Date Sold'),
    proceeds,
    costBasis,
    washSale: findIdx('Wash Sale Loss'),
    termType: findIdx('Term (Short/Long)'),
    basisReported: findIdx('Basis Reported to IRS')
  }
}
