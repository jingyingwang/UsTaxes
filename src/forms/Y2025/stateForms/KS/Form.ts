import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../types'
import parameters from './Parameters'

export class KSForm extends StateFormBase {
  f1040: StateF1040
  state: State = 'KS'
  formName = 'K-40'
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

  stateTax = (): number => {
    const income = this.stateTaxableIncome()
    const brackets =
      parameters.brackets[this.filingStatus()] ??
      parameters.brackets[FilingStatus.S]
    return computeBracketTax(brackets, income)
  }

  fields = (): Field[] => [
    this.federalAGI(),
    this.stateStandardDeduction(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.stateWithholding(),
    this.refundAmount(),
    this.amountOwed()
  ]
}

const makeKSForm = (f1040: StateF1040): KSForm => new KSForm(f1040)
export default makeKSForm
