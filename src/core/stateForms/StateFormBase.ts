import Form, { FormMethods } from './Form'
import { Field } from '../pdfFiller'
import { FilingStatus, State } from '../data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import { BracketsByStatus, computeTax, TaxBracket } from './stateBrackets'

/**
 * Standard deduction amounts by filing status.
 */
export type DeductionsByStatus = {
  [K in FilingStatus]: number
}

/**
 * Configuration for a progressive-tax state form.
 */
export interface ProgressiveStateConfig {
  state: State
  formName: string
  brackets: BracketsByStatus
  standardDeduction: DeductionsByStatus
  personalExemption: number
  dependentExemption: number
}

/**
 * Minimal interface for the federal F1040 that StateFormBase depends on.
 * Satisfied by any year-specific F1040 class.
 */
export interface F1040Like {
  info: ValidatedInformation
  l11: () => number | undefined
}

/**
 * Concrete form for states with progressive income tax brackets.
 *
 * Flow: federal AGI → state adjustments → deductions/exemptions →
 *       taxable income → progressive bracket tax → credits → owed/refund.
 */
export default class StateFormBase extends Form {
  info: ValidatedInformation
  f1040: F1040Like
  methods: FormMethods
  formOrder = 0
  _state: State
  _formName: string
  config: ProgressiveStateConfig

  get state(): State {
    return this._state
  }

  get formName(): string {
    return this._formName
  }

  constructor(f1040: F1040Like, config: ProgressiveStateConfig) {
    super()
    this.info = f1040.info
    this.f1040 = f1040
    this.config = config
    this._state = config.state
    this._formName = config.formName
    this.methods = new FormMethods(this)
  }

  attachments = (): Form[] => []

  // ── Line item calculations ──────────────────────────────────

  federalAGI = (): number => this.f1040.l11() ?? 0

  stateAdditions = (): number => 0

  stateSubtractions = (): number => 0

  adjustedIncome = (): number =>
    Math.max(
      0,
      this.federalAGI() + this.stateAdditions() - this.stateSubtractions()
    )

  standardDeductionAmount = (): number =>
    this.config.standardDeduction[this.info.taxPayer.filingStatus] ?? 0

  exemptionCount = (): number => {
    let count = 1
    // MFJ and W (qualifying widow/er) count both spouses on one return.
    // MFS files individually — only one exemption per return.
    if (
      this.info.taxPayer.filingStatus === FilingStatus.MFJ ||
      this.info.taxPayer.filingStatus === FilingStatus.W
    ) {
      count += 1
    }
    return count
  }

  personalExemptionAmount = (): number =>
    this.exemptionCount() * this.config.personalExemption

  dependentExemptionAmount = (): number =>
    this.info.taxPayer.dependents.length * this.config.dependentExemption

  totalDeductions = (): number =>
    this.standardDeductionAmount() +
    this.personalExemptionAmount() +
    this.dependentExemptionAmount()

  taxableIncome = (): number =>
    Math.max(0, this.adjustedIncome() - this.totalDeductions())

  taxBrackets = (): TaxBracket[] => {
    const fs = this.info.taxPayer.filingStatus
    return this.config.brackets[fs] ?? this.config.brackets[FilingStatus.S]
  }

  stateTax = (): number => computeTax(this.taxBrackets(), this.taxableIncome())

  stateCredits = (): number => 0

  taxAfterCredits = (): number =>
    Math.max(0, this.stateTax() - this.stateCredits())

  totalWithholding = (): number => this.methods.stateWithholding()

  taxOwedOrRefund = (): number =>
    this.taxAfterCredits() - this.totalWithholding()

  // ── PDF fields ──────────────────────────────────────────────

  fields = (): Field[] => [
    this.info.taxPayer.primaryPerson.firstName,
    this.info.taxPayer.primaryPerson.lastName,
    this.info.taxPayer.primaryPerson.ssid,
    this.info.taxPayer.filingStatus,
    this.federalAGI(),
    this.stateAdditions(),
    this.stateSubtractions(),
    this.adjustedIncome(),
    this.standardDeductionAmount(),
    this.personalExemptionAmount(),
    this.dependentExemptionAmount(),
    this.taxableIncome(),
    this.stateTax(),
    this.stateCredits(),
    this.taxAfterCredits(),
    this.totalWithholding(),
    this.taxOwedOrRefund()
  ]
}
