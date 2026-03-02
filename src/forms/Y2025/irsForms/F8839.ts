import F1040Attachment from './F1040Attachment'
import { AdoptionChild, F8839Input } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 8839 - Qualified Adoption Expenses
 *
 * Three-part form:
 *   Part I:   Maximum Adoption Credit Allowable (per child)
 *   Part II:  Adoption Credit (per child rows + combined credit computation)
 *   Part III: Employer-Provided Adoption Benefits (per child rows + exclusion)
 *
 * 2025 indexed amounts per IRS Rev. Proc. 2024-40.
 */

// Maximum adoption credit / maximum employer-provided benefits per child (2025)
const MAX_CREDIT_PER_CHILD = 17280

// MAGI phase-out start for 2025 (same for all filing statuses)
const PHASE_OUT_START = 239230

// MAGI phase-out range (same for credit and employer benefits)
const PHASE_OUT_RANGE = 40000

export default class F8839 extends F1040Attachment {
  tag: FormTag = 'f8839'
  sequenceIndex = 38

  private get input(): F8839Input | undefined {
    return this.f1040.info.f8839Input
  }

  private get children(): AdoptionChild[] {
    return this.input?.adoptions ?? []
  }

  // ─── Part I: Maximum Adoption Credit Allowable ───────────────────────────

  /**
   * Part I, Column (e): Maximum credit for a given child.
   * Always $17,280; special-needs children can claim this regardless of expenses.
   */
  partIColE = (_child: AdoptionChild): number => MAX_CREDIT_PER_CHILD

  // ─── Part II: Adoption Credit ────────────────────────────────────────────

  /**
   * Part II, Row 1 (per child): Maximum adoption credit from Part I col (e).
   */
  partIIRow1 = (child: AdoptionChild): number => this.partIColE(child)

  /**
   * Part II, Row 2 (per child): Qualifying adoption expenses paid.
   * For special-needs children the full max credit amount is treated as
   * qualifying expenses (IRC §23(d)(3)), so even $0 actual expenses qualifies.
   */
  partIIRow2 = (child: AdoptionChild): number =>
    child.isSpecialNeeds ? MAX_CREDIT_PER_CHILD : child.qualifyingExpenses

  /**
   * Part II, Row 3 (per child): Employer-provided adoption benefits already
   * excluded from income for this child (= Part III, Row 5 per child).
   * These reduce the credit base to prevent double benefit.
   */
  partIIRow3 = (child: AdoptionChild): number => this.partIIIRow5(child)

  /**
   * Part II, Row 4 (per child): Qualifying expenses minus excluded
   * employer benefits (floor at 0).
   */
  partIIRow4 = (child: AdoptionChild): number =>
    Math.max(0, this.partIIRow2(child) - this.partIIRow3(child))

  /**
   * Part II, Row 5 (per child): Allowable credit before phase-out —
   * smaller of Row 1 (max credit) or Row 4 (net qualifying expenses).
   */
  partIIRow5 = (child: AdoptionChild): number =>
    Math.min(this.partIIRow1(child), this.partIIRow4(child))

  /**
   * Part II, Line 6: Total net qualifying adoption expenses for all children.
   */
  l6 = (): number =>
    this.children.reduce((sum, c) => sum + this.partIIRow5(c), 0)

  /**
   * Part II, Line 7: Modified AGI.
   * For most taxpayers this equals Form 1040 line 11 (AGI).
   */
  l7 = (): number => this.f1040.l11()

  /**
   * Part II, Line 8: Phase-out threshold ($239,230 for 2025).
   */
  l8 = (): number => PHASE_OUT_START

  /**
   * Part II, Line 9: Excess MAGI above phase-out start (floor at 0).
   */
  l9 = (): number => Math.max(0, this.l7() - this.l8())

  /**
   * Part II, Line 10: Phase-out ratio (Line 9 ÷ $40,000, three decimal places,
   * capped at 1.000 when MAGI ≥ $279,230).
   */
  l10 = (): number =>
    Math.min(1, Math.round((this.l9() / PHASE_OUT_RANGE) * 1000) / 1000)

  /**
   * Part II, Line 11: Credit reduction due to phase-out.
   */
  l11 = (): number => this.l6() * this.l10()

  /**
   * Part II, Line 12: Allowable credit this year (before carryforward).
   * Line 6 − Line 11.
   */
  l12 = (): number => this.l6() - this.l11()

  /**
   * Part II, Line 13: Prior year adoption credit carryforward.
   */
  l13 = (): number => this.input?.priorYearCreditCarryforward ?? 0

  /**
   * Part II, Line 14: Total credit available (current + carryforward).
   */
  l14 = (): number => this.l12() + this.l13()

  /**
   * Part II, Line 15: Tax liability limitation (Credit Limit Worksheet).
   *
   * Computes: tax (Form 1040 line 18) minus nonrefundable credits that appear
   * before the adoption credit on Schedule 3 (lines 1–5 and line 6a).
   */
  l15 = (): number => {
    const tax = this.f1040.l18()
    const priorSchedule3Credits = sumFields([
      this.f1040.schedule3.l1(), // Foreign tax credit
      this.f1040.schedule3.l2(), // Child and dependent care
      this.f1040.schedule3.l3(), // Education credits
      this.f1040.schedule3.l4(), // Retirement savings (Form 8880)
      this.f1040.schedule3.l5(), // Residential clean energy (Form 5695)
      this.f1040.schedule3.l6a() // Elderly or disabled (Schedule R)
    ])
    return Math.max(0, tax - priorSchedule3Credits)
  }

  /**
   * Part II, Line 16: Adoption credit for this year — smaller of Line 14
   * (available credit) or Line 15 (tax limitation).
   * This amount flows to Schedule 3, line 6b.
   */
  l16 = (): number => Math.min(this.l14(), this.l15())

  // ─── Part III: Employer-Provided Adoption Benefits ───────────────────────

  /**
   * Part III, Row 1 (per child): Maximum employer-provided adoption benefits
   * per child (same limit as adoption credit).
   */
  partIIIRow1 = (_child: AdoptionChild): number => MAX_CREDIT_PER_CHILD

  /**
   * Part III, Row 2 (per child): Total employer-provided adoption benefits
   * received for this child (attributed from W-2 Box 12, Code T).
   */
  partIIIRow2 = (child: AdoptionChild): number => child.employerBenefitsReceived

  /**
   * Part III, Row 3 (per child): Employer-provided benefits excluded from
   * income in prior tax years for this child.
   */
  partIIIRow3 = (child: AdoptionChild): number =>
    child.priorYearEmployerBenefitsExcluded

  /**
   * Part III, Row 4 (per child): Benefits not yet excluded from income.
   * Row 2 − Row 3 (floor at 0).
   */
  partIIIRow4 = (child: AdoptionChild): number =>
    Math.max(0, this.partIIIRow2(child) - this.partIIIRow3(child))

  /**
   * Part III, Row 5 (per child): Benefits to potentially exclude —
   * smaller of Row 1 (max) or Row 4 (new benefits not yet excluded).
   * This value also feeds Part II, Row 3 for this child.
   */
  partIIIRow5 = (child: AdoptionChild): number =>
    Math.min(this.partIIIRow1(child), this.partIIIRow4(child))

  /**
   * Part III, Line 6: Total employer-provided adoption benefits to evaluate.
   */
  partIIIL6 = (): number =>
    this.children.reduce((sum, c) => sum + this.partIIIRow5(c), 0)

  /**
   * Part III, Line 7: Modified AGI (same as Part II, Line 7).
   */
  partIIIL7 = (): number => this.l7()

  /**
   * Part III, Line 8: Phase-out threshold (same as Part II, Line 8).
   */
  partIIIL8 = (): number => PHASE_OUT_START

  /**
   * Part III, Line 9: Excess MAGI above phase-out start.
   */
  partIIIL9 = (): number => Math.max(0, this.partIIIL7() - this.partIIIL8())

  /**
   * Part III, Line 10: Phase-out ratio for employer benefits.
   */
  partIIIL10 = (): number =>
    Math.min(1, Math.round((this.partIIIL9() / PHASE_OUT_RANGE) * 1000) / 1000)

  /**
   * Part III, Line 11: Employer benefits reduction due to phase-out.
   */
  partIIIL11 = (): number => this.partIIIL6() * this.partIIIL10()

  /**
   * Part III, Line 12: Excludable employer-provided adoption benefits after
   * phase-out. This amount can be excluded from gross income.
   */
  partIIIL12 = (): number => this.partIIIL6() - this.partIIIL11()

  // ─── Required overrides ──────────────────────────────────────────────────

  isNeeded = (): boolean =>
    this.children.length > 0 &&
    (this.l16() > 0 || this.partIIIL12() > 0 || this.l13() > 0)

  fields = (): Field[] => {
    const childFields = this.children.flatMap((child) => [
      child.childName,
      child.yearOfBirth,
      child.isSpecialNeeds,
      child.isForeignAdoption,
      this.partIColE(child),
      this.partIIRow2(child),
      this.partIIRow3(child),
      this.partIIRow4(child),
      this.partIIRow5(child)
    ])

    return [
      this.f1040.namesString(),
      this.f1040.info.taxPayer.primaryPerson.ssid,
      ...childFields,
      this.l6(),
      this.l7(),
      this.l8(),
      this.l9(),
      this.l10(),
      this.l11(),
      this.l12(),
      this.l13(),
      this.l14(),
      this.l15(),
      this.l16()
    ]
  }
}
