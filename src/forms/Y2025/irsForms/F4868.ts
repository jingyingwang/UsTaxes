import { Income1099Type } from 'ustaxes/core/data'
import Form, { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

export interface F4868Inputs {
  estimatedTaxLiability: number
  totalPayments?: number
  amountPaying?: number
  taxYearBegin?: string
  taxYearEnd?: string
  taxYearEndYear?: string
  outOfCountry?: boolean
  form1040nrNoWages?: boolean
  paymentConfirmationNumber?: string
}

export default class F4868 extends Form {
  tag: FormTag = 'f4868'
  sequenceIndex = 68

  info: ValidatedInformation
  inputs: F4868Inputs

  constructor(info: ValidatedInformation, inputs: F4868Inputs) {
    super()
    this.info = info
    this.inputs = inputs
  }

  namesString = (): string => {
    const primary = this.info.taxPayer.primaryPerson
    const spouse = this.info.taxPayer.spouse

    const names = [
      `${primary.firstName} ${primary.lastName}`,
      spouse ? `${spouse.firstName} ${spouse.lastName}` : undefined
    ].filter((name): name is string => name !== undefined)

    return names.join(', ')
  }

  addressLine = (): string | undefined => {
    const addr = this.info.taxPayer.primaryPerson.address
    if (addr.aptNo) {
      return `${addr.address} ${addr.aptNo}`
    }
    return addr.address
  }

  city = (): string | undefined => this.info.taxPayer.primaryPerson.address.city
  state = (): string | undefined => this.info.taxPayer.primaryPerson.address.state
  zip = (): string | undefined => this.info.taxPayer.primaryPerson.address.zip
  ssn = (): string | undefined => this.info.taxPayer.primaryPerson.ssid
  spouseSsn = (): string | undefined => this.info.taxPayer.spouse?.ssid

  taxYearBegin = (): string | undefined => this.inputs.taxYearBegin
  taxYearEnd = (): string | undefined => this.inputs.taxYearEnd
  taxYearEndYear = (): string | undefined => this.inputs.taxYearEndYear

  w2Withholding = (): number =>
    this.info.w2s.reduce((res, w2) => res + w2.fedWithholding, 0)

  taxWithholding1099 = (): number =>
    this.info.f1099s.reduce((res, f1099) => {
      if (
        f1099.type === Income1099Type.R ||
        f1099.type === Income1099Type.SSA
      ) {
        return res + f1099.form.federalIncomeTaxWithheld
      }
      return res
    }, 0)

  estimatedTaxPayments = (): number =>
    this.info.estimatedTaxes.reduce((res, et) => res + et.payment, 0)

  totalPayments = (): number =>
    this.w2Withholding() + this.taxWithholding1099() + this.estimatedTaxPayments()

  l4 = (): number => this.inputs.estimatedTaxLiability

  l5 = (): number => this.inputs.totalPayments ?? this.totalPayments()

  l6 = (): number => Math.max(0, this.l4() - this.l5())

  l7 = (): number => this.inputs.amountPaying ?? this.l6()

  line8 = (): boolean | undefined => this.inputs.outOfCountry

  line9 = (): boolean | undefined => this.inputs.form1040nrNoWages

  confirmationNumber = (): string | undefined =>
    this.inputs.paymentConfirmationNumber

  fields = (): Field[] => [
    this.taxYearBegin(),
    this.taxYearEnd(),
    this.taxYearEndYear(),
    this.namesString(),
    this.addressLine(),
    this.city(),
    this.state(),
    this.zip(),
    this.ssn(),
    this.spouseSsn(),
    this.l4(),
    this.l5(),
    this.l6(),
    this.l7(),
    this.line8(),
    this.line9(),
    this.confirmationNumber()
  ]
}
