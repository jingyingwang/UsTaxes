import Form, { FormMethods } from 'ustaxes/core/stateForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import F1040Base, { ValidatedInformation } from 'ustaxes/forms/F1040Base'

export type StateF1040 = F1040Base & {
  l11?: () => number
  l15?: () => number
}

export type FlatTaxIncomeBase = 'agi' | 'taxable'

export type FlatTaxFieldKey =
  | 'primaryFirstName'
  | 'primaryLastName'
  | 'spouseFirstName'
  | 'spouseLastName'
  | 'primarySsn'
  | 'spouseSsn'
  | 'primaryFullName'
  | 'spouseFullName'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'federalBaseIncome'
  | 'additions'
  | 'subtractions'
  | 'stateTaxableIncome'
  | 'tax'
  | 'withholding'
  | 'refund'
  | 'amountDue'

export const flatTaxFieldOrder: FlatTaxFieldKey[] = [
  'primaryFirstName',
  'primaryLastName',
  'spouseFirstName',
  'spouseLastName',
  'primarySsn',
  'spouseSsn',
  'address',
  'city',
  'state',
  'zip',
  'federalBaseIncome',
  'additions',
  'subtractions',
  'stateTaxableIncome',
  'tax',
  'withholding',
  'refund',
  'amountDue'
]

export type FlatTaxConfig = {
  state: State
  formName: string
  taxRate: number
  incomeBase: FlatTaxIncomeBase
  pdfFields: FlatTaxFieldKey[]
}

export default abstract class StateFormBase extends Form {
  info: ValidatedInformation
  f1040: StateF1040
  state: State
  formName: string
  formOrder = 0
  methods: FormMethods

  protected taxRate: number
  protected incomeBase: FlatTaxIncomeBase
  protected pdfFields: FlatTaxFieldKey[]

  constructor(f1040: StateF1040, config: FlatTaxConfig) {
    super()
    this.f1040 = f1040
    this.info = f1040.info
    this.state = config.state
    this.formName = config.formName
    this.taxRate = config.taxRate
    this.incomeBase = config.incomeBase
    this.pdfFields = config.pdfFields
    this.methods = new FormMethods(this)
  }

  attachments = (): Form[] => []

  additions = (): number => 0

  subtractions = (): number => 0

  protected federalAgi = (): number => this.f1040.l11?.() ?? 0

  protected federalTaxableIncome = (): number =>
    this.f1040.l15?.() ?? this.federalAgi()

  protected baseIncome = (): number =>
    this.incomeBase === 'agi' ? this.federalAgi() : this.federalTaxableIncome()

  stateTaxableIncome = (): number =>
    Math.max(0, this.baseIncome() + this.additions() - this.subtractions())

  tax = (): number => this.stateTaxableIncome() * this.taxRate

  withholding = (): number => this.methods.stateWithholding()

  refund = (): number => Math.max(0, this.withholding() - this.tax())

  amountDue = (): number => Math.max(0, this.tax() - this.withholding())

  protected fieldValue = (key: FlatTaxFieldKey): Field => {
    switch (key) {
      case 'primaryFirstName':
        return this.info.taxPayer.primaryPerson.firstName
      case 'primaryLastName':
        return this.info.taxPayer.primaryPerson.lastName
      case 'spouseFirstName':
        return this.info.taxPayer.spouse?.firstName
      case 'spouseLastName':
        return this.info.taxPayer.spouse?.lastName
      case 'primarySsn':
        return this.info.taxPayer.primaryPerson.ssid
      case 'spouseSsn':
        return this.info.taxPayer.spouse?.ssid
      case 'primaryFullName':
        return this.f1040.primaryFullName()
      case 'spouseFullName':
        return this.f1040.spouseFullName()
      case 'address':
        return this.info.taxPayer.primaryPerson.address.address
      case 'city':
        return this.info.taxPayer.primaryPerson.address.city
      case 'state':
        return (
          this.info.taxPayer.primaryPerson.address.state ??
          this.info.taxPayer.primaryPerson.address.province
        )
      case 'zip':
        return (
          this.info.taxPayer.primaryPerson.address.zip ??
          this.info.taxPayer.primaryPerson.address.postalCode
        )
      case 'federalBaseIncome':
        return this.baseIncome()
      case 'additions':
        return this.additions()
      case 'subtractions':
        return this.subtractions()
      case 'stateTaxableIncome':
        return this.stateTaxableIncome()
      case 'tax':
        return this.tax()
      case 'withholding':
        return this.withholding()
      case 'refund':
        return this.refund()
      case 'amountDue':
        return this.amountDue()
    }
  }

  fields = (): Field[] => this.pdfFields.map((key) => this.fieldValue(key))
}
