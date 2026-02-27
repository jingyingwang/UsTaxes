import F1040Attachment from './F1040Attachment'
import F1040 from './F1040'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { HomeOfficeInput } from 'ustaxes/core/data'

/**
 * IRS Form 8829 — Expenses for Business Use of Your Home
 *
 * Calculates the home office deduction using either the Regular or Simplified method.
 *
 * Regular method: Actual home expenses prorated by business-use percentage
 * (office sqft / total sqft). Limited to gross income from business minus
 * other business expenses. Unused deduction carries forward.
 *
 * Simplified method: $5 per square foot of home used for business,
 * maximum 300 sqft = $1,500 maximum deduction.
 *
 * The resulting deduction flows to Schedule C line 30.
 */
export default class F8829 extends F1040Attachment {
  tag: FormTag = 'f8829'
  sequenceIndex = 66

  private businessIdx: number
  private _input: HomeOfficeInput | undefined | null = null

  constructor(f1040: F1040, businessIndex = 0) {
    super(f1040)
    this.businessIdx = businessIndex
  }

  // ─── Input helpers ────────────────────────────────────────

  private input(): HomeOfficeInput | undefined {
    if (this._input !== null) return this._input ?? undefined
    this._input =
      this.f1040.info.homeOfficeInputs.find(
        (h) => h.businessIndex === this.businessIdx
      ) ?? undefined
    return this._input
  }

  isNeeded = (): boolean => this.input() !== undefined

  copies = (): F8829[] => {
    const allInputs = this.f1040.info.homeOfficeInputs
    const indices = new Set(allInputs.map((h) => h.businessIndex))
    return Array.from(indices)
      .filter((i) => i !== this.businessIdx)
      .map((i) => new F8829(this.f1040, i))
  }

  // ─── Simplified Method ────────────────────────────────────

  /**
   * Simplified method: $5 per sqft, max 300 sqft = $1,500
   */
  simplifiedDeduction(): number {
    const inp = this.input()
    if (!inp) return 0
    const sqft = Math.min(inp.officeSquareFootage, 300)
    return sqft * 5
  }

  // ─── Part I: Part of Your Home Used for Business ──────────

  /** Line 1: Area used regularly and exclusively for business */
  l1 = (): number => this.input()?.officeSquareFootage ?? 0

  /** Line 2: Total area of home */
  l2 = (): number => this.input()?.totalHomeSquareFootage ?? 1

  /** Line 3: Business percentage (line 1 / line 2, but not more than 100%) */
  l3 = (): number => {
    const pct = this.l1() / this.l2()
    return Math.min(pct, 1)
  }

  // ─── Part II: Figure Your Allowable Deduction ─────────────

  /**
   * Line 8: Tentative profit from Schedule C
   * This is Schedule C net income before the home office deduction.
   */
  l8 = (): number => {
    const inputs = this.f1040.info.scheduleCInputs
    if (this.businessIdx < inputs.length) {
      const sc = inputs[this.businessIdx]
      const totalExpenses = Object.values(sc.expenses).reduce(
        (sum, v) => sum + v,
        0
      )
      const cogs =
        sc.beginningInventory +
        sc.purchases +
        sc.costOfLabor +
        sc.materialsAndSupplies +
        sc.otherCosts -
        sc.endingInventory
      return Math.max(
        0,
        sc.grossReceipts - sc.returns + sc.otherIncome - cogs - totalExpenses
      )
    }
    return 0
  }

  // Casualty losses and direct deductible amounts (lines 9-10)
  /** Line 9: Casualty losses (from Form 4684) */
  l9 = (): number => 0

  /** Line 10: Deductible mortgage interest (direct + indirect × business %) */
  l10 = (): number => {
    const inp = this.input()
    if (!inp) return 0
    return inp.directMortgageInterest + inp.indirectMortgageInterest * this.l3()
  }

  /** Line 11: Real estate taxes (direct + indirect × business %) */
  l11 = (): number => {
    const inp = this.input()
    if (!inp) return 0
    return inp.directRealEstateTaxes + inp.indirectRealEstateTaxes * this.l3()
  }

  /** Line 12: Total of lines 9-11 */
  l12 = (): number => sumFields([this.l9(), this.l10(), this.l11()])

  /** Line 13: Tentative profit minus casualty and deductible amounts */
  l13 = (): number => Math.max(0, this.l8() - this.l12())

  // Lines 14-21: Other expenses (indirect × business %)
  /** Line 14: Excess mortgage interest (not applicable in simplified flow) */
  l14 = (): number => 0

  /** Line 15: Insurance */
  l15 = (): number => (this.input()?.indirectInsurance ?? 0) * this.l3()

  /** Line 16: Rent */
  l16 = (): number => (this.input()?.indirectRent ?? 0) * this.l3()

  /** Line 17: Repairs and maintenance */
  l17 = (): number => (this.input()?.indirectRepairs ?? 0) * this.l3()

  /** Line 18: Utilities */
  l18 = (): number => (this.input()?.indirectUtilities ?? 0) * this.l3()

  /** Line 19: Other expenses */
  l19 = (): number => (this.input()?.indirectOtherExpenses ?? 0) * this.l3()

  /** Line 20: Total of lines 14-19 */
  l20 = (): number =>
    sumFields([this.l14(), this.l15(), this.l16(), this.l17(), this.l18(), this.l19()])

  /** Line 21: Allowable operating expenses (lesser of line 13 or line 20) */
  l21 = (): number => Math.min(this.l13(), this.l20())

  // ─── Part III: Depreciation of Your Home ──────────────────

  /** Line 22: Limit on excess casualty + operating expenses */
  l22 = (): number => Math.max(0, this.l13() - this.l21())

  /** Line 23: Excess casualty losses (from Part II) */
  l23 = (): number => 0

  /** Line 24: Depreciation basis = (cost - land value) × business % */
  l24 = (): number => {
    const inp = this.input()
    if (!inp) return 0
    return Math.max(0, inp.homeCostOrBasis - inp.homeValueOfLand) * this.l3()
  }

  /**
   * Line 25: Depreciation percentage.
   * Residential property uses 39-year straight-line = 2.564% per year.
   * (First/last year prorated by month, but we use full-year rate for simplicity.)
   */
  l25 = (): number => 2.564

  /** Line 26: Depreciation allowable (line 24 × line 25 / 100) */
  l26 = (): number =>
    Math.round(this.l24() * this.l25()) / 100

  /** Line 27: Allowable depreciation (lesser of line 22 or line 26) */
  l27 = (): number => Math.min(this.l22(), this.l26())

  // ─── Part IV: Carryover and Allowable Deduction ───────────

  /** Line 28: Add lines 12, 21, and 27 */
  l28 = (): number => sumFields([this.l12(), this.l21(), this.l27()])

  /** Line 29: Carryover of unallowed expenses from prior year */
  l29 = (): number => this.input()?.carryoverFromPriorYear ?? 0

  /** Line 30: Total (line 28 + line 29) */
  l30 = (): number => this.l28() + this.l29()

  /** Line 31: Tentative profit limit for total deduction */
  l31 = (): number => this.l8()

  /**
   * Line 32: Allowable expenses for business use of home
   * Lesser of line 30 or line 31.
   * This is the deduction that flows to Schedule C line 30.
   */
  l32 = (): number => Math.min(this.l30(), this.l31())

  /** Line 33: Carryover to next year */
  l33 = (): number => Math.max(0, this.l30() - this.l32())

  // ─── Deduction for Schedule C ─────────────────────────────

  /**
   * The deduction amount for Schedule C line 30.
   * Uses simplified method if elected, otherwise regular method.
   */
  deduction(): number {
    const inp = this.input()
    if (!inp) return 0
    if (inp.method === 'simplified') {
      return this.simplifiedDeduction()
    }
    return Math.round(this.l32())
  }

  /**
   * Carryover to next year (only applicable for regular method).
   */
  carryover(): number {
    const inp = this.input()
    if (!inp || inp.method === 'simplified') return 0
    return Math.round(this.l33())
  }

  // ─── PDF Field Mapping ────────────────────────────────────

  private businessName(): string {
    const inputs = this.f1040.info.scheduleCInputs
    if (this.businessIdx < inputs.length) {
      return inputs[this.businessIdx].businessName
    }
    return ''
  }

  fields = (): Field[] => {
    const inp = this.input()
    const isSimplified = inp?.method === 'simplified'

    return [
      // Header
      this.f1040.namesString(),
      this.f1040.info.taxPayer.primaryPerson.ssid,

      // Part I
      this.l1(),
      this.l2(),
      isSimplified ? undefined : Math.round(this.l3() * 10000) / 100, // Display as percentage

      // Simplified method
      isSimplified,
      isSimplified ? this.simplifiedDeduction() : undefined,

      // Part II (Regular method only)
      ...(isSimplified
        ? Array(25).fill(undefined)
        : [
            this.l8(),
            this.l9(),
            this.l10(),
            this.l11(),
            this.l12(),
            this.l13(),
            this.l14(),
            this.l15(),
            this.l16(),
            this.l17(),
            this.l18(),
            this.l19(),
            this.l20(),
            this.l21(),
            // Part III
            this.l22(),
            this.l23(),
            this.l24(),
            this.l25(),
            Math.round(this.l26()),
            Math.round(this.l27()),
            // Part IV
            Math.round(this.l28()),
            this.l29(),
            Math.round(this.l30()),
            Math.round(this.l31()),
            Math.round(this.l32())
          ]),

      // Carryover
      isSimplified ? undefined : Math.round(this.l33()),

      // Business name / activity
      this.businessName()
    ]
  }
}
