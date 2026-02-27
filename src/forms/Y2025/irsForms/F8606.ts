import { Ira, IraPlanType, PersonRole } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import F1040Attachment from './F1040Attachment'
import F1040 from './F1040'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 8606 - Nondeductible IRAs
 *
 * Part I: Nondeductible Contributions to Traditional IRAs and
 *         Distributions From Traditional, SEP, and SIMPLE IRAs
 * Part II: Conversions From Traditional, SEP, or SIMPLE IRAs to Roth IRAs
 * Part III: Distributions From Roth IRAs
 */
export default class F8606 extends F1040Attachment {
  tag: FormTag = 'f8606'
  sequenceIndex = 48
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE

  constructor(
    f1040: F1040,
    personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  ) {
    super(f1040)
    this.personRole = personRole
  }

  private iras = (): Ira[] =>
    this.f1040.info.individualRetirementArrangements.filter(
      (ira) => ira.personRole === this.personRole
    )

  private traditionalIras = (): Ira[] =>
    this.iras().filter(
      (ira) =>
        ira.planType === IraPlanType.IRA ||
        ira.planType === IraPlanType.SepIRA ||
        ira.planType === IraPlanType.SimpleIRA
    )

  private rothIras = (): Ira[] =>
    this.iras().filter((ira) => ira.planType === IraPlanType.RothIRA)

  isNeeded = (): boolean => {
    const iras = this.iras()
    // Needed if: nondeductible contributions, Roth conversions, or Roth distributions
    return iras.some(
      (ira) =>
        ira.nondeductibleContributions > 0 ||
        ira.priorYearBasis > 0 ||
        ira.rothIraConversion > 0 ||
        ira.rothDistributions > 0
    )
  }

  // ---- Part I: Nondeductible Contributions ----

  // Line 1: Nondeductible contributions for current year
  l1 = (): number =>
    this.traditionalIras().reduce(
      (sum, ira) => sum + ira.nondeductibleContributions,
      0
    )

  // Line 2: Total basis in traditional IRAs from prior years
  l2 = (): number =>
    this.traditionalIras().reduce((sum, ira) => sum + ira.priorYearBasis, 0)

  // Line 3: Add lines 1 and 2
  l3 = (): number => sumFields([this.l1(), this.l2()])

  // Line 4: Contributions withdrawn between opening date and due date
  // (not commonly used, simplified to 0)
  l4 = (): number => 0

  // Line 5: Subtract line 4 from line 3
  l5 = (): number => Math.max(0, this.l3() - this.l4())

  // Line 6: Total value of ALL traditional, SEP, and SIMPLE IRAs as of Dec 31
  // plus outstanding rollovers
  l6 = (): number =>
    this.traditionalIras().reduce((sum, ira) => sum + ira.totalIraValue, 0)

  // Line 7: Distributions from traditional, SEP, and SIMPLE IRAs
  l7 = (): number =>
    this.traditionalIras().reduce((sum, ira) => sum + ira.grossDistribution, 0)

  // Line 8: Net amount converted from traditional to Roth IRA
  l8 = (): number =>
    this.iras().reduce((sum, ira) => sum + ira.rothIraConversion, 0)

  // Line 9: Add lines 6, 7, and 8
  l9 = (): number => sumFields([this.l6(), this.l7(), this.l8()])

  // Line 10: Divide line 5 by line 9 (ratio of basis to total value)
  // This is the non-taxable percentage
  l10 = (): number => {
    const l9 = this.l9()
    if (l9 === 0) return 0
    // IRS says enter as decimal rounded to at least 3 places
    return Math.min(1, this.l5() / l9)
  }

  // Line 11: Multiply line 8 by line 10 (nontaxable portion of conversion)
  l11 = (): number => Math.round(this.l8() * this.l10())

  // Line 12: Multiply line 7 by line 10 (nontaxable portion of distributions)
  l12 = (): number => Math.round(this.l7() * this.l10())

  // Line 13: Add lines 11 and 12 (total nontaxable amount)
  l13 = (): number => sumFields([this.l11(), this.l12()])

  // Line 14: Subtract line 13 from line 3 (remaining basis carried forward)
  // This is the basis for next year
  l14 = (): number => Math.max(0, this.l3() - this.l13())

  // Line 15a: Taxable amount of distributions (line 7 minus nontaxable portion)
  l15a = (): number => Math.max(0, this.l7() - this.l12())

  // Line 15b: Taxable amount if modified AGI exceeds certain limits
  // (simplified — not commonly needed for basic cases)
  l15b = (): number | undefined => undefined

  // Line 15c: Taxable amount
  l15c = (): number => this.l15a() + (this.l15b() ?? 0)

  // ---- Part II: Roth Conversions ----

  // Line 16: Net amount converted (same as line 8)
  l16 = (): number => this.l8()

  // Line 17: Nontaxable portion of conversion from line 11
  l17 = (): number => this.l11()

  // Line 18: Taxable amount of conversion (line 16 minus line 17)
  l18 = (): number => Math.max(0, this.l16() - this.l17())

  // ---- Part III: Distributions From Roth IRAs ----

  // Line 19: Total nonqualified distributions from Roth IRAs
  l19 = (): number =>
    this.rothIras().reduce((sum, ira) => sum + ira.rothDistributions, 0)

  // Line 20: Qualified first-time homebuyer expenses (max $10,000)
  l20 = (): number => 0

  // Line 21: Subtract line 20 from line 19
  l21 = (): number => Math.max(0, this.l19() - this.l20())

  // Line 22: Roth IRA contributions basis
  l22 = (): number =>
    this.rothIras().reduce((sum, ira) => sum + ira.rothBasis, 0)

  // Line 23: Nontaxable portion of Roth distribution
  l23 = (): number => Math.min(this.l21(), this.l22())

  // Line 24: Subtract line 23 from line 21
  l24 = (): number => Math.max(0, this.l21() - this.l23())

  // Line 25a: Taxable Roth distribution amount
  // (simplified — qualified distributions are fully nontaxable)
  l25a = (): number => this.l24()

  // Line 25b: Amount attributable to in-plan Roth rollovers
  l25b = (): number => 0

  // Line 25c: Taxable amount
  l25c = (): number => Math.max(0, this.l25a() - this.l25b())

  /**
   * Compute the taxable amount for IRA distributions.
   * This replaces the simple summing of 1099-R box 2a when Form 8606 is filed.
   */
  taxableIraDistributions = (): number => sumFields([this.l15c(), this.l18()])

  fields = (): Field[] => {
    const person =
      this.personRole === PersonRole.PRIMARY
        ? this.f1040.info.taxPayer.primaryPerson
        : this.f1040.info.taxPayer.spouse
    return [
      person ? `${person.firstName} ${person.lastName}` : '',
      person?.ssid ?? '',
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
      this.l10(),
      this.l11(),
      this.l12(),
      this.l13(),
      this.l14(),
      this.l15a(),
      this.l15b(),
      this.l15c(),
      // Part II
      this.l16(),
      this.l17(),
      this.l18(),
      // Part III
      this.l19(),
      this.l20(),
      this.l21(),
      this.l22(),
      this.l23(),
      this.l24(),
      this.l25a(),
      this.l25b(),
      this.l25c()
    ]
  }
}
