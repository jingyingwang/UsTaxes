import { Income1099Div, Income1099Int } from 'ustaxes/core/data'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 1116 - Foreign Tax Credit
 *
 * Computes the foreign tax credit for passive category income
 * (dividends and interest from 1099-DIV and 1099-INT).
 *
 * The credit is the lesser of:
 *   (a) Total foreign tax paid (from 1099s)
 *   (b) Limitation: (foreign source income / worldwide income) * US tax
 *
 * This implementation handles the most common case for individual filers:
 * passive income category (dividends, interest) with foreign tax reported
 * on 1099-DIV Box 7 and 1099-INT Box 6.
 */
export default class F1116 extends F1040Attachment {
  tag: FormTag = 'f1116'
  sequenceIndex = 19

  private f1099DivsWithForeignTax = (): Income1099Div[] =>
    this.f1040.f1099Divs().filter((d) => (d.form.foreignTaxPaid ?? 0) > 0)

  private f1099IntsWithForeignTax = (): Income1099Int[] =>
    this.f1040.f1099Ints().filter((d) => (d.form.foreignTaxPaid ?? 0) > 0)

  isNeeded = (): boolean => this.totalForeignTaxPaid() > 0

  // --- Part I: Taxable Income or Loss From Sources Outside the U.S. ---

  // Foreign country (use first country found; simplified for single-country)
  foreignCountry = (): string | undefined => {
    const divCountry = this.f1099DivsWithForeignTax()[0]?.form.foreignCountry
    const intCountry = this.f1099IntsWithForeignTax()[0]?.form.foreignCountry
    return divCountry ?? intCountry
  }

  // Income category: passive (category e)
  incomeCategory = (): string => 'Passive category income'

  // Line 1a: Foreign gross income - dividends
  foreignDividendIncome = (): number =>
    this.f1099DivsWithForeignTax().reduce((sum, d) => sum + d.form.dividends, 0)

  // Line 1a: Foreign gross income - interest
  foreignInterestIncome = (): number =>
    this.f1099IntsWithForeignTax().reduce((sum, d) => sum + d.form.income, 0)

  // Total foreign source gross income (passive)
  foreignSourceIncome = (): number =>
    this.foreignDividendIncome() + this.foreignInterestIncome()

  // --- Part II: Foreign Taxes Paid or Accrued ---

  // Total foreign tax paid on dividends
  foreignTaxPaidDividends = (): number =>
    this.f1099DivsWithForeignTax().reduce(
      (sum, d) => sum + (d.form.foreignTaxPaid ?? 0),
      0
    )

  // Total foreign tax paid on interest
  foreignTaxPaidInterest = (): number =>
    this.f1099IntsWithForeignTax().reduce(
      (sum, d) => sum + (d.form.foreignTaxPaid ?? 0),
      0
    )

  // Total foreign taxes paid (Part II total)
  totalForeignTaxPaid = (): number =>
    this.foreignTaxPaidDividends() + this.foreignTaxPaidInterest()

  // --- Part III: Figuring the Credit ---

  // Line 3e: Total foreign source taxable income (from Part I)
  l3e = (): number => this.foreignSourceIncome()

  // Line 5: Worldwide taxable income (F1040 line 15)
  l5 = (): number => Math.max(1, this.f1040.l15())

  // Line 6: Ratio of foreign source income to worldwide income
  // Capped at 1.0 (cannot exceed 100%)
  l6 = (): number => Math.min(1, this.l3e() / this.l5())

  // Line 7: US tax liability (from F1040)
  // Uses tax after AMT but before credits (F1040 line 18)
  l7 = (): number => this.f1040.l18()

  // Line 21: Limitation - max credit allowed
  // = (foreign source income / worldwide income) * US tax
  limitation = (): number => Math.round(this.l6() * this.l7())

  // Line 22: Foreign tax credit
  // = lesser of total foreign tax paid or the limitation
  credit = (): number => Math.min(this.totalForeignTaxPaid(), this.limitation())

  // Carryback/carryforward amounts (not yet implemented)
  carryback = (): number => 0
  carryforward = (): number => {
    const excess = this.totalForeignTaxPaid() - this.limitation()
    return Math.max(0, excess)
  }

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    // Category checkboxes (a through f)
    false, // a - Section 951A
    false, // b - Foreign branch
    false, // c - Passive category (checked below)
    false, // d - General category
    true, // e - Passive category income (this is what we implement)
    false, // f - Lump-sum distributions
    this.foreignCountry() ?? '',
    // Part I - simplified: foreign source income
    this.foreignSourceIncome(),
    // Part II - foreign taxes paid
    this.totalForeignTaxPaid(),
    // Part III - credit computation
    this.l3e(),
    this.l5(),
    this.limitation(),
    this.credit()
  ]
}
