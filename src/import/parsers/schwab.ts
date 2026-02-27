import { left, right } from 'ustaxes/core/util'
import {
  CSVParser,
  ParsedTransaction,
  ParseResult,
  ValidationResult,
  validateF1099BData,
  aggregateTransactions
} from '../index'
import {
  parseDollar,
  termTypeFromLabel,
  findColumn,
  parseRowsWithColumns
} from './common'

/**
 * Charles Schwab 1099-B CSV parser.
 *
 * Schwab exports CSV with headers like:
 *   Description of Property, Date Acquired, Date Sold or Disposed,
 *   Proceeds, Cost or Other Basis, Wash Sale Loss Disallowed,
 *   Gain or (Loss), Short-term or Long-term, Basis Reported to IRS
 *
 * Schwab organizes transactions into sections separated by header rows
 * for "Short Term - Covered", "Long Term - Covered", etc.
 */
export const schwabParser: CSVParser = {
  name: 'Charles Schwab',

  detect(headers: string[]): boolean {
    const hasDescription = headers.some(
      (h) =>
        h === 'description of property' ||
        h === 'description' ||
        h === 'security description'
    )
    const hasDateSold = headers.some(
      (h) =>
        h === 'date sold or disposed' || h === 'date sold' || h === 'date_sold'
    )
    const hasCostOrBasis = headers.some(
      (h) =>
        h === 'cost or other basis' ||
        h === 'cost or basis' ||
        h === 'cost basis'
    )
    const hasGainLoss = headers.some(
      (h) =>
        h === 'gain or (loss)' || h === 'gain or loss' || h === 'gain/(loss)'
    )

    return hasDescription && hasDateSold && hasCostOrBasis && hasGainLoss
  },

  parse(headers: string[], rows: string[][]): ParseResult {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

    const descIdx = findColumn(normalizedHeaders, [
      'description of property',
      'description',
      'security description'
    ])
    const dateAcquiredIdx = findColumn(normalizedHeaders, [
      'date acquired',
      'date_acquired'
    ])
    const dateSoldIdx = findColumn(normalizedHeaders, [
      'date sold or disposed',
      'date sold',
      'date_sold'
    ])
    const proceedsIdx = findColumn(normalizedHeaders, [
      'proceeds',
      'sales price'
    ])
    const costBasisIdx = findColumn(normalizedHeaders, [
      'cost or other basis',
      'cost or basis',
      'cost basis'
    ])
    const washSaleIdx = findColumn(normalizedHeaders, [
      'wash sale loss disallowed',
      'wash sale'
    ])
    const termIdx = findColumn(normalizedHeaders, [
      'short-term or long-term',
      'term',
      'type'
    ])
    const reportedIdx = findColumn(normalizedHeaders, [
      'basis reported to irs',
      'reported'
    ])

    if (proceedsIdx < 0 || costBasisIdx < 0) {
      return left([
        {
          row: 0,
          messages: [
            'Could not find required columns: Proceeds and Cost or Other Basis'
          ]
        }
      ])
    }

    // Track section context for Schwab's section-based format
    let currentTerm: 'SHORT' | 'LONG' = 'SHORT'
    let currentReported = true

    return parseRowsWithColumns(rows, (row) => {
      // Schwab uses section header rows like "Short Term - Covered Securities"
      const firstCell = (row[0] ?? '').trim().toLowerCase()
      if (
        firstCell.includes('short term') ||
        firstCell.includes('long term') ||
        firstCell.includes('short-term') ||
        firstCell.includes('long-term')
      ) {
        currentTerm = firstCell.includes('long') ? 'LONG' : 'SHORT'
        currentReported =
          firstCell.includes('covered') || !firstCell.includes('noncovered')
        // Skip this section header row
        return left([])
      }

      // Skip summary/total rows
      if (
        firstCell.includes('total') ||
        firstCell.includes('subtotal') ||
        firstCell === ''
      ) {
        return left([])
      }

      const proceeds = parseDollar(row[proceedsIdx] ?? '')
      const costBasis = parseDollar(row[costBasisIdx] ?? '')
      const washSale =
        washSaleIdx >= 0 ? parseDollar(row[washSaleIdx] ?? '') : 0

      // Use explicit term column if available, otherwise use section context
      const termLabel = termIdx >= 0 ? (row[termIdx] ?? '').trim() : ''
      const termType = termLabel ? termTypeFromLabel(termLabel) : currentTerm

      // Use explicit reported column if available, otherwise use section context
      const reportedLabel =
        reportedIdx >= 0 ? (row[reportedIdx] ?? '').trim().toLowerCase() : ''
      const basisReported = reportedLabel
        ? reportedLabel !== 'no' && reportedLabel !== 'n'
        : currentReported

      const tx: ParsedTransaction = {
        description: descIdx >= 0 ? (row[descIdx] ?? '').trim() : '',
        dateAcquired:
          dateAcquiredIdx >= 0
            ? (row[dateAcquiredIdx] ?? '').trim()
            : undefined,
        dateSold: dateSoldIdx >= 0 ? (row[dateSoldIdx] ?? '').trim() : '',
        proceeds,
        costBasis,
        washSaleLossDisallowed: Math.abs(washSale),
        termType,
        basisReportedToIRS: basisReported
      }
      return right(tx)
    })
  },

  validate(data): ValidationResult {
    return validateF1099BData(data)
  }
}

export const parseSchwabCsv = (
  headers: string[],
  rows: string[][]
): ParseResult => schwabParser.parse(headers, rows)

export const schwabToF1099B = (transactions: ParsedTransaction[]) =>
  aggregateTransactions(transactions)
