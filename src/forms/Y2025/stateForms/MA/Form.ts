import Form, { FormMethods } from 'ustaxes/core/stateForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import {
  FilingStatus,
  Person,
  PrimaryPerson,
  Spouse,
  State
} from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040 from '../../irsForms/F1040'
import parameters from './Parameters'

const TAX_YEAR = 2025
const SENIOR_AGE = 65

const isSeniorForYear = (person: Person): boolean =>
  person.dateOfBirth.getFullYear() <= TAX_YEAR - SENIOR_AGE

export default class MAForm extends Form {
  info: ValidatedInformation
  f1040: F1040
  formName: string
  state: State
  formOrder = 0
  methods: FormMethods

  constructor(f1040: F1040) {
    super()
    this.info = f1040.info
    this.f1040 = f1040
    this.formName = 'MA-1'
    this.state = 'MA'
    this.methods = new FormMethods(this)
  }

  attachments = (): Form[] => []

  filingStatus = (): FilingStatus => this.info.taxPayer.filingStatus

  standardDeduction = (): number =>
    parameters.standardDeduction[this.filingStatus()] ??
    parameters.standardDeduction[FilingStatus.S]

  dependentCount = (): number => this.info.taxPayer.dependents.length

  seniorCount = (): number =>
    [this.info.taxPayer.primaryPerson, this.info.taxPayer.spouse]
      .filter((p): p is PrimaryPerson | Spouse => p !== undefined)
      .filter(isSeniorForYear).length

  blindCount = (): number =>
    [this.info.taxPayer.primaryPerson, this.info.taxPayer.spouse]
      .filter((p): p is PrimaryPerson | Spouse => p !== undefined)
      .filter((p) => p.isBlind).length

  personalExemptions = (): number =>
    sumFields([
      this.dependentCount() * parameters.dependentExemption,
      this.seniorCount() * parameters.age65Exemption,
      this.blindCount() * parameters.blindExemption
    ])

  adjustedGrossIncome = (): number => this.f1040.l11()

  totalDeductions = (): number =>
    sumFields([this.standardDeduction(), this.personalExemptions()])

  taxableIncome = (): number =>
    Math.max(0, this.adjustedGrossIncome() - this.totalDeductions())

  shortTermCapitalGains = (): number => Math.max(0, this.f1040.scheduleD.l7())

  shortTermTaxableIncome = (): number =>
    Math.max(0, Math.min(this.shortTermCapitalGains(), this.taxableIncome()))

  regularTaxableIncome = (): number =>
    Math.max(0, this.taxableIncome() - this.shortTermTaxableIncome())

  regularTax = (): number => this.regularTaxableIncome() * parameters.taxRate

  shortTermCapitalGainsTax = (): number =>
    this.shortTermTaxableIncome() * parameters.shortTermCapitalGainsRate

  baseTax = (): number =>
    sumFields([this.regularTax(), this.shortTermCapitalGainsTax()])

  surtax = (): number =>
    Math.max(0, this.taxableIncome() - parameters.surtaxThreshold) *
    parameters.surtaxRate

  totalTax = (): number => sumFields([this.baseTax(), this.surtax()])

  federalEarnedIncomeCredit = (): number =>
    this.f1040.scheduleEIC.isNeeded() ? this.f1040.scheduleEIC.credit() : 0

  earnedIncomeCredit = (): number =>
    this.federalEarnedIncomeCredit() * parameters.earnedIncomeCreditRate

  withholding = (): number => this.methods.stateWithholding()

  totalPayments = (): number =>
    sumFields([this.withholding(), this.earnedIncomeCredit()])

  amountDue = (): number => Math.max(0, this.totalTax() - this.totalPayments())

  refund = (): number => Math.max(0, this.totalPayments() - this.totalTax())

  fields = (): Field[] => [
    this.adjustedGrossIncome(),
    this.standardDeduction(),
    this.personalExemptions(),
    this.taxableIncome(),
    this.shortTermCapitalGains(),
    this.regularTaxableIncome(),
    this.regularTax(),
    this.shortTermCapitalGainsTax(),
    this.baseTax(),
    this.surtax(),
    this.totalTax(),
    this.earnedIncomeCredit(),
    this.withholding(),
    this.totalPayments(),
    this.refund(),
    this.amountDue()
  ]
}
