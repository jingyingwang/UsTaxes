import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { InstallmentSale, InstallmentSaleType } from 'ustaxes/core/data'
import F1040Attachment from './F1040Attachment'

export default class F6252 extends F1040Attachment {
  tag: FormTag = 'f6252'
  sequenceIndex = 9

  installmentSales = (): InstallmentSale[] =>
    this.f1040.info.installmentSales ?? []

  isNeeded = (): boolean => this.installmentSales().length > 0

  grossProfitRatio = (sale: InstallmentSale): number | undefined => {
    if (sale.contractPrice === 0) return undefined
    return sale.grossProfit / sale.contractPrice
  }

  taxableGain = (sale: InstallmentSale): number | undefined => {
    const ratio = this.grossProfitRatio(sale)
    if (ratio === undefined) return undefined
    return sale.paymentsReceived * ratio
  }

  totalTaxableGain = (type?: InstallmentSaleType): number =>
    sumFields(
      this.installmentSales()
        .filter((sale) => (type ? sale.type === type : true))
        .map((sale) => this.taxableGain(sale))
    )

  scheduleDGain = (): number => this.totalTaxableGain('capital')
  form4797Gain = (): number => this.totalTaxableGain('business')

  fields = (): Field[] => []
}
