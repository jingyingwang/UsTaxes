import { FilingStatus } from '../data'

/**
 * A single tax bracket: income up to `to` is taxed at `rate`.
 * The last bracket should use Infinity for `to`.
 */
export interface TaxBracket {
  rate: number
  to: number
}

/**
 * Tax brackets keyed by filing status.
 */
export type BracketsByStatus = {
  [K in FilingStatus]: TaxBracket[]
}

/**
 * Calculates progressive tax from graduated brackets.
 *
 * Example: brackets = [{ rate: 0.02, to: 500 }, { rate: 0.04, to: Infinity }]
 * For income = 700:
 *   First $500 at 2% = $10
 *   Next $200 at 4% = $8
 *   Total = $18
 */
export const computeTax = (
  brackets: TaxBracket[],
  taxableIncome: number
): number => {
  if (taxableIncome <= 0) return 0

  let remaining = taxableIncome
  let tax = 0
  let prevTo = 0

  for (const bracket of brackets) {
    const bracketWidth = bracket.to - prevTo
    const taxableInBracket = Math.min(remaining, bracketWidth)
    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
    prevTo = bracket.to
    if (remaining <= 0) break
  }

  return Math.round(tax)
}
