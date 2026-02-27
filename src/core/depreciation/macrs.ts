/**
 * MACRS (Modified Accelerated Cost Recovery System) depreciation rate tables.
 *
 * Tables sourced from IRS Publication 946, Appendix A.
 * GDS (General Depreciation System) rates for:
 *   - 3, 5, 7, 10, 15, 20-year property using half-year convention
 *   - 3, 5, 7, 10, 15, 20-year property using mid-quarter convention (Q1-Q4)
 *   - 27.5-year residential rental property (mid-month convention)
 *   - 39-year nonresidential real property (mid-month convention)
 */

export type DepreciationMethod = '200DB' | '150DB' | 'SL'

export type Convention = 'half-year' | 'mid-quarter' | 'mid-month'

export type RecoveryPeriod = 3 | 5 | 7 | 10 | 15 | 20 | 25 | 27.5 | 39

/**
 * Half-year convention rates using 200% declining balance switching to straight-line.
 * Key = recovery period in years. Value = array of annual percentages (year 1, 2, ...).
 * Source: IRS Pub 946, Table A-1.
 */
export const halfYearRates200DB: Partial<Record<RecoveryPeriod, number[]>> = {
  3: [33.33, 44.45, 14.81, 7.41],
  5: [20.0, 32.0, 19.2, 11.52, 11.52, 5.76],
  7: [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46],
  10: [10.0, 18.0, 14.4, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28],
  15: [
    5.0, 9.5, 8.55, 7.7, 6.93, 6.23, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9,
    5.91, 2.95
  ],
  20: [
    3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461, 4.462,
    4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231
  ]
}

/**
 * Half-year convention rates using 150% declining balance switching to straight-line.
 * Source: IRS Pub 946, Table A-14.
 */
export const halfYearRates150DB: Partial<Record<RecoveryPeriod, number[]>> = {
  3: [25.0, 37.5, 25.0, 12.5],
  5: [15.0, 25.5, 17.85, 16.66, 16.66, 8.33],
  7: [10.71, 19.13, 15.03, 12.25, 12.25, 12.25, 12.25, 6.13],
  10: [7.5, 13.88, 11.79, 10.02, 8.74, 8.74, 8.74, 8.74, 8.74, 8.74, 4.37],
  15: [
    5.0, 9.5, 8.55, 7.7, 6.93, 6.23, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9,
    5.91, 2.95
  ],
  20: [
    3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461, 4.462,
    4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231
  ]
}

/**
 * Mid-quarter convention rates (200% DB) by quarter placed in service.
 * Source: IRS Pub 946, Tables A-2 through A-5.
 */
export const midQuarterRates200DB: Record<
  1 | 2 | 3 | 4,
  Partial<Record<RecoveryPeriod, number[]>>
> = {
  1: {
    3: [58.33, 27.78, 12.35, 1.54],
    5: [35.0, 26.0, 15.6, 11.01, 11.01, 1.38],
    7: [25.0, 21.43, 15.31, 10.93, 8.75, 8.74, 8.75, 1.09]
  },
  2: {
    3: [41.67, 38.89, 14.14, 5.3],
    5: [25.0, 30.0, 18.0, 11.37, 11.37, 4.26],
    7: [17.85, 23.47, 16.76, 11.97, 8.87, 8.87, 8.87, 3.34]
  },
  3: {
    3: [25.0, 50.0, 16.67, 8.33],
    5: [15.0, 34.0, 20.4, 12.24, 11.3, 7.06],
    7: [10.71, 25.51, 18.22, 13.02, 9.3, 8.85, 8.86, 5.53]
  },
  4: {
    3: [8.33, 61.11, 20.37, 10.19],
    5: [5.0, 38.0, 22.8, 13.68, 10.94, 9.58],
    7: [3.57, 27.55, 19.68, 14.06, 10.04, 8.73, 8.73, 7.64]
  }
}

/**
 * Compute straight-line depreciation rates for real property
 * with mid-month convention.
 *
 * For 27.5-year residential rental property:
 *   Monthly rate = 1/27.5/12 = 0.3030% (approximately)
 *   First/last year prorated by month placed in service.
 *
 * For 39-year nonresidential real property:
 *   Monthly rate = 1/39/12 = 0.2137% (approximately)
 */
export function midMonthRate(
  recoveryPeriod: 27.5 | 39,
  monthPlacedInService: number,
  year: number
): number {
  const totalMonths = recoveryPeriod * 12
  const monthlyRate = (1 / totalMonths) * 100

  if (year === 1) {
    // Mid-month: placed in service at midpoint of the month
    const monthsInService = 12 - monthPlacedInService + 0.5
    return monthlyRate * monthsInService
  }

  const lastYear = Math.ceil(recoveryPeriod) + 1
  if (year === lastYear) {
    // Remaining depreciation in the final year
    const monthsInFirstYear = 12 - monthPlacedInService + 0.5
    const fullYears = year - 2
    const previousDepreciation =
      monthlyRate * monthsInFirstYear + monthlyRate * 12 * fullYears
    return Math.max(0, 100 - previousDepreciation)
  }

  if (year > 1 && year < lastYear) {
    return monthlyRate * 12
  }

  return 0
}

/**
 * Get the MACRS depreciation rate for a given asset configuration.
 *
 * @param recoveryPeriod - The MACRS recovery period (3, 5, 7, 10, 15, 20, 27.5, or 39 years)
 * @param method - Depreciation method (200DB, 150DB, or SL)
 * @param convention - Averaging convention (half-year, mid-quarter, mid-month)
 * @param year - The depreciation year (1-based)
 * @param quarter - Quarter placed in service (1-4), required for mid-quarter convention
 * @param month - Month placed in service (1-12), required for mid-month convention
 * @returns The depreciation rate as a percentage (e.g., 20.0 means 20%)
 */
export function getMACRSRate(
  recoveryPeriod: RecoveryPeriod,
  method: DepreciationMethod,
  convention: Convention,
  year: number,
  quarter?: 1 | 2 | 3 | 4,
  month?: number
): number {
  if (convention === 'mid-month') {
    if (recoveryPeriod !== 27.5 && recoveryPeriod !== 39) {
      return 0
    }
    return midMonthRate(recoveryPeriod, month ?? 1, year)
  }

  if (convention === 'mid-quarter') {
    const q = quarter ?? 1
    const table = midQuarterRates200DB[q]
    const rates = table[recoveryPeriod]
    if (!rates || year < 1 || year > rates.length) return 0
    return rates[year - 1]
  }

  // half-year convention
  const table = method === '150DB' ? halfYearRates150DB : halfYearRates200DB
  const rates = table[recoveryPeriod]
  if (!rates || year < 1 || year > rates.length) return 0
  return rates[year - 1]
}
