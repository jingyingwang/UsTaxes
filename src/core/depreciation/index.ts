/**
 * Depreciation engine for Form 4562 and related forms.
 *
 * Provides:
 * - DepreciableAsset interface
 * - Section 179 expense election with annual limits and phase-out
 * - Bonus depreciation (TCJA phase-down schedule)
 * - MACRS regular depreciation calculation
 * - calculateDepreciation orchestrator
 */

import {
  getMACRSRate,
  RecoveryPeriod,
  DepreciationMethod,
  Convention
} from './macrs'

export { getMACRSRate, RecoveryPeriod, DepreciationMethod, Convention }

export type PropertyClass =
  | '3-year'
  | '5-year'
  | '7-year'
  | '10-year'
  | '15-year'
  | '20-year'
  | '25-year'
  | '27.5-year'
  | '39-year'

export function propertyClassToRecoveryPeriod(
  pc: PropertyClass
): RecoveryPeriod {
  const map: Record<PropertyClass, RecoveryPeriod> = {
    '3-year': 3,
    '5-year': 5,
    '7-year': 7,
    '10-year': 10,
    '15-year': 15,
    '20-year': 20,
    '25-year': 25,
    '27.5-year': 27.5,
    '39-year': 39
  }
  return map[pc]
}

/**
 * Represents a depreciable business asset for Form 4562.
 */
export interface DepreciableAsset {
  description: string
  datePlacedInService: Date
  cost: number
  /** Property class determines recovery period */
  propertyClass: PropertyClass
  /** Depreciation method: 200DB (default for most), 150DB, or SL */
  method: DepreciationMethod
  /** Averaging convention: half-year (default), mid-quarter, or mid-month */
  convention: Convention
  /** Amount of Section 179 expense elected for this asset */
  section179Election?: number
  /** Whether this asset qualifies for bonus depreciation */
  bonusDepreciationEligible?: boolean
  /** Which business this asset belongs to (for multi-Schedule-C taxpayers) */
  businessIndex?: number
  /** Quarter placed in service (1-4), needed for mid-quarter convention */
  quarterPlaced?: 1 | 2 | 3 | 4
}

/**
 * Section 179 deduction limits by tax year.
 * Source: IRS Rev. Proc. for each year; 2025 estimated per inflation adjustment.
 */
export const section179Limits: {
  [year: number]:
    | { maxDeduction: number; phaseOutThreshold: number }
    | undefined
} = {
  2019: { maxDeduction: 1020000, phaseOutThreshold: 2550000 },
  2020: { maxDeduction: 1040000, phaseOutThreshold: 2590000 },
  2021: { maxDeduction: 1050000, phaseOutThreshold: 2620000 },
  2022: { maxDeduction: 1080000, phaseOutThreshold: 2700000 },
  2023: { maxDeduction: 1160000, phaseOutThreshold: 2890000 },
  2024: { maxDeduction: 1220000, phaseOutThreshold: 3050000 },
  2025: { maxDeduction: 1250000, phaseOutThreshold: 3130000 }
}

/**
 * TCJA bonus depreciation phase-down schedule.
 * Property placed in service after September 27, 2017.
 */
export const bonusDepreciationRates: { [year: number]: number | undefined } = {
  2019: 100,
  2020: 100,
  2021: 100,
  2022: 100,
  2023: 80,
  2024: 60,
  2025: 40,
  2026: 20,
  2027: 0
}

/**
 * Compute the allowed Section 179 deduction considering limits and phase-out.
 *
 * @param taxYear - The tax year
 * @param totalSection179Cost - Total cost of all Section 179 property placed in service
 * @param electedAmount - The amount the taxpayer elects to expense
 * @param taxableBusinessIncome - Taxable income from active business (limits deduction)
 * @returns The allowed Section 179 deduction
 */
export function computeSection179(
  taxYear: number,
  totalSection179Cost: number,
  electedAmount: number,
  taxableBusinessIncome: number
): number {
  const limits = section179Limits[taxYear]
  if (!limits) return 0

  // Phase-out: reduce dollar-for-dollar when cost exceeds threshold
  const excessCost = Math.max(0, totalSection179Cost - limits.phaseOutThreshold)
  const adjustedMax = Math.max(0, limits.maxDeduction - excessCost)

  // Cannot exceed the lesser of elected amount or adjusted maximum
  const tentative = Math.min(electedAmount, adjustedMax)

  // Section 179 is limited to taxable business income
  return Math.min(tentative, taxableBusinessIncome)
}

/**
 * Get the bonus depreciation percentage for a given tax year.
 */
export function getBonusRate(taxYear: number): number {
  return bonusDepreciationRates[taxYear] ?? 0
}

/**
 * Result of a depreciation calculation for a single asset in a given year.
 */
export interface DepreciationResult {
  section179: number
  bonusDepreciation: number
  macrsDepreciation: number
  totalDepreciation: number
  /** The depreciable basis after Section 179 and bonus */
  remainingBasis: number
}

/**
 * Calculate depreciation for a single asset in a given tax year.
 *
 * The depreciation "stack" for newly placed-in-service assets:
 * 1. Section 179 expense (elected amount, up to limits)
 * 2. Bonus depreciation on remaining basis
 * 3. MACRS depreciation on remaining basis after 179 + bonus
 *
 * For assets placed in service in prior years, only MACRS applies
 * (Section 179 and bonus are first-year only).
 *
 * @param asset - The depreciable asset
 * @param taxYear - The current tax year
 * @param section179Allowed - Pre-computed Section 179 amount for this asset
 * @returns Depreciation breakdown
 */
export function calculateDepreciation(
  asset: DepreciableAsset,
  taxYear: number,
  section179Allowed = 0
): DepreciationResult {
  const yearPlaced = asset.datePlacedInService.getFullYear()
  const depreciationYear = taxYear - yearPlaced + 1

  if (depreciationYear < 1) {
    return {
      section179: 0,
      bonusDepreciation: 0,
      macrsDepreciation: 0,
      totalDepreciation: 0,
      remainingBasis: asset.cost
    }
  }

  const recoveryPeriod = propertyClassToRecoveryPeriod(asset.propertyClass)
  let basisAfter179 = asset.cost

  // Section 179 applies only in the year placed in service
  let section179 = 0
  if (depreciationYear === 1) {
    section179 = Math.min(section179Allowed, basisAfter179)
    basisAfter179 -= section179
  }

  // Bonus depreciation applies only in the year placed in service
  let bonusDepreciation = 0
  if (depreciationYear === 1 && asset.bonusDepreciationEligible) {
    const bonusRate = getBonusRate(yearPlaced) / 100
    bonusDepreciation = Math.round(basisAfter179 * bonusRate * 100) / 100
    basisAfter179 -= bonusDepreciation
  }

  // MACRS depreciation on remaining basis
  const month = asset.datePlacedInService.getMonth() + 1
  const rate =
    getMACRSRate(
      recoveryPeriod,
      asset.method,
      asset.convention,
      depreciationYear,
      asset.quarterPlaced,
      month
    ) / 100

  // For MACRS, the basis is original cost minus Section 179 minus bonus
  // (not cumulative MACRS from prior years - the rate tables handle that)
  const macrsBasis = asset.cost - section179 - bonusDepreciation
  const macrsDepreciation = Math.round(macrsBasis * rate * 100) / 100

  // Overclaim protection: total lifetime depreciation cannot exceed cost
  const totalDepreciation = section179 + bonusDepreciation + macrsDepreciation

  return {
    section179,
    bonusDepreciation,
    macrsDepreciation,
    totalDepreciation,
    remainingBasis: Math.max(0, basisAfter179 - macrsDepreciation)
  }
}
