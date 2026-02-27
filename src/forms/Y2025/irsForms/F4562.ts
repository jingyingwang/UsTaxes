import F1040Attachment from './F1040Attachment'
import F1040 from './F1040'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { DepreciableAssetInput } from 'ustaxes/core/data'
import {
  calculateDepreciation,
  computeSection179,
  DepreciationResult
} from 'ustaxes/core/depreciation'

const TAX_YEAR = 2025

/**
 * IRS Form 4562 — Depreciation and Amortization
 *
 * This form calculates depreciation deductions for business property.
 * Each copy corresponds to a single business activity (e.g., one Schedule C business).
 *
 * Structure:
 * - Part I:   Election to Expense Certain Property (Section 179)
 * - Part II:  Special Depreciation Allowance (Bonus Depreciation)
 * - Part III: MACRS Depreciation (Assets placed in service during current year)
 * - Part IV:  Summary
 * - Part V:   Listed Property (vehicles, etc.) — simplified
 * - Part VI:  Amortization — not yet implemented
 *
 * 8 variants are supported through the copies() mechanism,
 * one for each business/activity that has depreciable assets.
 */
export default class F4562 extends F1040Attachment {
  tag: FormTag = 'f4562'
  sequenceIndex = 179

  /** Index into the Schedule C businesses (or -1 for general) */
  private businessIdx: number

  /** Cached depreciation results per asset */
  private _results?: Map<number, DepreciationResult>

  constructor(f1040: F1040, businessIndex = 0) {
    super(f1040)
    this.businessIdx = businessIndex
  }

  // ─── Asset helpers ────────────────────────────────────────

  /** All depreciable assets in the taxpayer's data */
  private allAssets(): DepreciableAssetInput<Date>[] {
    return this.f1040.info.depreciableAssets
  }

  /** Assets for this specific business/activity */
  private assets(): DepreciableAssetInput<Date>[] {
    return this.allAssets().filter(
      (a) => (a.businessIndex ?? 0) === this.businessIdx
    )
  }

  /** Assets placed in service during the current tax year */
  private currentYearAssets(): DepreciableAssetInput<Date>[] {
    return this.assets().filter(
      (a) => a.datePlacedInService.getFullYear() === TAX_YEAR
    )
  }

  /** Assets placed in service in prior years (still depreciating) */
  private priorYearAssets(): DepreciableAssetInput<Date>[] {
    return this.assets().filter(
      (a) => a.datePlacedInService.getFullYear() < TAX_YEAR
    )
  }

  isNeeded = (): boolean => this.assets().length > 0

  copies = (): F4562[] => {
    // Find all unique business indices that have depreciable assets
    const allAssets = this.allAssets()
    const indexSet = new Set<number>(allAssets.map((a) => a.businessIndex ?? 0))
    const indices: number[] = Array.from(indexSet)
    // Return copies for all indices except the first (which is this instance)
    return indices
      .filter((i) => i !== this.businessIdx)
      .map((i) => new F4562(this.f1040, i))
  }

  // ─── Depreciation calculation engine ──────────────────────

  /** Calculate and cache depreciation for all assets */
  private getResults(): Map<number, DepreciationResult> {
    if (this._results) return this._results
    this._results = new Map()

    const assets = this.assets()

    // First compute the total Section 179 allowed
    const totalSection179Elected = assets.reduce(
      (sum, a) => sum + a.section179Election,
      0
    )
    const totalSection179Cost = this.currentYearAssets().reduce(
      (sum, a) => sum + a.cost,
      0
    )
    // Business income limit for Section 179 (from Schedule C net profit)
    const businessIncome = this.getBusinessIncome()
    const section179Allowed = computeSection179(
      TAX_YEAR,
      totalSection179Cost,
      totalSection179Elected,
      businessIncome
    )

    // Distribute Section 179 across assets proportionally
    let section179Remaining = section179Allowed
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      const assetElection = asset.section179Election
      const assetSection179 = Math.min(assetElection, section179Remaining)
      section179Remaining -= assetSection179

      const result = calculateDepreciation(asset, TAX_YEAR, assetSection179)
      this._results.set(i, result)
    }

    return this._results
  }

  private getBusinessIncome(): number {
    const schedCInputs = this.f1040.info.scheduleCInputs
    if (this.businessIdx < schedCInputs.length) {
      const sc = schedCInputs[this.businessIdx]
      // Approximate net profit: gross receipts - returns - expenses
      const totalExpenses = Object.values(sc.expenses).reduce(
        (sum, v) => sum + v,
        0
      )
      return Math.max(0, sc.grossReceipts - sc.returns - totalExpenses)
    }
    return 0
  }

  private resultFor(assetIndex: number): DepreciationResult {
    const results = this.getResults()
    return (
      results.get(assetIndex) ?? {
        section179: 0,
        bonusDepreciation: 0,
        macrsDepreciation: 0,
        totalDepreciation: 0,
        remainingBasis: 0
      }
    )
  }

  // ─── Part I: Election to Expense (Section 179) ───────────

  /** Line 1: Maximum amount (2025: $1,250,000) */
  l1 = (): number => 1250000

  /** Line 2: Total cost of Section 179 property placed in service */
  l2 = (): number =>
    this.currentYearAssets()
      .filter((a) => a.section179Election > 0)
      .reduce((sum, a) => sum + a.cost, 0)

  /** Line 3: Threshold cost before phase-out begins (2025: $3,130,000) */
  l3 = (): number => 3130000

  /** Line 4: Reduction in limitation (line 2 - line 3, if positive) */
  l4 = (): number => Math.max(0, this.l2() - this.l3())

  /** Line 5: Dollar limitation for tax year (line 1 - line 4, not less than zero) */
  l5 = (): number => Math.max(0, this.l1() - this.l4())

  // Lines 6a-6c: Listed property (individual assets with Section 179 elections)
  // We show up to 6 assets in the PDF fields

  /** Line 7: Listed property (simplified — included in line 2 total) */
  l7 = (): number | undefined => undefined

  /** Line 8: Total elected cost (sum of Section 179 elections) */
  l8 = (): number =>
    this.currentYearAssets().reduce((sum, a) => sum + a.section179Election, 0)

  /** Line 9: Tentative deduction (lesser of line 5 or line 8) */
  l9 = (): number => Math.min(this.l5(), this.l8())

  /** Line 10: Carryover of disallowed deduction from prior year */
  l10 = (): number => 0

  /** Line 11: Business income limitation */
  l11 = (): number => this.getBusinessIncome()

  /** Line 12: Section 179 expense deduction (lesser of line 9+10 or line 11) */
  l12 = (): number => Math.min(this.l9() + this.l10(), this.l11())

  /** Line 13: Carryover of disallowed deduction to next year */
  l13 = (): number => Math.max(0, this.l9() + this.l10() - this.l11())

  // ─── Part II: Special Depreciation Allowance (Bonus) ──────

  /** Line 14: Special depreciation allowance for qualified property */
  l14 = (): number => {
    const results = this.getResults()
    let total = 0
    const assets = this.assets()
    for (let i = 0; i < assets.length; i++) {
      const r = results.get(i)
      if (r) total += r.bonusDepreciation
    }
    return Math.round(total * 100) / 100
  }

  // ─── Part III: MACRS Depreciation ─────────────────────────

  /**
   * Line 17: MACRS deductions for assets placed in service in prior years.
   * These are assets from earlier tax years still within their recovery period.
   */
  l17 = (): number => {
    const priorAssets = this.priorYearAssets()
    let total = 0
    for (const asset of priorAssets) {
      const result = calculateDepreciation(asset, TAX_YEAR, 0)
      total += result.macrsDepreciation
    }
    return Math.round(total * 100) / 100
  }

  // Section B: Assets placed in service during current year using GDS
  // Lines 19a-19i: Individual asset entries by property class

  /**
   * Get total MACRS depreciation for current-year assets of a given property class.
   */
  private macrsForClass(propertyClass: string): {
    cost: number
    depreciation: number
  } {
    const assets = this.currentYearAssets()
    let totalCost = 0
    let totalDepr = 0
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      if (asset.propertyClass !== propertyClass) continue
      const fullIdx = this.assets().indexOf(asset)
      const r = this.resultFor(fullIdx)
      // Basis for MACRS = cost - section179 - bonus
      totalCost += asset.cost - r.section179 - r.bonusDepreciation
      totalDepr += r.macrsDepreciation
    }
    return { cost: totalCost, depreciation: totalDepr }
  }

  l19a = (): { cost: number; depreciation: number } =>
    this.macrsForClass('3-year')
  l19b = (): { cost: number; depreciation: number } =>
    this.macrsForClass('5-year')
  l19c = (): { cost: number; depreciation: number } =>
    this.macrsForClass('7-year')
  l19d = (): { cost: number; depreciation: number } =>
    this.macrsForClass('10-year')
  l19e = (): { cost: number; depreciation: number } =>
    this.macrsForClass('15-year')
  l19f = (): { cost: number; depreciation: number } =>
    this.macrsForClass('20-year')
  l19g = (): { cost: number; depreciation: number } =>
    this.macrsForClass('25-year')

  // Section C: Assets using ADS (Alternative Depreciation System) — not implemented
  // Lines 20a-20c

  /** Line 21: Listed property (from Part V) */
  l21 = (): number | undefined => undefined

  /** Line 22: Total MACRS depreciation (sum of lines 17-21) */
  l22 = (): number => {
    const currentYearMACRS = this.currentYearAssets().reduce((sum, asset) => {
      const idx = this.assets().indexOf(asset)
      return sum + this.resultFor(idx).macrsDepreciation
    }, 0)
    return (
      Math.round((this.l17() + currentYearMACRS + (this.l21() ?? 0)) * 100) /
      100
    )
  }

  // ─── Part IV: Summary ─────────────────────────────────────

  /** Line 22 total: Total depreciation (Section 179 + bonus + MACRS) */
  totalDepreciation = (): number =>
    sumFields([this.l12(), this.l14(), this.l22()])

  // ─── Part V: Listed Property ──────────────────────────────
  // Simplified: not implemented in detail

  // ─── Part VI: Amortization ────────────────────────────────
  // Not implemented

  // ─── PDF Field Mapping ────────────────────────────────────

  /** Business name for the header */
  private businessName(): string {
    const schedCInputs = this.f1040.info.scheduleCInputs
    if (this.businessIdx < schedCInputs.length) {
      return schedCInputs[this.businessIdx].businessName
    }
    return ''
  }

  /**
   * Section 179 asset entries (up to 6 rows in PDF).
   * Returns flat array: [description, cost, elected] × 6
   */
  private section179AssetFields(): Field[] {
    const assets = this.currentYearAssets().filter(
      (a) => a.section179Election > 0
    )
    const rows: Field[] = []
    for (let i = 0; i < 6; i++) {
      if (i < assets.length) {
        rows.push(
          assets[i].description,
          assets[i].cost,
          assets[i].section179Election
        )
      } else {
        rows.push(undefined, undefined, undefined)
      }
    }
    return rows
  }

  /**
   * MACRS Section B asset rows (lines 19a-19g).
   * Each row: [month/quarter, cost, recovery period, method, convention, rate, depreciation]
   */
  private macrsCurrentYearFields(): Field[] {
    const classes: [string, number, string][] = [
      ['3-year', 3, '200DB'],
      ['5-year', 5, '200DB'],
      ['7-year', 7, '200DB'],
      ['10-year', 10, '200DB'],
      ['15-year', 15, '150DB'],
      ['20-year', 20, '150DB'],
      ['25-year', 25, 'SL']
    ]

    const rows: Field[] = []
    for (const [cls, period, method] of classes) {
      const data = this.macrsForClass(cls)
      if (data.cost > 0) {
        rows.push(
          data.cost, // basis
          period, // recovery period
          method, // method
          'HY', // convention (default half-year)
          data.depreciation // depreciation
        )
      } else {
        rows.push(undefined, undefined, undefined, undefined, undefined)
      }
    }
    return rows
  }

  /**
   * Real property rows (lines 19h-19i) for 27.5-year and 39-year property.
   * Each row: [month placed, cost, recovery period, method, convention, depreciation]
   */
  private realPropertyFields(): Field[] {
    const residentialData = this.macrsForClass('27.5-year')
    const nonresidentialData = this.macrsForClass('39-year')

    return [
      // 27.5-year residential rental
      residentialData.cost > 0 ? residentialData.cost : undefined,
      residentialData.cost > 0 ? 27.5 : undefined,
      residentialData.cost > 0 ? 'SL' : undefined,
      residentialData.cost > 0 ? 'MM' : undefined,
      residentialData.cost > 0 ? residentialData.depreciation : undefined,
      // 39-year nonresidential real property
      nonresidentialData.cost > 0 ? nonresidentialData.cost : undefined,
      nonresidentialData.cost > 0 ? 39 : undefined,
      nonresidentialData.cost > 0 ? 'SL' : undefined,
      nonresidentialData.cost > 0 ? 'MM' : undefined,
      nonresidentialData.cost > 0 ? nonresidentialData.depreciation : undefined
    ]
  }

  fields = (): Field[] => [
    // Header
    this.f1040.namesString(),
    this.businessName(),
    this.f1040.info.taxPayer.primaryPerson.ssid,

    // Part I: Election to Expense (Section 179)
    this.l1(),
    this.l2(),
    this.l3(),
    this.l4(),
    this.l5(),
    // Lines 6a-6c: Section 179 asset entries (description, cost, elected × 6)
    ...this.section179AssetFields(),
    this.l7(),
    this.l8(),
    this.l9(),
    this.l10(),
    this.l11(),
    this.l12(),
    this.l13(),

    // Part II: Special Depreciation Allowance
    this.l14(),

    // Part III: MACRS Depreciation
    // Line 17: Prior year assets
    this.l17(),
    // Section B: Current year GDS (lines 19a-19g) — 7 rows × 5 fields each
    ...this.macrsCurrentYearFields(),
    // Lines 19h-19i: Real property — 2 rows × 5 fields each
    ...this.realPropertyFields(),
    // Section C: ADS (lines 20a-20c) — not implemented
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    // Line 21: Listed property
    this.l21(),
    // Line 22: Total
    this.l22(),

    // Part IV: Summary
    this.totalDepreciation()
  ]
}
