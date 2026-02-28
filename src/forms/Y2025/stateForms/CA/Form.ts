import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { StateF1040 } from '../types'
import parameters from './Parameters'

export class CAForm extends StateFormBase {
  f1040: StateF1040
  state: State = 'CA'
  formName = 'CA-540'
  formOrder = 0

  constructor(f1040: StateF1040) {
    super(f1040.info)
    this.f1040 = f1040
  }

  attachments = (): Form[] => []

  federalAGI = (): number => this.f1040.l11()

  stateStandardDeduction = (): number =>
    parameters.standardDeduction[this.filingStatus()] ??
    parameters.standardDeduction[FilingStatus.S]

  /**
   * CA tax = progressive bracket tax + Mental Health Services Tax.
   * MHST is a 1% surcharge on taxable income exceeding $1,000,000.
   */
  stateTax = (): number => {
    const income = this.stateTaxableIncome()
    const brackets =
      parameters.brackets[this.filingStatus()] ??
      parameters.brackets[FilingStatus.S]
    const bracketTax = computeBracketTax(brackets, income)

    const mhstExcess = Math.max(
      0,
      income - parameters.mentalHealthServicesThreshold
    )
    const mhst = mhstExcess * parameters.mentalHealthServicesRate

    return bracketTax + mhst
  }

  /**
   * CA Renter's Credit: nonrefundable credit for qualifying renters.
   * $60 for single/HOH/QW, $120 for MFJ. AGI limits apply.
   * Not available to MFS filers.
   */
  renterCredit = (): number => {
    const caInput = this.info.caStateInput
    if (!caInput?.isRenter) return 0

    const fs = this.filingStatus()
    if (fs === FilingStatus.MFS) return 0

    const agi = this.federalAGI()
    const limit = parameters.renterCreditAGILimit[fs]
    if (agi > limit) return 0

    if (fs === FilingStatus.MFJ || fs === FilingStatus.W) {
      return parameters.renterCreditJoint
    }
    return parameters.renterCreditSingle
  }

  /**
   * CA Child and Dependent Care Expenses Credit.
   * Based on qualifying care expenses from CA state input or federal Form 2441.
   * Simplified: CA credit percentage is approximately 50% of the federal
   * credit percentage for most filers (up to 50% of expenses, capped).
   */
  childDependentCareCredit = (): number => {
    const caInput = this.info.caStateInput
    const form2441 = this.info.form2441Input

    // Use CA-specific override if provided, otherwise sum from Form 2441
    let expenses = caInput?.qualifyingCareExpenses ?? 0
    if (expenses === 0 && form2441) {
      expenses = form2441.careExpenses.reduce((sum, e) => sum + e.amount, 0)
    }
    if (expenses <= 0) return 0

    const numDependents = Math.min(
      this.info.taxPayer.dependents.length,
      parameters.childCareMaxChildren
    )
    if (numDependents === 0) return 0

    const maxExpenses = numDependents * parameters.childCareExpenseLimit
    const eligibleExpenses = Math.min(expenses, maxExpenses)

    // CA credit rate: simplified to a flat percentage for initial implementation.
    // The actual CA Schedule (FTB 3506) uses a sliding scale based on federal AGI.
    // Using a conservative 34% rate (minimum CA percentage).
    const caRate = 0.34
    return Math.round(eligibleExpenses * caRate)
  }

  /**
   * Total SDI withheld from W-2s for CA.
   * SDI (State Disability Insurance) reported in W-2 Box 14.
   */
  sdiWithholding = (): number =>
    this.methods
      .stateW2s()
      .reduce((total, w2) => total + (w2.sdiWithholding ?? 0), 0)

  /**
   * Personal exemption credit + renter's credit + child/dependent care credit.
   */
  stateCredits = (): number => {
    const base = 1
    const spouse = this.info.taxPayer.spouse ? 1 : 0
    const dependents = this.info.taxPayer.dependents.length
    const personalExemption =
      (base + spouse + dependents) * parameters.personalExemptionCredit

    return sumFields([
      personalExemption,
      this.renterCredit(),
      this.childDependentCareCredit()
    ])
  }

  /**
   * Total payments: state income tax withholding + SDI withholding.
   * CA treats SDI as a payment that reduces tax owed.
   */
  totalPayments = (): number =>
    sumFields([
      this.stateWithholding(),
      this.sdiWithholding(),
      this.stateEstimatedPayments()
    ])

  fields = (): Field[] => [
    this.federalAGI(),
    this.stateStandardDeduction(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.stateCredits(),
    this.taxAfterCredits(),
    this.stateWithholding(),
    this.sdiWithholding(),
    this.refundAmount(),
    this.amountOwed()
  ]
}

const makeCAForm = (f1040: StateF1040): CAForm => new CAForm(f1040)

export default makeCAForm
