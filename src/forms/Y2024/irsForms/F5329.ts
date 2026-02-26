import F1040Attachment from './F1040Attachment'
import { IraPlanType, PersonRole } from 'ustaxes/core/data'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import F1040 from './F1040'

/**
 * Form 5329: Additional Taxes on Qualified Plans (Including IRAs)
 * and Other Tax-Favored Accounts
 *
 * Part I: Additional Tax on Early Distributions
 * Applies a 10% penalty on early distributions from qualified
 * retirement plans taken before age 59½, unless an exception applies.
 *
 * The taxable amount from IRA distributions (1099-R box 2a) flows
 * into line 1. Exceptions (line 2) reduce the penalized amount.
 * The 10% tax (line 4) feeds into Schedule 2, line 8.
 */
export default class F5329 extends F1040Attachment {
  tag: FormTag = 'f5329'
  sequenceIndex = 29

  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE

  constructor(
    f1040: F1040,
    personRole: PersonRole.PRIMARY | PersonRole.SPOUSE = PersonRole.PRIMARY
  ) {
    super(f1040)
    this.personRole = personRole
  }

  isNeeded = (): boolean => (this.l1() ?? 0) > 0

  // Part I: Additional Tax on Early Distributions
  // Line 1: Early distributions included in income from 1099-R
  // This is the taxable amount of distributions from qualified plans
  // for the person associated with this form instance.
  l1 = (): number | undefined => {
    const iras = this.f1040.info.individualRetirementArrangements.filter(
      (ira) =>
        ira.personRole === this.personRole &&
        ira.taxableAmount > 0 &&
        ira.planType !== IraPlanType.RothIRA
    )
    const total = iras.reduce((sum, ira) => sum + ira.taxableAmount, 0)
    return total > 0 ? total : undefined
  }

  // Line 2: Early distributions excepted from additional tax
  // TODO: implement exception codes (01-12) for various exceptions
  // such as age 59½, disability, SEPP, medical expenses, etc.
  l2 = (): number | undefined => undefined

  // Line 3: Amount subject to additional tax (line 1 - line 2)
  l3 = (): number | undefined => {
    const l1 = this.l1() ?? 0
    const l2 = this.l2() ?? 0
    const result = Math.max(0, l1 - l2)
    return result > 0 ? result : undefined
  }

  // Line 4: Additional tax. Multiply line 3 by 10% (0.10)
  // For certain SIMPLE IRA distributions within 2 years, rate is 25%
  // but we use the standard 10% rate for now.
  l4 = (): number | undefined => {
    const l3 = this.l3()
    if (l3 === undefined || l3 === 0) return undefined
    return Math.round(l3 * 0.1)
  }

  // Part II: Additional Tax on Certain Distributions From
  // Education Accounts and ABLE Accounts (not implemented)
  // TODO: Parts II-IX for other penalty types

  // Value that flows to Schedule 2, line 8
  toSchedule2l8 = (): number | undefined => this.l4()

  fields = (): Field[] => {
    // 75 PDF fields total across 3 pages.
    // Page 1 (0-34): Header + Part I (lines 1-4) + Part II (lines 5-8)
    //   + Part III (lines 9-17) + Part IV (lines 18-25)
    // Page 2 (35-60): Parts V-VII
    // Page 3 (61-74): Parts VIII-IX
    const result: Field[] = [
      // Header fields (0-8)
      this.f1040.namesString(), // 0: Name
      this.f1040.info.taxPayer.primaryPerson.ssid, // 1: SSN
      undefined, // 2: Home address (not needed when filing with return)
      undefined, // 3: Apt. no.
      undefined, // 4: City, state, ZIP
      false, // 5: Amended return checkbox
      undefined, // 6: Foreign country name
      undefined, // 7: Foreign province
      undefined, // 8: Foreign postal code

      // Part I: Additional Tax on Early Distributions (fields 9-13)
      this.l1(), // 9: Line 1 - Early distributions
      undefined, // 10: Line 2 - Exception number
      this.l2(), // 11: Line 2 - Amount excepted
      this.l3(), // 12: Line 3 - Amount subject to tax
      this.l4() // 13: Line 4 - Additional tax (10%)
    ]

    // Fill remaining fields (14-74) with undefined for Parts II-IX
    while (result.length < 75) {
      result.push(undefined)
    }

    return result
  }
}
