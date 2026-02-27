import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040 from '../../irsForms/F1040'
import parameters from './Parameters'

/**
 * New York State IT-201 Resident Income Tax Return (2025)
 *
 * Implements:
 * - NY State progressive tax brackets (4% - 10.9%)
 * - Standard deduction by filing status
 * - Dependent exemptions ($1,000/dependent)
 * - NY earned income credit (30% of federal EIC)
 * - Empire State child credit ($330/child, income <= $75,000)
 * - NYC resident tax (3.078% - 3.876%) — placeholder for NYC residency
 * - Yonkers surcharge — placeholder
 * - State withholding from W-2s
 */
export class NYIT201 extends StateFormBase {
  f1040: F1040
  state: State = 'NY'
  formName = 'IT-201'
  formOrder = 0

  constructor(f1040: F1040) {
    super(f1040.info)
    this.f1040 = f1040
  }

  attachments = (): Form[] => []

  // ── Income pipeline (overrides from StateFormBase) ─────────

  federalAGI = (): number => this.f1040.l11()

  stateStandardDeduction = (): number =>
    parameters.standardDeduction[this.filingStatus()]

  stateExemptions = (): number =>
    this.info.taxPayer.dependents.length * parameters.dependentExemption

  // ── NY State Tax ──────────────────────────────────────────

  /**
   * NY State tax on taxable income.
   * Uses progressive bracket rates based on filing status.
   */
  stateTax = (): number =>
    computeBracketTax(
      parameters.brackets[this.filingStatus()],
      this.stateTaxableIncome()
    )

  // ── Non-refundable State Credits ──────────────────────────

  /**
   * NY State household credit.
   * Available to residents with NY AGI up to $28,000 (single) / $32,000 (MFJ).
   * TODO: implement household credit lookup table
   */
  householdCredit = (): number => 0

  /**
   * Resident credit (for taxes paid to other states).
   * TODO: implement with IT-112-R
   */
  residentCredit = (): number => 0

  /**
   * Other NY State non-refundable credits.
   * TODO: implement with IT-201-ATT
   */
  otherStateCredits = (): number => 0

  /**
   * Total non-refundable NY State credits.
   */
  stateCredits = (): number =>
    sumFields([
      this.householdCredit(),
      this.residentCredit(),
      this.otherStateCredits()
    ])

  // taxAfterCredits() inherited: max(0, stateTax - stateCredits)
  // This gives us the net NY State tax.

  // ── NYC Resident Tax ──────────────────────────────────────
  // Lines 16-19 only apply to NYC residents.
  // NYC residency detection would require additional data fields.

  /**
   * NYC taxable income.
   * Same as NY taxable income for full-year NYC residents.
   */
  nycTaxableIncome = (): number | undefined => undefined

  /**
   * NYC resident tax from bracket computation.
   */
  nycTax = (): number | undefined => {
    const income = this.nycTaxableIncome()
    if (income === undefined) return undefined
    return computeBracketTax(
      parameters.nycBrackets[this.filingStatus()],
      income
    )
  }

  /**
   * NYC household credit.
   */
  nycHouseholdCredit = (): number | undefined => undefined

  /**
   * NYC resident tax after credits.
   */
  nycTaxAfterCredits = (): number | undefined => {
    const tax = this.nycTax()
    if (tax === undefined) return undefined
    return Math.max(0, tax - (this.nycHouseholdCredit() ?? 0))
  }

  // ── Yonkers ───────────────────────────────────────────────

  /**
   * Yonkers resident tax surcharge: 16.975% of NY State tax.
   * Only for Yonkers residents — placeholder.
   */
  yonkersSurcharge = (): number | undefined => undefined

  /**
   * Yonkers nonresident earnings tax: 0.5% of wages earned in Yonkers.
   * Placeholder.
   */
  yonkersNonresidentTax = (): number | undefined => undefined

  // ── Total Tax ─────────────────────────────────────────────

  /**
   * Total NY State, NYC, and Yonkers taxes.
   * Overrides the base class pipeline to include the three tax layers.
   */
  totalTax = (): number =>
    sumFields([
      this.taxAfterCredits(),
      this.nycTaxAfterCredits(),
      this.yonkersSurcharge(),
      this.yonkersNonresidentTax()
    ])

  // ── Refundable Credits ────────────────────────────────────

  /**
   * NY earned income credit: 30% of federal EIC.
   */
  nyEarnedIncomeCredit = (): number | undefined => {
    const federalEIC = this.f1040.l27()
    if (federalEIC === 0) return undefined
    return Math.round(federalEIC * parameters.earnedIncomeCreditRate)
  }

  /**
   * NYC earned income credit: 5% of federal EIC.
   * Only for NYC residents — placeholder.
   */
  nycEarnedIncomeCredit = (): number | undefined => undefined

  /**
   * Empire State child credit: $330 per qualifying child
   * for income up to $75,000.
   */
  empireStateChildCredit = (): number | undefined => {
    const numChildren = this.info.taxPayer.dependents.length
    if (numChildren === 0) return undefined
    if (this.federalAGI() > parameters.empireStateChildCredit.incomeLimit)
      return undefined
    return numChildren * parameters.empireStateChildCredit.amountPerChild
  }

  /**
   * Real property tax credit (STAR credit).
   * TODO: requires property tax information.
   */
  starCredit = (): number | undefined => undefined

  /**
   * College tuition credit.
   * TODO: implement.
   */
  collegeTuitionCredit = (): number | undefined => undefined

  /**
   * Other refundable credits.
   */
  otherRefundableCredits = (): number | undefined => undefined

  /**
   * Total refundable credits.
   */
  totalRefundableCredits = (): number =>
    sumFields([
      this.nyEarnedIncomeCredit(),
      this.nycEarnedIncomeCredit(),
      this.empireStateChildCredit(),
      this.starCredit(),
      this.collegeTuitionCredit(),
      this.otherRefundableCredits()
    ])

  // ── Payments ──────────────────────────────────────────────

  // stateWithholding() inherited from StateFormBase (W-2 withholding)
  // stateEstimatedPayments() inherited (default 0)

  /**
   * Total payments and refundable credits.
   */
  totalPaymentsAndCredits = (): number =>
    this.totalRefundableCredits() + this.totalPayments()

  // ── Refund or Amount Owed ─────────────────────────────────

  /**
   * Override base: account for NYC/Yonkers taxes and refundable credits.
   */
  refundOrOwed = (): number =>
    this.totalTax() - this.totalPaymentsAndCredits()

  refundAmount = (): number => {
    const result = this.refundOrOwed()
    return result < 0 ? Math.abs(result) : 0
  }

  amountOwed = (): number => {
    const result = this.refundOrOwed()
    return result > 0 ? result : 0
  }

  // ── PDF Field Mapping ─────────────────────────────────────

  fields = (): Field[] => [
    // Header / identifying info
    this.info.taxPayer.primaryPerson.firstName, // 0
    this.info.taxPayer.primaryPerson.lastName, // 1
    this.info.taxPayer.primaryPerson.ssid, // 2
    this.info.taxPayer.spouse?.firstName, // 3
    this.info.taxPayer.spouse?.lastName, // 4
    this.info.taxPayer.spouse?.ssid, // 5
    this.info.taxPayer.primaryPerson.address.address, // 6
    this.info.taxPayer.primaryPerson.address.aptNo, // 7
    this.info.taxPayer.primaryPerson.address.city, // 8
    this.info.taxPayer.primaryPerson.address.state ??
      this.info.taxPayer.primaryPerson.address.province, // 9
    this.info.taxPayer.primaryPerson.address.zip, // 10
    // Income section
    this.federalAGI(), // 11 - Federal AGI
    this.stateAdditions(), // 12 - Additions
    this.federalAGI() + this.stateAdditions(), // 13 - Fed AGI + additions
    this.stateSubtractions(), // 14 - Subtractions
    this.stateTaxableIncome() +
      this.stateStandardDeduction() +
      this.stateExemptions(), // 15 - NY AGI (before deductions)
    // Deductions
    this.stateStandardDeduction(), // 16 - Standard deduction
    this.stateExemptions(), // 17 - Dependent exemptions
    this.stateStandardDeduction() + this.stateExemptions(), // 18 - Total deductions
    this.stateTaxableIncome(), // 19 - NY taxable income
    // Tax computation
    this.stateTax(), // 20 - NY State tax
    this.householdCredit(), // 21 - Household credit
    this.residentCredit(), // 22 - Resident credit
    this.otherStateCredits(), // 23 - Other credits
    this.stateCredits(), // 24 - Total credits
    this.taxAfterCredits(), // 25 - State tax after credits
    // NYC
    this.nycTaxableIncome(), // 26 - NYC taxable income
    this.nycTax(), // 27 - NYC tax
    this.nycHouseholdCredit(), // 28 - NYC household credit
    this.nycTaxAfterCredits(), // 29 - NYC tax after credits
    // Yonkers
    this.yonkersSurcharge(), // 30 - Yonkers surcharge
    this.yonkersNonresidentTax(), // 31 - Yonkers nonresident tax
    // Total tax
    this.totalTax(), // 32 - Total taxes
    // Refundable credits
    this.nyEarnedIncomeCredit(), // 33 - NY EIC
    this.nycEarnedIncomeCredit(), // 34 - NYC EIC
    this.empireStateChildCredit(), // 35 - Empire State child credit
    this.starCredit(), // 36 - STAR credit
    this.collegeTuitionCredit(), // 37 - College tuition credit
    this.otherRefundableCredits(), // 38 - Other credits
    this.totalRefundableCredits(), // 39 - Total refundable credits
    // Payments
    this.stateWithholding(), // 40 - Withholding
    this.stateEstimatedPayments(), // 41 - Estimated payments
    this.totalPayments(), // 42 - Total payments
    // Summary
    this.totalPaymentsAndCredits(), // 43 - Total payments + credits
    this.amountOwed(), // 44 - Tax due
    this.refundAmount(), // 45 - Overpayment
    this.refundAmount(), // 46 - Refund amount
    undefined // 47 - Credit to next year
  ]
}

const makeNYIT201 = (f1040: F1040): NYIT201 => new NYIT201(f1040)

export default makeNYIT201
