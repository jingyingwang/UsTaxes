import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { StateF1040 } from '../types'
import parameters from './Parameters'

export class NDForm extends StateFormBase {
  f1040: StateF1040
  state: State = 'ND'
  formName = 'ND-1'
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

  stateTax = (): number =>
    Math.round(this.stateTaxableIncome() * parameters.rate * 100) / 100

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

const makeNDForm = (f1040: StateF1040): NDForm => new NDForm(f1040)
export default makeNDForm
