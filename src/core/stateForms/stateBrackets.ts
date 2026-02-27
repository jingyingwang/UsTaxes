/**
 * Tax bracket utilities for state income tax computation.
 *
 * Most states use a progressive bracket system identical in structure
 * to the federal one: each bracket defines a rate that applies only
 * to the portion of income above its threshold.
 */

export interface TaxBracket {
  /** Lower bound of this bracket (inclusive). */
  threshold: number
  /** Marginal tax rate for income within this bracket. */
  rate: number
}

/**
 * Compute progressive tax from an ordered array of brackets.
 *
 * Brackets must be sorted ascending by threshold. Income in each
 * bracket is taxed at that bracket's marginal rate. For example,
 * with brackets [{threshold: 0, rate: 0.05}, {threshold: 10000, rate: 0.07}],
 * an income of 15000 yields: 10000 * 0.05 + 5000 * 0.07 = 850.
 *
 * Returns 0 for non-positive income.
 */
export const computeBracketTax = (
  brackets: TaxBracket[],
  income: number
): number => {
  if (income <= 0 || brackets.length === 0) return 0

  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const lower = brackets[i].threshold
    const upper = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity
    const taxableInBracket = Math.min(income, upper) - lower
    if (taxableInBracket <= 0) break
    tax += taxableInBracket * brackets[i].rate
  }
  return tax
}

/**
 * Compute flat tax (single rate applied to all income).
 * Convenience wrapper used by flat-tax states like IL, CO, PA.
 */
export const computeFlatTax = (rate: number, income: number): number =>
  income > 0 ? income * rate : 0
