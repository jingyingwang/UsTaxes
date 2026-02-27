import { NOLCarryforward } from 'ustaxes/core/data'
import F1040 from '../F1040'

/**
 * NOL Deduction Worksheet
 *
 * Computes the allowable NOL deduction for the current tax year.
 *
 * Post-TCJA rules (NOLs from 2018+):
 *   - Can only offset 80% of taxable income (before the NOL deduction)
 *   - Carry forward indefinitely
 *   - No carryback (except farming losses, not handled here)
 *
 * Pre-TCJA rules (NOLs from 2017 and earlier):
 *   - Can offset 100% of taxable income
 *   - Used before post-TCJA NOLs (oldest first within each group)
 *
 * The NOL deduction flows to Schedule 1, line 8a as a negative number,
 * which reduces total income on Form 1040.
 *
 * CIRCULARITY: The F1040 computation graph has many paths that
 * ultimately reach Schedule 1 l8a (e.g., StudentLoanInterest uses l9,
 * ScheduleA uses l11, etc). Instead of trying to find "safe" methods,
 * we break the cycle with memoization: allowableDeduction() initially
 * returns 0, so any recursive call through l8a sees "no NOL deduction",
 * which is exactly the "before NOL" semantics we need.
 */
export default class NOLDeductionWorksheet {
  f1040: F1040
  nolCarryforwards: NOLCarryforward[]
  private _computing = false
  private _deduction: number | undefined = undefined

  constructor(f1040: F1040) {
    this.f1040 = f1040
    this.nolCarryforwards = [
      ...(f1040.info.netOperatingLossCarryforwards ?? [])
    ].sort((a, b) => a.year - b.year)
  }

  /** Whether this worksheet is needed (has NOL carryforwards to apply) */
  isNeeded = (): boolean =>
    this.nolCarryforwards.length > 0 &&
    this.nolCarryforwards.some((n) => n.amount > 0)

  /** Total NOL carryforwards available from all years */
  totalAvailableNOL = (): number =>
    this.nolCarryforwards.reduce((sum, n) => sum + n.amount, 0)

  /** Pre-TCJA NOLs (from 2017 and earlier) — offset 100% of taxable income */
  preTCJANOLs = (): NOLCarryforward[] =>
    this.nolCarryforwards.filter((n) => n.year <= 2017 && n.amount > 0)

  /** Post-TCJA NOLs (from 2018+) — limited to 80% of taxable income */
  postTCJANOLs = (): NOLCarryforward[] =>
    this.nolCarryforwards.filter((n) => n.year >= 2018 && n.amount > 0)

  totalPreTCJANOL = (): number =>
    this.preTCJANOLs().reduce((sum, n) => sum + n.amount, 0)

  totalPostTCJANOL = (): number =>
    this.postTCJANOLs().reduce((sum, n) => sum + n.amount, 0)

  /**
   * Taxable income before NOL deduction.
   *
   * This calls f1040.l15() which is "taxable income" on Form 1040.
   * During our computation, l8a() returns undefined (via _computing guard),
   * so l9/l11/l15 all compute as if there were no NOL — exactly what we need.
   */
  taxableIncomeBeforeNOL = (): number => this.f1040.l15()

  /**
   * Pre-TCJA NOL deduction: can offset up to 100% of taxable income.
   * Applied first, oldest year first.
   */
  preTCJADeduction = (): number => {
    const taxableIncome = this.taxableIncomeBeforeNOL()
    return Math.min(this.totalPreTCJANOL(), taxableIncome)
  }

  /**
   * Remaining taxable income after pre-TCJA NOL deduction.
   */
  remainingTaxableIncome = (): number =>
    Math.max(0, this.taxableIncomeBeforeNOL() - this.preTCJADeduction())

  /**
   * Post-TCJA NOL deduction: limited to 80% of taxable income
   * before the NOL deduction (per IRC §172(a)(2)).
   */
  postTCJADeduction = (): number => {
    const taxableIncome = this.taxableIncomeBeforeNOL()
    const eightyPercentLimit = Math.floor(taxableIncome * 0.8)
    // Post-TCJA NOLs are limited to 80% of taxable income (before NOL),
    // reduced by any pre-TCJA NOLs already applied
    const remainingLimit = Math.max(
      0,
      eightyPercentLimit - this.preTCJADeduction()
    )
    return Math.min(this.totalPostTCJANOL(), remainingLimit)
  }

  /**
   * Total allowable NOL deduction for this tax year.
   * This is reported as a negative number on Schedule 1, line 8a.
   *
   * Uses a re-entrancy guard: during computation, returns 0 so that
   * any recursive call through the F1040 graph (e.g., l9 → l8a → here)
   * sees "no NOL deduction", computing taxable income without the NOL.
   */
  allowableDeduction = (): number => {
    // Return cached result if already computed
    if (this._deduction !== undefined) return this._deduction

    // During computation, return 0 to break recursive calls.
    // This means l8a() returns undefined during our computation,
    // so the F1040 graph computes "income without NOL".
    if (this._computing) return 0
    this._computing = true

    try {
      this._deduction = this.preTCJADeduction() + this.postTCJADeduction()
      return this._deduction
    } finally {
      this._computing = false
    }
  }

  /**
   * Remaining NOL carryforwards after applying this year's deduction.
   * Returns updated carryforward entries for tracking purposes.
   * Consumes oldest NOLs first within each group (pre/post TCJA).
   */
  remainingCarryforwards = (): NOLCarryforward[] => {
    let preTCJAUsed = this.preTCJADeduction()
    let postTCJAUsed = this.postTCJADeduction()

    return this.nolCarryforwards
      .map((nol) => {
        if (nol.year <= 2017 && preTCJAUsed > 0) {
          const used = Math.min(nol.amount, preTCJAUsed)
          preTCJAUsed -= used
          return { ...nol, amount: nol.amount - used }
        }
        if (nol.year >= 2018 && postTCJAUsed > 0) {
          const used = Math.min(nol.amount, postTCJAUsed)
          postTCJAUsed -= used
          return { ...nol, amount: nol.amount - used }
        }
        return nol
      })
      .filter((nol) => nol.amount > 0)
  }
}
