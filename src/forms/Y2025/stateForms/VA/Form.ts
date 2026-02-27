import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../types'
import parameters from './Parameters'

export class VAForm extends StateFormBase {
  f1040: StateF1040
  state: State = 'VA'
  formName = 'VA-760'
  formOrder = 0

  constructor(f1040: StateF1040) {
    super(f1040.info)
    this.f1040 = f1040
  }

  attachments = (): Form[] => []

  federalAGI = (): number => this.f1040.l11()

  stateExemptions = (): number => {
    const base = 1
    const spouse = this.info.taxPayer.spouse ? 1 : 0
    const dependents = this.info.taxPayer.dependents.length
    return (base + spouse + dependents) * parameters.personalExemption
  }

  stateTax = (): number =>
    computeBracketTax(parameters.brackets, this.stateTaxableIncome())

  fields = (): Field[] => [
    this.federalAGI(),
    this.stateExemptions(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.stateWithholding(),
    this.refundAmount(),
    this.amountOwed()
  ]
}

const makeVAForm = (f1040: StateF1040): VAForm => new VAForm(f1040)

export default makeVAForm
