import Form, { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

interface F1040Like {
  info: ValidatedInformation
  l37: () => number
}

const DEFAULT_INSTALLMENT_MONTHS = 72
const DEFAULT_USER_FEE = 0

export default class F9465 extends Form {
  tag: FormTag = 'f9465'
  sequenceIndex = 72
  f1040: F1040Like

  constructor(f1040: F1040Like) {
    super()
    this.f1040 = f1040
  }

  isNeeded = (): boolean => this.taxOwed() > 0

  taxOwed = (): number => Math.max(0, this.f1040.l37())

  userFee = (): number => DEFAULT_USER_FEE

  totalBalance = (): number => this.taxOwed() + this.userFee()

  proposedMonthlyPayment = (): number => {
    const totalBalance = this.totalBalance()
    if (totalBalance <= 0) {
      return 0
    }
    return Math.ceil(totalBalance / DEFAULT_INSTALLMENT_MONTHS)
  }

  fields = (): Field[] => {
    const tp = this.f1040.info.taxPayer
    const primary = tp.primaryPerson
    const spouse = tp.spouse
    const address = primary.address

    return [
      primary.ssid,
      spouse?.ssid,
      primary.firstName,
      primary.lastName,
      spouse?.firstName,
      spouse?.lastName,
      address.address,
      address.aptNo,
      address.city,
      address.state,
      address.zip,
      address.foreignCountry,
      address.province,
      address.postalCode,
      this.taxOwed(),
      this.userFee(),
      this.totalBalance(),
      this.proposedMonthlyPayment()
    ]
  }
}
