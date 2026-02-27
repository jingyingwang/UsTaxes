import { InstallmentSaleInput } from 'ustaxes/core/data'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040Attachment from './F1040Attachment'
import F1040 from './F1040'
import { Field } from 'ustaxes/core/pdfFiller'

export default class F6252 extends F1040Attachment {
  tag: FormTag = 'f6252'
  sequenceIndex = 79
  sale: InstallmentSaleInput

  constructor(f1040: F1040, sale: InstallmentSaleInput) {
    super(f1040)
    this.sale = sale
  }

  isNeeded = (): boolean => true

  // Part I - General Information
  propertyDescription = (): string => this.sale.propertyDescription
  dateAcquired = (): string => this.sale.dateAcquired
  dateSold = (): string => this.sale.dateSold

  // Part II - Installment Sale Income
  // Line 5: Selling price including mortgages and other debts
  l5 = (): number => this.sale.sellingPrice

  // Line 6: Mortgages, debts, and other liabilities the buyer assumed
  l6 = (): number => this.sale.mortgagesAssumed

  // Line 7: Subtract line 6 from line 5
  l7 = (): number => Math.max(0, this.l5() - this.l6())

  // Line 8: Cost or other basis of property sold
  l8 = (): number => this.sale.costOrBasis

  // Line 9: Depreciation allowed or allowable
  l9 = (): number => this.sale.depreciationAllowed

  // Line 10: Adjusted basis (line 8 minus line 9)
  l10 = (): number => Math.max(0, this.l8() - this.l9())

  // Line 11: Commissions and other expenses of sale
  l11 = (): number => this.sale.commissions

  // Line 12: Income recapture from Form 4797, Part III
  l12 = (): number => this.sale.incomeRecapture

  // Line 13: Add lines 10, 11, and 12
  l13 = (): number => sumFields([this.l10(), this.l11(), this.l12()])

  // Line 14: Subtract line 13 from line 5 (gross profit)
  l14 = (): number => Math.max(0, this.l5() - this.l13())

  // Line 15: Related party sale - not implemented, enter 0
  l15 = (): number | undefined =>
    this.sale.wasRelatedPartySale ? undefined : undefined

  // Line 16: Contract price (add line 7 and line 12)
  l16 = (): number => sumFields([this.l7(), this.l12()])

  // Line 17: Gross profit percentage (line 14 / line 16 * 100)
  l17 = (): number => {
    const contractPrice = this.l16()
    if (contractPrice === 0) return 0
    return Math.round((this.l14() / contractPrice) * 10000) / 100
  }

  // Part III - Related Party Installment Sale Income (simplified)
  // Line 24: Payments received this year
  l24 = (): number => this.sale.paymentsReceived

  // Line 25: Installment sale income (line 24 * line 17 / 100)
  l25 = (): number => Math.round(this.l24() * this.l17()) / 100

  // Line 26: Gain on installment sale to report on Schedule D or Form 4797
  l26 = (): number => this.l25()

  // Public API for Schedule D integration
  isLongTerm = (): boolean => this.sale.isLongTerm

  installmentSaleIncome = (): number => this.l26()

  // PDF field mapping not yet implemented — form has 49 fields
  // across Parts I, II, and III. Returning empty array follows
  // the ScheduleC stub pattern until field positions are verified.
  fields = (): Field[] => []
}
