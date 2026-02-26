import F1040Attachment from './F1040Attachment'
import { FilingStatus, PersonRole, W2Box12Code } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import { CURRENT_YEAR } from '../data/federal'

/**
 * Form 8880 - Credit for Qualified Retirement Savings Contributions
 * (Saver's Credit)
 *
 * Two-column form: Column (a) = You, Column (b) = Your Spouse
 * Lines 1-6 are computed per-person, then combined for Lines 7-12.
 */

// W2 Box 12 codes that represent elective deferrals to qualified plans
const ELECTIVE_DEFERRAL_CODES: W2Box12Code[] = [
  W2Box12Code.D, // 401(k)
  W2Box12Code.E, // 403(b)
  W2Box12Code.F, // 408(k)(6) SEP
  W2Box12Code.G, // 457(b)
  W2Box12Code.H, // 501(c)(18)(D)
  W2Box12Code.S, // SIMPLE
  W2Box12Code.AA, // Designated Roth 401(k)
  W2Box12Code.BB, // Designated Roth 403(b)
  W2Box12Code.EE // Designated Roth 457(b)
]

// AGI thresholds for credit rate lookup (2024 tax year)
// [50% ceiling, 20% ceiling, 10% ceiling]
const AGI_THRESHOLDS: { [key in FilingStatus]: [number, number, number] } = {
  [FilingStatus.MFJ]: [46000, 50000, 76500],
  [FilingStatus.W]: [46000, 50000, 76500],
  [FilingStatus.HOH]: [34500, 37500, 57375],
  [FilingStatus.S]: [23000, 25000, 38250],
  [FilingStatus.MFS]: [23000, 25000, 38250]
}

export default class F8880 extends F1040Attachment {
  tag: FormTag = 'f8880'
  sequenceIndex = 54

  /**
   * Eligibility: Must be 18+, not a full-time student, not claimed
   * as a dependent. We check age and dependent status; student status
   * is not currently tracked for primary/spouse in the data model.
   */
  private isPersonEligible(
    role: PersonRole.PRIMARY | PersonRole.SPOUSE
  ): boolean {
    const person =
      role === PersonRole.PRIMARY
        ? this.f1040.info.taxPayer.primaryPerson
        : this.f1040.info.taxPayer.spouse

    if (person === undefined) return false

    // Must be 18 or older by end of tax year
    const endOfYear = new Date(CURRENT_YEAR, 11, 31)
    const age =
      endOfYear.getFullYear() -
      person.dateOfBirth.getFullYear() -
      (endOfYear <
      new Date(
        endOfYear.getFullYear(),
        person.dateOfBirth.getMonth(),
        person.dateOfBirth.getDate()
      )
        ? 1
        : 0)
    if (age < 18) return false

    // Cannot be claimed as a dependent
    if (person.isTaxpayerDependent) return false

    // TODO: Cannot be a full-time student (no data field for primary/spouse)
    return true
  }

  /**
   * Line 1: Traditional IRA contributions + Roth IRA contributions
   * (voluntary employee contributions to qualified plans are also included,
   * but we use IRA contribution data from the data model)
   */
  private iraContributions(
    role: PersonRole.PRIMARY | PersonRole.SPOUSE
  ): number {
    return this.f1040.info.individualRetirementArrangements
      .filter((ira) => ira.personRole === role)
      .reduce((sum, ira) => sum + ira.contributions, 0)
  }

  /**
   * Line 2: Elective deferrals from W2 Box 12
   * (codes D, E, F, G, H, S, AA, BB, EE)
   */
  private electiveDeferrals(
    role: PersonRole.PRIMARY | PersonRole.SPOUSE
  ): number {
    return this.f1040
      .validW2s()
      .filter((w2) => w2.personRole === role)
      .reduce((sum, w2) => {
        if (!w2.box12) return sum
        return (
          sum +
          ELECTIVE_DEFERRAL_CODES.reduce(
            (s, code) => s + (w2.box12?.[code] ?? 0),
            0
          )
        )
      }, 0)
  }

  /**
   * Line 4: Certain distributions received from retirement plans
   * during the testing period. We use current-year IRA gross distributions
   * and 1099-R distributions. (The full testing period covers 2 prior years
   * + current year through filing deadline, but we only have current-year data.)
   */
  private distributions(role: PersonRole.PRIMARY | PersonRole.SPOUSE): number {
    const iraDistributions = this.f1040.info.individualRetirementArrangements
      .filter((ira) => ira.personRole === role)
      .reduce((sum, ira) => sum + ira.grossDistribution, 0)

    const f1099rDistributions = this.f1040
      .f1099rs()
      .filter((f) => f.personRole === role)
      .reduce((sum, f) => sum + f.form.grossDistribution, 0)

    return iraDistributions + f1099rDistributions
  }

  // Per-person line calculations (column a = PRIMARY, column b = SPOUSE)

  l1 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    this.isPersonEligible(role) ? this.iraContributions(role) : 0

  l2 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    this.isPersonEligible(role) ? this.electiveDeferrals(role) : 0

  l3 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    this.l1(role) + this.l2(role)

  l4 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    this.isPersonEligible(role) ? this.distributions(role) : 0

  l5 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    Math.max(0, this.l3(role) - this.l4(role))

  l6 = (role: PersonRole.PRIMARY | PersonRole.SPOUSE): number =>
    Math.min(this.l5(role), 2000)

  // Combined lines
  l7 = (): number => this.l6(PersonRole.PRIMARY) + this.l6(PersonRole.SPOUSE)

  // Line 8: AGI from Form 1040, line 11
  l8 = (): number => this.f1040.l11()

  /**
   * Line 9: Credit rate from AGI lookup table.
   * Returns a decimal (0.5, 0.2, 0.1, or 0).
   */
  l9 = (): number => {
    const agi = this.l8()
    const filingStatus = this.f1040.info.taxPayer.filingStatus
    const thresholds = AGI_THRESHOLDS[filingStatus]

    if (agi <= thresholds[0]) return 0.5
    if (agi <= thresholds[1]) return 0.2
    if (agi <= thresholds[2]) return 0.1
    return 0
  }

  // Line 10: Credit amount before limitation
  l10 = (): number => this.l7() * this.l9()

  /**
   * Line 11: Tax liability limitation (Credit Limit Worksheet).
   * Computes: tax (1040 line 18) minus certain nonrefundable credits.
   * We sum Schedule 3 lines 1-3 directly (skipping l4, which is this
   * form's credit) to avoid circular dependency. We also don't gate on
   * schedule3.isNeeded() since that also depends on this form.
   */
  l11 = (): number => {
    const tax = this.f1040.l18()
    const schedule3Credits = sumFields([
      this.f1040.schedule3.l1(),
      this.f1040.schedule3.l2(),
      this.f1040.schedule3.l3()
    ])

    const otherCredits = sumFields([
      this.f1040.f5695?.l30(),
      this.f1040.f8936?.l15(),
      this.f1040.f8936?.l23(),
      this.f1040.scheduleR?.l22()
    ])

    return Math.max(0, tax - schedule3Credits - otherCredits)
  }

  // Line 12: The credit - smaller of line 10 or line 11
  l12 = (): number => Math.min(this.l10(), this.l11())

  isNeeded = (): boolean => this.l12() > 0

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.l1(PersonRole.PRIMARY),
    this.l1(PersonRole.SPOUSE),
    this.l2(PersonRole.PRIMARY),
    this.l2(PersonRole.SPOUSE),
    this.l3(PersonRole.PRIMARY),
    this.l3(PersonRole.SPOUSE),
    this.l4(PersonRole.PRIMARY),
    this.l4(PersonRole.SPOUSE),
    this.l5(PersonRole.PRIMARY),
    this.l5(PersonRole.SPOUSE),
    this.l6(PersonRole.PRIMARY),
    this.l6(PersonRole.SPOUSE),
    this.l7(),
    this.l8(),
    this.l9(),
    this.l10(),
    this.l11(),
    this.l12()
  ]
}
