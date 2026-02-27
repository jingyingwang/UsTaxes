import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
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
   * Personal exemption credit: $144 per exemption
   * (1 for taxpayer + 1 for spouse if filing jointly + dependents)
   */
  stateCredits = (): number => {
    const base = 1
    const spouse = this.info.taxPayer.spouse ? 1 : 0
    const dependents = this.info.taxPayer.dependents.length
    return (base + spouse + dependents) * parameters.personalExemptionCredit
  }

  fields = (): Field[] => [
    this.federalAGI(),
    this.stateStandardDeduction(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.stateCredits(),
    this.taxAfterCredits(),
    this.stateWithholding(),
    this.refundAmount(),
    this.amountOwed()
  ]
}

const makeCAForm = (f1040: StateF1040): CAForm => new CAForm(f1040)

export default makeCAForm
