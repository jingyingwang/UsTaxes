import Form, { FormMethods } from 'ustaxes/core/stateForms/Form'
import F1040 from '../../irsForms/F1040'
import { Field } from 'ustaxes/core/pdfFiller'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { FilingStatus, State } from 'ustaxes/core/data'
import parameters, { computeBracketTax } from './Parameters'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

/**
 * New York State IT-201 Resident Income Tax Return
 *
 * Implements:
 * - NY State progressive tax brackets (4% - 10.9%)
 * - Standard deduction by filing status
 * - Dependent exemptions
 * - NY earned income credit (30% of federal EIC)
 * - Empire State child credit ($330/child)
 * - NYC resident tax (3.078% - 3.876%) — placeholder for NYC residency
 * - Yonkers surcharge — placeholder
 * - State withholding from W-2s
 */
export class NYIT201 extends Form {
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
    this.formName = 'IT-201'
    this.state = 'NY'
    this.methods = new FormMethods(this)
  }

  attachments = (): Form[] => []

  // ---- Identifying Information (IT-201 header) ----

  primaryFirstName = (): string | undefined =>
    this.info.taxPayer.primaryPerson.firstName

  primaryLastName = (): string | undefined =>
    this.info.taxPayer.primaryPerson.lastName

  primarySSN = (): string | undefined => this.info.taxPayer.primaryPerson.ssid

  spouseFirstName = (): string | undefined =>
    this.info.taxPayer.spouse?.firstName

  spouseLastName = (): string | undefined => this.info.taxPayer.spouse?.lastName

  spouseSSN = (): string | undefined => this.info.taxPayer.spouse?.ssid

  address = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.address

  aptNo = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.aptNo

  city = (): string | undefined => this.info.taxPayer.primaryPerson.address.city

  st = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.state ??
    this.info.taxPayer.primaryPerson.address.province

  zip = (): string | undefined => this.info.taxPayer.primaryPerson.address.zip

  filingStatus = (): FilingStatus => this.info.taxPayer.filingStatus

  // ---- NY Income (Federal starting point) ----

  /**
   * Line 1: Federal adjusted gross income (from federal Form 1040, line 11)
   */
  l1 = (): number => this.f1040.l11()

  /**
   * Line 2: NY additions to federal AGI
   * Interest income on state/local bonds from other states,
   * public employee 414(h) retirement contributions, etc.
   * TODO: implement additions schedule
   */
  l2 = (): number | undefined => undefined

  /**
   * Line 3: Federal AGI + additions
   */
  l3 = (): number => sumFields([this.l1(), this.l2()])

  /**
   * Line 4: NY subtractions from federal AGI
   * Taxable refunds of state/local taxes,
   * pensions of NY/local government employees, etc.
   * TODO: implement subtractions schedule
   */
  l4 = (): number | undefined => undefined

  /**
   * Line 5: NY adjusted gross income
   */
  l5 = (): number => Math.max(0, this.l3() - (this.l4() ?? 0))

  // ---- NY Deductions ----

  /**
   * Line 6: NY standard deduction or NY itemized deductions
   * For simplicity, using standard deduction.
   * TODO: support NY itemized deductions (which differ from federal)
   */
  l6 = (): number => parameters.standardDeduction[this.filingStatus()]

  /**
   * Line 7: Dependent exemptions
   * $1,000 per qualifying dependent
   */
  l7 = (): number =>
    this.info.taxPayer.dependents.length * parameters.dependentExemption

  /**
   * Line 8: Total deductions (line 6 + line 7)
   */
  l8 = (): number => sumFields([this.l6(), this.l7()])

  /**
   * Line 9: NY taxable income (line 5 - line 8, minimum 0)
   */
  l9 = (): number => Math.max(0, this.l5() - this.l8())

  // ---- NY State Tax ----

  /**
   * Line 10: NY State tax on taxable income
   * Uses progressive bracket rates based on filing status
   */
  l10 = (): number =>
    computeBracketTax(parameters.brackets[this.filingStatus()], this.l9())

  /**
   * Line 11: NY State household credit
   * Available to residents with NY AGI up to $28,000 (single) / $32,000 (MFJ)
   * TODO: implement household credit lookup table
   */
  l11 = (): number | undefined => undefined

  /**
   * Line 12: Resident credit (for taxes paid to other states)
   * TODO: implement with IT-112-R
   */
  l12 = (): number | undefined => undefined

  /**
   * Line 13: Other NY State credits
   * TODO: implement with IT-201-ATT
   */
  l13 = (): number | undefined => undefined

  /**
   * Line 14: Total NY State credits (lines 11 + 12 + 13)
   */
  l14 = (): number => sumFields([this.l11(), this.l12(), this.l13()])

  /**
   * Line 15: NY State tax after credits (line 10 - line 14, min 0)
   */
  l15 = (): number => Math.max(0, this.l10() - this.l14())

  // ---- NYC Resident Tax ----
  // Lines 16-22 only apply to NYC residents.
  // For now, these are placeholders. NYC residency detection
  // would require additional data fields.

  /**
   * Line 16: NYC taxable income
   * Same as NY taxable income for full-year NYC residents
   */
  l16 = (): number | undefined => undefined

  /**
   * Line 17: NYC resident tax
   */
  l17 = (): number | undefined => undefined

  /**
   * Line 18: NYC household credit
   */
  l18 = (): number | undefined => undefined

  /**
   * Line 19: NYC resident tax after credits
   */
  l19 = (): number | undefined => undefined

  // ---- Yonkers ----

  /**
   * Line 20: Yonkers resident tax surcharge
   * 16.975% of NY State tax (line 15)
   * Only for Yonkers residents — placeholder
   */
  l20 = (): number | undefined => undefined

  /**
   * Line 21: Yonkers nonresident earnings tax
   * 0.5% of wages earned in Yonkers — placeholder
   */
  l21 = (): number | undefined => undefined

  // ---- Total Tax ----

  /**
   * Line 22: Total NY State, NYC, and Yonkers taxes
   */
  l22 = (): number =>
    sumFields([this.l15(), this.l19(), this.l20(), this.l21()])

  // ---- Credits ----

  /**
   * Line 23: NY earned income credit
   * 30% of federal earned income credit
   */
  l23 = (): number | undefined => {
    const federalEIC = this.f1040.l27()
    if (federalEIC === 0) return undefined
    return Math.round(federalEIC * parameters.earnedIncomeCreditRate)
  }

  /**
   * Line 24: NYC earned income credit (for NYC residents)
   * 5% of federal EIC — placeholder
   */
  l24 = (): number | undefined => undefined

  /**
   * Line 25: Empire State child credit
   * $330 per qualifying child (under 17) for income <= $75,000
   */
  l25 = (): number | undefined => {
    const numChildren = this.info.taxPayer.dependents.length
    if (numChildren === 0) return undefined
    if (this.l1() > parameters.empireStateChildCredit.incomeLimit)
      return undefined
    return numChildren * parameters.empireStateChildCredit.amountPerChild
  }

  /**
   * Line 26: Real property tax credit (STAR credit)
   * TODO: requires property tax information
   */
  l26 = (): number | undefined => undefined

  /**
   * Line 27: College tuition credit
   * TODO: implement
   */
  l27 = (): number | undefined => undefined

  /**
   * Line 28: Other refundable credits
   */
  l28 = (): number | undefined => undefined

  /**
   * Line 29: Total credits and payments
   */
  l29 = (): number =>
    sumFields([
      this.l23(),
      this.l24(),
      this.l25(),
      this.l26(),
      this.l27(),
      this.l28()
    ])

  // ---- Payments ----

  /**
   * Line 30: NY State tax withheld (from W-2s)
   */
  l30 = (): number => this.methods.stateWithholding()

  /**
   * Line 31: Estimated tax payments
   * TODO: implement estimated tax payment tracking for NY
   */
  l31 = (): number | undefined => undefined

  /**
   * Line 32: Total payments (withholding + estimated)
   */
  l32 = (): number => sumFields([this.l30(), this.l31()])

  // ---- Refund or Amount Owed ----

  /**
   * Line 33: Total payments and credits (line 29 + line 32)
   */
  l33 = (): number => this.l29() + this.l32()

  /**
   * Line 34: Tax due (if line 22 > line 33)
   */
  l34 = (): number | undefined => {
    const due = this.l22() - this.l33()
    return due > 0 ? due : undefined
  }

  /**
   * Line 35: Overpayment / refund (if line 33 > line 22)
   */
  l35 = (): number | undefined => {
    const refund = this.l33() - this.l22()
    return refund > 0 ? refund : undefined
  }

  /**
   * Line 36: Amount of overpayment to be refunded
   */
  l36 = (): number | undefined => this.l35()

  /**
   * Line 37: Amount of overpayment to be credited to next year
   */
  l37 = (): number | undefined => undefined

  payment = (): number | undefined => this.l34()

  // ---- PDF Field Mapping ----
  // The fields() array maps to PDF form field positions.
  // Since we don't have the actual IT-201 PDF field layout yet,
  // we provide a logical ordering that can be remapped when
  // the PDF template is added.

  fields = (): Field[] => [
    // Header / identifying info
    this.primaryFirstName(), // 0
    this.primaryLastName(), // 1
    this.primarySSN(), // 2
    this.spouseFirstName(), // 3
    this.spouseLastName(), // 4
    this.spouseSSN(), // 5
    this.address(), // 6
    this.aptNo(), // 7
    this.city(), // 8
    this.st(), // 9
    this.zip(), // 10
    // Income section
    this.l1(), // 11 - Federal AGI
    this.l2(), // 12 - Additions
    this.l3(), // 13 - Fed AGI + additions
    this.l4(), // 14 - Subtractions
    this.l5(), // 15 - NY AGI
    // Deductions
    this.l6(), // 16 - Standard deduction
    this.l7(), // 17 - Dependent exemptions
    this.l8(), // 18 - Total deductions
    this.l9(), // 19 - NY taxable income
    // Tax computation
    this.l10(), // 20 - NY State tax
    this.l11(), // 21 - Household credit
    this.l12(), // 22 - Resident credit
    this.l13(), // 23 - Other credits
    this.l14(), // 24 - Total credits
    this.l15(), // 25 - State tax after credits
    // NYC
    this.l16(), // 26 - NYC taxable income
    this.l17(), // 27 - NYC tax
    this.l18(), // 28 - NYC household credit
    this.l19(), // 29 - NYC tax after credits
    // Yonkers
    this.l20(), // 30 - Yonkers surcharge
    this.l21(), // 31 - Yonkers nonresident tax
    // Total tax
    this.l22(), // 32 - Total taxes
    // Credits
    this.l23(), // 33 - NY EIC
    this.l24(), // 34 - NYC EIC
    this.l25(), // 35 - Empire State child credit
    this.l26(), // 36 - STAR credit
    this.l27(), // 37 - College tuition credit
    this.l28(), // 38 - Other credits
    this.l29(), // 39 - Total credits
    // Payments
    this.l30(), // 40 - Withholding
    this.l31(), // 41 - Estimated payments
    this.l32(), // 42 - Total payments
    // Summary
    this.l33(), // 43 - Total payments + credits
    this.l34(), // 44 - Tax due
    this.l35(), // 45 - Overpayment
    this.l36(), // 46 - Refund amount
    this.l37() // 47 - Credit to next year
  ]
}

const makeNYIT201 = (f1040: F1040): NYIT201 => new NYIT201(f1040)

export default makeNYIT201
