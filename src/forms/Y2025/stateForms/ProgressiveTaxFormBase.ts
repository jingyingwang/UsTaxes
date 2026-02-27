import Form, { FormMethods } from 'ustaxes/core/stateForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import {
  TaxBracket,
  computeBracketTax
} from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from './StateFormBase'

/**
 * Base class for progressive-tax state income tax forms.
 *
 * Extends the core state Form with a bracket-based tax pipeline:
 *
 *   Federal AGI
 *   - standardDeduction()     (filing-status dependent)
 *   - personalExemptions()    (filer + spouse + dependents)
 *   = stateTaxableIncome()
 *   -> computeBracketTax()    (progressive brackets by filing status)
 *   - credits()
 *   = taxAfterCredits()
 *   - withholding()
 *   = refundOrOwed()
 */
export default abstract class ProgressiveTaxFormBase extends Form {
  info: ValidatedInformation
  f1040: StateF1040
  abstract state: State
  abstract formName: string
  formOrder = 0
  methods: FormMethods

  constructor(f1040: StateF1040) {
    super()
    this.f1040 = f1040
    this.info = f1040.info
    this.methods = new FormMethods(this)
  }

  attachments = (): Form[] => []

  // ── Income pipeline ──────────────────────────────────────────

  federalAgi = (): number => this.f1040.l11?.() ?? 0

  stateAdditions(): number {
    return 0
  }

  stateSubtractions(): number {
    return 0
  }

  abstract standardDeduction(): number

  personalExemptions(): number {
    return 0
  }

  stateTaxableIncome(): number {
    return Math.max(
      0,
      this.federalAgi() +
        this.stateAdditions() -
        this.stateSubtractions() -
        this.standardDeduction() -
        this.personalExemptions()
    )
  }

  // ── Tax computation ──────────────────────────────────────────

  abstract bracketsForFilingStatus(): TaxBracket[]

  stateTax(): number {
    return computeBracketTax(
      this.bracketsForFilingStatus(),
      this.stateTaxableIncome()
    )
  }

  credits(): number {
    return 0
  }

  taxAfterCredits(): number {
    return Math.max(0, this.stateTax() - this.credits())
  }

  // ── Payments and refund/owed ─────────────────────────────────

  withholding(): number {
    return this.methods.stateWithholding()
  }

  refund(): number {
    return Math.max(0, this.withholding() - this.taxAfterCredits())
  }

  amountDue(): number {
    return Math.max(0, this.taxAfterCredits() - this.withholding())
  }

  // ── Helpers ──────────────────────────────────────────────────

  filingStatus(): FilingStatus {
    return this.info.taxPayer.filingStatus
  }

  // ── Common field helpers ─────────────────────────────────────

  protected primaryFirstName = (): string | undefined =>
    this.info.taxPayer.primaryPerson.firstName

  protected primaryLastName = (): string | undefined =>
    this.info.taxPayer.primaryPerson.lastName

  protected primarySsn = (): string | undefined =>
    this.info.taxPayer.primaryPerson.ssid

  protected spouseFirstName = (): string | undefined =>
    this.info.taxPayer.spouse?.firstName

  protected spouseLastName = (): string | undefined =>
    this.info.taxPayer.spouse?.lastName

  protected spouseSsn = (): string | undefined =>
    this.info.taxPayer.spouse?.ssid

  protected address = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.address

  protected city = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.city

  protected stateAbbrev = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.state ??
    this.info.taxPayer.primaryPerson.address.province

  protected zip = (): string | undefined =>
    this.info.taxPayer.primaryPerson.address.zip ??
    this.info.taxPayer.primaryPerson.address.postalCode

  /**
   * Default fields layout for progressive-tax state forms.
   * States with custom PDF layouts should override fields().
   */
  fields = (): Field[] => [
    this.primaryFirstName(),
    this.primaryLastName(),
    this.spouseFirstName(),
    this.spouseLastName(),
    this.primarySsn(),
    this.spouseSsn(),
    this.address(),
    this.city(),
    this.stateAbbrev(),
    this.zip(),
    this.federalAgi(),
    this.stateAdditions(),
    this.stateSubtractions(),
    this.standardDeduction(),
    this.personalExemptions(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.credits(),
    this.taxAfterCredits(),
    this.withholding(),
    this.refund(),
    this.amountDue()
  ]
}
