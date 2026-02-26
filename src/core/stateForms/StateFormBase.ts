import Form, { FormMethods } from './Form'
import { FilingStatus, State } from '../data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import { sumFields } from '../irsForms/util'

/**
 * Abstract base class for state income tax form calculations.
 *
 * Provides the common computation pipeline that most states share:
 *
 *   Federal AGI
 *   + stateAdditions()        (state-specific additions to income)
 *   - stateSubtractions()     (state-specific subtractions from income)
 *   = stateTaxableIncome()
 *   → stateTax()              (brackets or flat rate)
 *   - stateCredits()          (state-specific credits)
 *   = taxAfterCredits()
 *   - stateWithholding()      (W-2 withholding for this state)
 *   - stateEstimatedPayments()
 *   = refundOrOwed()          (positive = owed, negative = refund)
 *
 * Concrete state form classes extend this and implement the abstract
 * methods to plug in state-specific logic. The `fields()` method
 * (required by Fill) is NOT implemented here — each state's PDF
 * layout is unique, so concrete classes must define it.
 */
export default abstract class StateFormBase extends Form {
  abstract state: State
  abstract formName: string
  abstract formOrder: number
  abstract attachments: () => Form[]

  info: ValidatedInformation
  methods: FormMethods

  constructor(info: ValidatedInformation) {
    super()
    this.info = info
    this.methods = new FormMethods(this)
  }

  // ── Income pipeline ──────────────────────────────────────────

  /**
   * Federal adjusted gross income (F1040 line 11).
   * Concrete state forms must provide this from their year-specific
   * F1040 instance, since F1040Base doesn't expose line methods.
   */
  abstract federalAGI(): number

  /**
   * State-specific additions to federal AGI.
   * Examples: interest on other states' municipal bonds,
   * state tax refund if deducted federally, etc.
   * Default: no additions.
   */
  stateAdditions(): number {
    return 0
  }

  /**
   * State-specific subtractions from federal AGI.
   * Examples: state/local tax refund, retirement income exclusion,
   * Social Security exemption, etc.
   * Default: no subtractions.
   */
  stateSubtractions(): number {
    return 0
  }

  /**
   * Standard deduction for this state and filing status.
   * Override for states with a standard deduction.
   * Default: 0 (many states don't offer one).
   */
  stateStandardDeduction(): number {
    return 0
  }

  /**
   * Personal/dependent exemption amount.
   * Override for states with exemptions.
   * Default: 0.
   */
  stateExemptions(): number {
    return 0
  }

  /**
   * State taxable income after additions, subtractions,
   * deductions, and exemptions. Non-negative.
   */
  stateTaxableIncome(): number {
    return Math.max(
      0,
      this.federalAGI() +
        this.stateAdditions() -
        this.stateSubtractions() -
        this.stateStandardDeduction() -
        this.stateExemptions()
    )
  }

  // ── Tax computation ──────────────────────────────────────────

  /**
   * Compute the state income tax on stateTaxableIncome().
   * This is the core method each state MUST implement — it applies
   * the state's bracket schedule or flat rate.
   */
  abstract stateTax(): number

  /**
   * State-specific tax credits (child care, EIC, property tax, etc.).
   * Default: no credits.
   */
  stateCredits(): number {
    return 0
  }

  /**
   * Tax after applying credits. Non-negative.
   */
  taxAfterCredits(): number {
    return Math.max(0, this.stateTax() - this.stateCredits())
  }

  // ── Payments and refund/owed ─────────────────────────────────

  /**
   * Total state income tax withheld from W-2s for this state.
   * Uses FormMethods.stateWithholding() which filters W-2s by state.
   */
  stateWithholding(): number {
    return this.methods.stateWithholding()
  }

  /**
   * Estimated tax payments made to this state.
   * Override if the state form needs to pull from estimated payments.
   * Default: 0.
   */
  stateEstimatedPayments(): number {
    return 0
  }

  /**
   * Total payments (withholding + estimated).
   */
  totalPayments(): number {
    return sumFields([this.stateWithholding(), this.stateEstimatedPayments()])
  }

  /**
   * Positive = amount owed to state.
   * Negative = refund due from state.
   */
  refundOrOwed(): number {
    return this.taxAfterCredits() - this.totalPayments()
  }

  /**
   * Amount of refund (positive value), or 0 if tax is owed.
   */
  refundAmount(): number {
    const result = this.refundOrOwed()
    return result < 0 ? Math.abs(result) : 0
  }

  /**
   * Amount owed (positive value), or 0 if refund is due.
   */
  amountOwed(): number {
    const result = this.refundOrOwed()
    return result > 0 ? result : 0
  }

  // ── Helpers ──────────────────────────────────────────────────

  /**
   * Convenience: get the filing status from validated info.
   */
  filingStatus(): FilingStatus {
    return this.info.taxPayer.filingStatus
  }
}
