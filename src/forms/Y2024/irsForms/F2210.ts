import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { underpaymentPenalty } from '../data/federal'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 2210 - Underpayment of Estimated Tax by Individuals, Estates, and Trusts
 *
 * Calculates the penalty for underpayment of estimated tax using the
 * short method (Part IV). The required annual payment is the lesser of:
 *   - 90% of the current year's tax, or
 *   - 100% (110% if AGI > $150k / $75k MFS) of the prior year's tax
 *
 * Penalty = underpayment amount x penalty rate
 */
export default class F2210 extends F1040Attachment {
  tag: FormTag = 'f2210'
  sequenceIndex = 17

  // Part I: Required Annual Payment

  // Line 1: Current year tax (Form 1040 line 24)
  l1 = (): number => this.f1040.l24()

  // Line 2: Other taxes (self-employment tax from Schedule 2 line 4,
  // plus additional Medicare tax and NIIT)
  l2 = (): number =>
    sumFields([
      this.f1040.schedule2.l4(),
      this.f1040.schedule2.l11(),
      this.f1040.schedule2.l12()
    ])

  // Line 3: Total tax (line 1 + line 2)
  l3 = (): number => sumFields([this.l1(), this.l2()])

  // Line 4: Refundable credits (child tax credit, EIC, etc.)
  l4 = (): number => this.f1040.l32()

  // Line 5: Subtract line 4 from line 3 (net tax liability)
  l5 = (): number => Math.max(0, this.l3() - this.l4())

  // Line 6: 90% of line 5
  l6 = (): number => Math.round(this.l5() * 0.9)

  // Line 7: Withholding taxes (Form 1040 line 25d)
  l7 = (): number => this.f1040.l25d()

  // Line 8: Subtract line 7 from line 5. If less than $1,000, no penalty.
  l8 = (): number => Math.max(0, this.l5() - this.l7())

  // Line 9: Required annual payment - the lesser of line 6 (90% current year)
  // or 100%/110% of prior year tax
  l9 = (): number => {
    const priorYearTax = this.f1040.info.priorYearTax
    if (priorYearTax === undefined || priorYearTax <= 0) {
      // Without prior year data, use 90% of current year
      return this.l6()
    }
    const factor = this.priorYearFactor()
    const priorYearRequired = Math.round(priorYearTax * factor)
    return Math.min(this.l6(), priorYearRequired)
  }

  // Line 10: Underpayment amount (required payment minus withholding and estimates)
  l10 = (): number => {
    const totalPayments = this.f1040.l25d() + this.f1040.l26()
    return Math.max(0, this.l9() - totalPayments)
  }

  /**
   * Determines the prior year factor: 100% or 110%.
   * If AGI > $150,000 ($75,000 MFS), the safe harbor requires
   * paying 110% of prior year tax; otherwise 100%.
   */
  priorYearFactor = (): number => {
    const agi = this.f1040.l11()
    const threshold = underpaymentPenalty.highIncomeThreshold(
      this.f1040.info.taxPayer.filingStatus
    )
    return agi > threshold ? 1.1 : 1.0
  }

  /**
   * Part IV: Short Method penalty calculation.
   * Penalty = underpayment x rate (annualized).
   * This is a simplified calculation that assumes equal quarterly payments.
   */
  penalty = (): number => {
    // Safe harbor: no penalty if underpayment < $1,000
    if (this.l8() < underpaymentPenalty.minimumUnderpayment) {
      return 0
    }

    // Safe harbor: if withholding + estimated payments >= required annual payment
    const totalPayments = this.f1040.l25d() + this.f1040.l26()
    if (totalPayments >= this.l9()) {
      return 0
    }

    const shortfall = this.l10()
    if (shortfall <= 0) {
      return 0
    }

    return Math.round(shortfall * underpaymentPenalty.rate)
  }

  isNeeded = (): boolean => this.penalty() > 0

  /**
   * Wire penalty to Form 1040, line 38 (estimated tax penalty).
   */
  toF1040Line38 = (): number | undefined => {
    const p = this.penalty()
    return p > 0 ? p : undefined
  }

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    // Part I
    this.l1(),
    this.l2(),
    this.l3(),
    this.l4(),
    this.l5(),
    this.l6(),
    this.l7(),
    this.l8(),
    this.l9(),
    // Part IV (Short Method)
    this.l10(),
    this.penalty()
  ]
}
