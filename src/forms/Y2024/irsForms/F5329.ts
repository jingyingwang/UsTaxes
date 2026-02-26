import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { DistributionCode, Income1099R } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 5329 - Additional Taxes on Qualified Plans (Including IRAs) and
 * Other Tax-Favored Accounts
 *
 * Part I: Additional Tax on Early Distributions
 * Applies a 10% penalty on early distributions (code 1) from retirement
 * accounts where no exception applies.
 */
export default class F5329 extends F1040Attachment {
  tag: FormTag = 'f5329'
  sequenceIndex = 29

  // Get 1099-R forms with early distribution code 1 (no known exception)
  earlyDistributions = (): Income1099R[] =>
    this.f1040
      .f1099rs()
      .filter(
        (f) => f.form.distributionCode === DistributionCode.EARLY_NO_EXCEPTION
      )

  // Also include IRA early distributions (from the Ira interface)
  // that don't go through the 1099-R system
  // TODO: Add IRA early distribution detection based on age

  // Part I: Additional Tax on Early Distributions
  // Line 1: Early distributions included in income from Form 1040
  l1 = (): number =>
    this.earlyDistributions().reduce((sum, f) => sum + f.form.taxableAmount, 0)

  // Line 2: Exceptions (distributions exempt from penalty)
  // Distributions with code 2 have exception applied at source
  l2 = (): number => 0

  // Line 3: Amount subject to additional tax (line 1 - line 2)
  l3 = (): number => Math.max(0, this.l1() - this.l2())

  // Line 4: Additional tax - 10% of line 3
  l4 = (): number => Math.round(this.l3() * 0.1 * 100) / 100

  isNeeded = (): boolean => this.l1() > 0

  // Flow to Schedule 2 line 8
  toSchedule2l8 = (): number | undefined =>
    this.isNeeded() ? this.l4() : undefined

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    // Part I
    this.l1(),
    this.l2(),
    this.l3(),
    this.l4()
  ]
}
