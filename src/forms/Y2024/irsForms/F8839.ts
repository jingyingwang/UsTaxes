import F1040Attachment from './F1040Attachment'
import {
  AdoptionCreditInput,
  FilingStatus,
  W2Box12Code
} from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import F1040 from './F1040'

// 2024 tax year constants for Form 8839
const MAX_CREDIT_PER_CHILD = 16810
const PHASE_OUT_START: { [key in FilingStatus]: number } = {
  [FilingStatus.S]: 252150,
  [FilingStatus.MFJ]: 252150,
  [FilingStatus.MFS]: 252150,
  [FilingStatus.HOH]: 252150,
  [FilingStatus.W]: 252150
}
const PHASE_OUT_RANGE = 40000

/**
 * Form 8839 - Qualified Adoption Expenses
 *
 * Computes the nonrefundable adoption credit (up to $16,810 per child for 2024).
 * The credit phases out for MAGI between $252,150 and $292,150.
 *
 * Flows to Schedule 3, Line 6c.
 */
export default class F8839 extends F1040Attachment {
  tag: FormTag = 'f8839'
  sequenceIndex = 38

  adoptionInputs: AdoptionCreditInput[]

  constructor(f1040: F1040) {
    super(f1040)
    this.adoptionInputs = f1040.info.adoptionCreditInputs ?? []
  }

  isNeeded = (): boolean => this.adoptionInputs.length > 0

  // Modified AGI for phase-out purposes.
  // For Form 8839, MAGI = AGI (line 11) + foreign earned income exclusion.
  // Since this codebase doesn't track foreign exclusions separately, use AGI.
  magi = (): number => this.f1040.l11()

  // Employer-provided adoption benefits from W-2 Box 12 Code T
  employerBenefits = (): number =>
    this.f1040
      .validW2s()
      .reduce((total, w2) => total + (w2.box12?.[W2Box12Code.T] ?? 0), 0)

  // Phase-out ratio: reduces credit for high-income taxpayers
  phaseOutRatio = (): number => {
    const magi = this.magi()
    const filingStatus = this.f1040.info.taxPayer.filingStatus
    const start = PHASE_OUT_START[filingStatus]
    const end = start + PHASE_OUT_RANGE

    if (magi <= start) return 1
    if (magi >= end) return 0
    return 1 - (magi - start) / PHASE_OUT_RANGE
  }

  // Per-child credit calculation
  creditPerChild = (input: AdoptionCreditInput): number => {
    // Line 1: Maximum adoption credit
    const maxCredit = MAX_CREDIT_PER_CHILD

    // Line 2: Qualified adoption expenses
    const expenses = input.qualifiedExpenses

    // Line 3: Smaller of line 1 or line 2
    const smallerOfMaxOrExpenses = Math.min(maxCredit, expenses)

    // Subtract employer-provided benefits allocated to this child
    // (simplified: total employer benefits divided equally among children)
    const employerBenefitsPerChild =
      this.adoptionInputs.length > 0
        ? this.employerBenefits() / this.adoptionInputs.length
        : 0
    const netCredit = Math.max(
      0,
      smallerOfMaxOrExpenses - employerBenefitsPerChild
    )

    // Add prior year carryforward
    const withCarryforward = netCredit + input.priorYearCarryforward

    // Apply phase-out
    return Math.round(withCarryforward * this.phaseOutRatio() * 100) / 100
  }

  // Total adoption credit (sum across all children)
  totalCredit = (): number =>
    this.adoptionInputs.reduce(
      (sum, input) => sum + this.creditPerChild(input),
      0
    )

  // Line flowing to Schedule 3, Line 6c
  toSchedule3L6c = (): number | undefined =>
    this.isNeeded() ? this.totalCredit() : undefined

  fields = (): Field[] => {
    // Map up to 3 children into the PDF fields
    const childFields = (idx: number): Field[] => {
      const input = this.adoptionInputs[idx]
      if (!input) {
        return [
          '',
          '',
          '',
          false,
          false,
          false,
          undefined,
          undefined,
          undefined
        ]
      }
      return [
        `${input.childFirstName} ${input.childLastName}`,
        input.childSSN,
        input.yearOfBirth,
        input.isDisabled,
        input.isForeignChild,
        input.adoptionFinalized,
        input.qualifiedExpenses,
        this.creditPerChild(input),
        input.priorYearCarryforward
      ]
    }

    return [
      this.f1040.namesString(),
      this.f1040.info.taxPayer.primaryPerson.ssid,
      ...childFields(0),
      ...childFields(1),
      ...childFields(2),
      this.totalCredit(),
      this.magi(),
      this.phaseOutRatio() < 1,
      sumFields([this.totalCredit()])
    ]
  }
}
