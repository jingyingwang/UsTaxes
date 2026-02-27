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
 * Fidelity 1099-B CSV parser.
 *
 * Fidelity exports CSV files with headers like:
 *   Symbol, Description, Date Acquired, Date Sold, Proceeds,
 *   Cost Basis, Gain/Loss, Wash Sale Loss Disallowed,
 *   Type of Gain/Loss, Term
 *
 * Covered (basis reported) securities are identified by the section
 * heading or a dedicated "Reported" column when present.
 */
export const fidelityParser: CSVParser = {
  name: 'Fidelity',

  detect(headers: string[]): boolean {
    // Fidelity CSVs typically include both "Date Acquired" and "Type of Gain/Loss"
    // or "Gain/Loss" alongside "Cost Basis"
    const hasDateAcquired = headers.some(
      (h) => h === 'date acquired' || h === 'date_acquired'
    )
    const hasGainLoss = headers.some(
      (h) => h === 'gain/loss' || h === 'gain or loss' || h === 'gain_loss'
    )
    const hasProceeds = headers.some(
      (h) => h === 'proceeds' || h === 'sales price'
    )
    const hasCostBasis = headers.some(
      (h) => h === 'cost basis' || h === 'cost_basis' || h === 'cost or basis'
    )
    const hasTerm = headers.some(
      (h) =>
        h === 'term' ||
        h === 'type of gain/loss' ||
        h === 'type of gain or loss'
    )

    return (
      hasDateAcquired && hasProceeds && hasCostBasis && (hasGainLoss || hasTerm)
    )
  },

  parse(headers: string[], rows: string[][]): ParseResult {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

    const descIdx = findColumn(normalizedHeaders, [
      'description',
      'symbol',
      'security'
    ])
    const dateAcquiredIdx = findColumn(normalizedHeaders, [
      'date acquired',
      'date_acquired',
      'acquired'
    ])
    const dateSoldIdx = findColumn(normalizedHeaders, [
      'date sold',
      'date_sold',
      'sold',
      'date sold or disposed'
    ])
    const proceedsIdx = findColumn(normalizedHeaders, [
      'proceeds',
      'sales price'
    ])
    const costBasisIdx = findColumn(normalizedHeaders, [
      'cost basis',
      'cost_basis',
      'cost or basis',
      'cost or other basis'
    ])
    const washSaleIdx = findColumn(normalizedHeaders, [
      'wash sale loss disallowed',
      'wash sale',
      'wash_sale'
    ])
    const termIdx = findColumn(normalizedHeaders, [
      'term',
      'type of gain/loss',
      'type of gain or loss'
    ])
    const reportedIdx = findColumn(normalizedHeaders, [
      'reported',
      'basis reported to irs',
      'basis reported'
    ])

    if (proceedsIdx < 0 || costBasisIdx < 0) {
      return left([
        {
          row: 0,
          messages: ['Could not find required columns: Proceeds and Cost Basis']
        }
      ])
    }

    return parseRowsWithColumns(rows, (row, rowIdx) => {
      const proceeds = parseDollar(row[proceedsIdx] ?? '')
      const costBasis = parseDollar(row[costBasisIdx] ?? '')
      const washSale =
        washSaleIdx >= 0 ? parseDollar(row[washSaleIdx] ?? '') : 0

      if (isNaN(proceeds) && row[proceedsIdx]?.trim() === '') {
        return left([`Row ${rowIdx + 1}: Missing proceeds value`])
      }

      const termLabel = termIdx >= 0 ? row[termIdx] ?? '' : ''
      const termType = termLabel ? termTypeFromLabel(termLabel) : 'SHORT'

      const basisReported =
        reportedIdx >= 0
          ? (row[reportedIdx] ?? '').trim().toLowerCase() !== 'no'
          : true // Fidelity defaults to covered/reported

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

export const parseFidelityCsv = (
  headers: string[],
  rows: string[][]
): ParseResult => fidelityParser.parse(headers, rows)

export const fidelityToF1099B = (transactions: ParsedTransaction[]) =>
  aggregateTransactions(transactions)
