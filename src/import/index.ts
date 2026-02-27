import { F1099BData } from 'ustaxes/core/data'
import { Either, left, right } from 'ustaxes/core/util'
import { fidelityParser } from './parsers/fidelity'
import { schwabParser } from './parsers/schwab'
import { vanguardParser } from './parsers/vanguard'
import { genericParser } from './parsers/generic'

/**
 * Represents a single parsed transaction from a 1099-B CSV.
 * Individual transactions are aggregated into F1099BData totals.
 */
export interface ParsedTransaction {
  description: string
  dateAcquired?: string
  dateSold: string
  proceeds: number
  costBasis: number
  washSaleLossDisallowed: number
  termType: 'SHORT' | 'LONG'
  basisReportedToIRS: boolean
}

export interface ValidationError {
  field: string
  message: string
}

export interface ParseError {
  row: number
  messages: string[]
}

export type ParseResult = Either<ParseError[], ParsedTransaction[]>
export type ValidationResult = Either<ValidationError[], F1099BData>

/**
 * A CSVParser detects whether it can handle a given CSV by inspecting
 * headers, parses rows into transactions, and validates the aggregated data.
 */
export interface CSVParser {
  name: string
  detect(headers: string[]): boolean
  parse(headers: string[], rows: string[][]): ParseResult
  validate(data: F1099BData): ValidationResult
}

/**
 * Aggregate individual transactions into F1099BData totals.
 * Groups by term type (short/long) and basis reporting status.
 */
export const aggregateTransactions = (
  transactions: ParsedTransaction[]
): F1099BData => {
  const result: F1099BData = {
    shortTermBasisReportedProceeds: 0,
    shortTermBasisReportedCostBasis: 0,
    shortTermBasisReportedWashSale: 0,
    longTermBasisReportedProceeds: 0,
    longTermBasisReportedCostBasis: 0,
    longTermBasisReportedWashSale: 0,
    shortTermBasisNotReportedProceeds: 0,
    shortTermBasisNotReportedCostBasis: 0,
    shortTermBasisNotReportedWashSale: 0,
    longTermBasisNotReportedProceeds: 0,
    longTermBasisNotReportedCostBasis: 0,
    longTermBasisNotReportedWashSale: 0
  }

  for (const tx of transactions) {
    if (tx.termType === 'SHORT' && tx.basisReportedToIRS) {
      result.shortTermBasisReportedProceeds += tx.proceeds
      result.shortTermBasisReportedCostBasis += tx.costBasis
      result.shortTermBasisReportedWashSale += tx.washSaleLossDisallowed
    } else if (tx.termType === 'SHORT' && !tx.basisReportedToIRS) {
      result.shortTermBasisNotReportedProceeds += tx.proceeds
      result.shortTermBasisNotReportedCostBasis += tx.costBasis
      result.shortTermBasisNotReportedWashSale += tx.washSaleLossDisallowed
    } else if (tx.termType === 'LONG' && tx.basisReportedToIRS) {
      result.longTermBasisReportedProceeds += tx.proceeds
      result.longTermBasisReportedCostBasis += tx.costBasis
      result.longTermBasisReportedWashSale += tx.washSaleLossDisallowed
    } else {
      result.longTermBasisNotReportedProceeds += tx.proceeds
      result.longTermBasisNotReportedCostBasis += tx.costBasis
      result.longTermBasisNotReportedWashSale += tx.washSaleLossDisallowed
    }
  }

  // Round to 2 decimal places
  for (const key of Object.keys(result) as (keyof F1099BData)[]) {
    result[key] = Math.round(result[key] * 100) / 100
  }

  return result
}

/** All registered broker-specific parsers, in detection priority order. */
const brokerParsers: CSVParser[] = [
  fidelityParser,
  schwabParser,
  vanguardParser
]

/**
 * Detect which parser can handle the given CSV headers.
 * Falls back to the generic (manual column mapping) parser if
 * no broker-specific parser matches.
 */
export const detectParser = (headers: string[]): CSVParser => {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  for (const parser of brokerParsers) {
    if (parser.detect(normalized)) {
      return parser
    }
  }
  return genericParser
}

/**
 * Validate that F1099BData has no negative proceeds values
 * and that totals are internally consistent.
 */
export const validateF1099BData = (
  data: F1099BData
): Either<ValidationError[], F1099BData> => {
  const errors: ValidationError[] = []

  if (data.shortTermBasisReportedProceeds < 0) {
    errors.push({
      field: 'shortTermBasisReportedProceeds',
      message: 'Short-term basis-reported proceeds cannot be negative'
    })
  }
  if (data.longTermBasisReportedProceeds < 0) {
    errors.push({
      field: 'longTermBasisReportedProceeds',
      message: 'Long-term basis-reported proceeds cannot be negative'
    })
  }
  if (data.shortTermBasisNotReportedProceeds < 0) {
    errors.push({
      field: 'shortTermBasisNotReportedProceeds',
      message: 'Short-term basis-not-reported proceeds cannot be negative'
    })
  }
  if (data.longTermBasisNotReportedProceeds < 0) {
    errors.push({
      field: 'longTermBasisNotReportedProceeds',
      message: 'Long-term basis-not-reported proceeds cannot be negative'
    })
  }

  if (errors.length > 0) {
    return left(errors)
  }
  return right(data)
}

export { fidelityParser, schwabParser, vanguardParser, genericParser }
