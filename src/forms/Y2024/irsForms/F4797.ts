import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { BusinessPropertySale } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'

/**
 * Impacts EIC, 1040 instructions L27 step 2 question 3
 */
export default class F4797 extends F1040Attachment {
  tag: FormTag = 'f4797'
  sequenceIndex = 999

  // NOTE: This form is compute-only; PDF support is not yet available.
  isNeeded = (): boolean => false

  sales = (): BusinessPropertySale<Date>[] =>
    this.f1040.info.businessPropertySales ?? []

  hasActivity = (): boolean =>
    this.sales().length > 0 || this.section1231LossCarryover() !== 0

  section1231LossCarryover = (): number =>
    Math.max(0, this.f1040.info.section1231LossCarryover ?? 0)

  totalGain = (sale: BusinessPropertySale<Date>): number =>
    sale.grossSalesPrice - sale.costOrOtherBasis

  depreciation = (sale: BusinessPropertySale<Date>): number =>
    sale.depreciation ?? 0

  ordinaryRecapture = (sale: BusinessPropertySale<Date>): number => {
    const gain = this.totalGain(sale)
    if (gain <= 0) return 0
    if (sale.propertyType === 'section1245') {
      return Math.min(this.depreciation(sale), gain)
    }
    return 0
  }

  section1231Gain = (sale: BusinessPropertySale<Date>): number =>
    this.totalGain(sale) - this.ordinaryRecapture(sale)

  unrecaptured1250 = (sale: BusinessPropertySale<Date>): number => {
    const gain = this.totalGain(sale)
    if (gain <= 0) return 0
    if (sale.propertyType === 'section1250') {
      return Math.min(this.depreciation(sale), gain)
    }
    return 0
  }

  totalOrdinaryRecapture = (): number =>
    sumFields(this.sales().map((sale) => this.ordinaryRecapture(sale)))

  totalUnrecaptured1250 = (): number =>
    sumFields(this.sales().map((sale) => this.unrecaptured1250(sale)))

  // Required from schedule EIC, PUB 596, worksheet 1
  // Net section 1231 gain/loss.
  l7 = (): number =>
    sumFields(this.sales().map((sale) => this.section1231Gain(sale)))

  // Nonrecaptured section 1231 losses (5-year lookback), limited to current gain.
  l8 = (): number => {
    const l7 = this.l7()
    if (l7 <= 0) return 0
    return Math.min(l7, this.section1231LossCarryover())
  }

  // Net section 1231 gain after lookback.
  l9 = (): number => {
    const l7 = this.l7()
    if (l7 <= 0) return 0
    return l7 - this.l8()
  }

  ordinarySection1231 = (): number => {
    const l7 = this.l7()
    if (l7 <= 0) return l7
    return this.l8()
  }

  ordinaryIncome = (): number =>
    sumFields([this.totalOrdinaryRecapture(), this.ordinarySection1231()])

  longTermGain = (): number => this.l9()

  unrecaptured1250Gain = (): number =>
    Math.min(this.totalUnrecaptured1250(), this.longTermGain())

  fields = (): Field[] => []
}
