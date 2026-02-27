import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../types'
import parameters from './Parameters'

export class NJForm extends StateFormBase {
  f1040: StateF1040
  state: State = 'NJ'
  formName = 'NJ-1040'
  formOrder = 0

  constructor(f1040: StateF1040) {
    super(f1040.info)
    this.f1040 = f1040
  }

  attachments = (): Form[] => []

  federalAGI = (): number => this.f1040.l11()

  private propertyTaxesPaid = (): number => {
    const deductions = this.info.itemizedDeductions
    if (!deductions) return 0
    return (
      Number(deductions.stateAndLocalRealEstateTaxes ?? 0) +
      Number(deductions.stateAndLocalPropertyTaxes ?? 0)
    )
  }

  private propertyTaxDeduction = (): number =>
    Math.min(parameters.propertyTaxDeductionCap, this.propertyTaxesPaid())

  private propertyTaxCredit = (): number =>
    this.propertyTaxesPaid() > 0 ? parameters.propertyTaxCredit : 0

  private baseTaxableIncome = (): number =>
    Math.max(
      0,
      this.federalAGI() +
        this.stateAdditions() -
        this.stateSubtractions() -
        this.stateStandardDeduction() -
        this.stateExemptions()
    )

  stateTaxableIncome = (): number =>
    Math.max(0, this.baseTaxableIncome() - this.propertyTaxDeduction())

  stateTax = (): number => {
    const brackets =
      parameters.brackets[this.filingStatus()] ??
      parameters.brackets[FilingStatus.S]
    return computeBracketTax(brackets, this.stateTaxableIncome())
  }

  taxAfterCredits = (): number => {
    const brackets =
      parameters.brackets[this.filingStatus()] ??
      parameters.brackets[FilingStatus.S]

    const taxableWithoutDeduction = this.baseTaxableIncome()
    const taxWithoutDeduction = computeBracketTax(
      brackets,
      taxableWithoutDeduction
    )
    const taxWithCredit = Math.max(
      0,
      taxWithoutDeduction - this.propertyTaxCredit()
    )

    const taxableWithDeduction = this.stateTaxableIncome()
    const taxWithDeduction = computeBracketTax(brackets, taxableWithDeduction)

    return Math.min(taxWithDeduction, taxWithCredit)
  }

  fields = (): Field[] => [
    this.federalAGI(),
    this.propertyTaxesPaid(),
    this.propertyTaxDeduction(),
    this.propertyTaxCredit(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.taxAfterCredits(),
    this.stateWithholding(),
    this.refundAmount(),
    this.amountOwed()
  ]
}

const makeNJForm = (f1040: StateF1040): NJForm => new NJForm(f1040)

export default makeNJForm
