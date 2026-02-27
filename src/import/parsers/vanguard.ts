import { left, right } from 'ustaxes/core/util'
import {
  CSVParser,
  ParsedTransaction,
  ParseResult,
  ValidationResult,
  validateF1099BData
} from '../index'
import {
  parseDollar,
  determineTermType,
  findColumn,
  parseRowsWithColumns
} from './common'

/**
 * Vanguard 1099-B CSV parser.
 *
 * Vanguard exports CSV with headers like:
 *   Fund Account Number, Fund Name, CUSIP Number, Date of Sale/Exchange,
 *   Date of Acquisition, Sales Price, Cost or Other Basis,
 *   Wash Sale Loss Disallowed, Gain or Loss, Noncovered/Covered,
 *   Short-term/Long-term, Basis Reported to IRS
 *
 * Vanguard explicitly labels each row with "Covered"/"Noncovered"
 * and "Short-term"/"Long-term".
 */
export const vanguardParser: CSVParser = {
  name: 'Vanguard',

  detect(headers: string[]): boolean {
    const hasFundName = headers.some(
      (h) =>
        h === 'fund name' || h === 'fund account number' || h === 'cusip number'
    )
    const hasDateOfSale = headers.some(
      (h) =>
        h === 'date of sale/exchange' ||
        h === 'date of sale' ||
        h === 'date of exchange'
    )
    const hasSalesPrice = headers.some(
      (h) => h === 'sales price' || h === 'proceeds'
    )

    // Vanguard is identified by fund-specific headers + date of sale/exchange
    return hasFundName && hasDateOfSale && hasSalesPrice
  },

  parse(headers: string[], rows: string[][]): ParseResult {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

    const descIdx = findColumn(normalizedHeaders, [
      'fund name',
      'description',
      'security'
    ])
    const dateAcquiredIdx = findColumn(normalizedHeaders, [
      'date of acquisition',
      'date acquired',
      'acquisition date'
    ])
    const dateSoldIdx = findColumn(normalizedHeaders, [
      'date of sale/exchange',
      'date of sale',
      'date sold',
      'sale date'
    ])
    const proceedsIdx = findColumn(normalizedHeaders, [
      'sales price',
      'proceeds'
    ])
    const costBasisIdx = findColumn(normalizedHeaders, [
      'cost or other basis',
      'cost basis',
      'cost or basis'
    ])
    const washSaleIdx = findColumn(normalizedHeaders, [
      'wash sale loss disallowed',
      'wash sale'
    ])
    const coveredIdx = findColumn(normalizedHeaders, [
      'noncovered/covered',
      'covered/noncovered',
      'covered'
    ])
    const termIdx = findColumn(normalizedHeaders, [
      'short-term/long-term',
      'short-term or long-term',
      'term'
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
            'Could not find required columns: Sales Price and Cost or Other Basis'
          ]
        }
      ])
    }

    return parseRowsWithColumns(rows, (row) => {
      const proceeds = parseDollar(row[proceedsIdx] ?? '')
      const costBasis = parseDollar(row[costBasisIdx] ?? '')
      const washSale =
        washSaleIdx >= 0 ? parseDollar(row[washSaleIdx] ?? '') : 0

      // Determine term type from explicit column or dates
      const termLabel = termIdx >= 0 ? (row[termIdx] ?? '').trim() : ''
      const dateAcquired =
        dateAcquiredIdx >= 0 ? (row[dateAcquiredIdx] ?? '').trim() : undefined
      const dateSold = dateSoldIdx >= 0 ? (row[dateSoldIdx] ?? '').trim() : ''
      const termType = termLabel
        ? termLabel.toLowerCase().includes('long')
          ? 'LONG'
          : 'SHORT'
        : determineTermType(dateAcquired, dateSold)

      // Determine basis reported status
      let basisReported = true
      if (reportedIdx >= 0) {
        const reportedVal = (row[reportedIdx] ?? '').trim().toLowerCase()
        basisReported = reportedVal !== 'no' && reportedVal !== 'n'
      } else if (coveredIdx >= 0) {
        const coveredVal = (row[coveredIdx] ?? '').trim().toLowerCase()
        basisReported = !coveredVal.includes('noncovered')
      }

      const tx: ParsedTransaction = {
        description: descIdx >= 0 ? (row[descIdx] ?? '').trim() : '',
        dateAcquired,
        dateSold,
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
