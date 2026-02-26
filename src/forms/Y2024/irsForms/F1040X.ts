import F1040Attachment from './F1040Attachment'
import { AmendedReturnData, AmendedReturnLine } from 'ustaxes/core/data'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import F1040 from './F1040'

/**
 * Form 1040X - Amended U.S. Individual Income Tax Return
 *
 * Three-column form:
 *   Column A: Original amount (from the originally filed return)
 *   Column B: Net change (increase or decrease)
 *   Column C: Corrected amount (Column A + Column B)
 *
 * Lines mirror Form 1040 but show changes between original and corrected values.
 * Part III requires an explanation of each change.
 */
export default class F1040X extends F1040Attachment {
  tag: FormTag = 'f1040x'
  sequenceIndex = 100

  amendedData: AmendedReturnData | undefined

  constructor(f1040: F1040) {
    super(f1040)
    this.amendedData = f1040.info.amendedReturns[0]
  }

  isNeeded = (): boolean =>
    this.amendedData !== undefined && this.amendedData.lines.length > 0

  private findLine(description: string): AmendedReturnLine | undefined {
    return this.amendedData?.lines.find(
      (l) => l.lineDescription === description
    )
  }

  private columnA(description: string): number {
    return this.findLine(description)?.columnA ?? 0
  }

  private columnB(description: string): number {
    return this.findLine(description)?.columnB ?? 0
  }

  private columnC(description: string): number {
    return this.columnA(description) + this.columnB(description)
  }

  // Line 1: Adjusted gross income
  l1a = (): number => this.columnA('1')
  l1b = (): number => this.columnB('1')
  l1c = (): number => this.columnC('1')

  // Line 2: Itemized deductions or standard deduction
  l2a = (): number => this.columnA('2')
  l2b = (): number => this.columnB('2')
  l2c = (): number => this.columnC('2')

  // Line 3: Subtract line 2 from line 1
  l3a = (): number => this.l1a() - this.l2a()
  l3b = (): number => this.l1b() - this.l2b()
  l3c = (): number => this.l1c() - this.l2c()

  // Line 4: Exemptions (if applicable for the year being amended)
  l4a = (): number => this.columnA('4')
  l4b = (): number => this.columnB('4')
  l4c = (): number => this.columnC('4')

  // Line 5: Taxable income (line 3 minus line 4, not less than zero)
  l5a = (): number => Math.max(0, this.l3a() - this.l4a())
  l5b = (): number => this.l3b() - this.l4b()
  l5c = (): number => Math.max(0, this.l3c() - this.l4c())

  // Line 6: Tax
  l6a = (): number => this.columnA('6')
  l6b = (): number => this.columnB('6')
  l6c = (): number => this.columnC('6')

  // Line 7: Credits
  l7a = (): number => this.columnA('7')
  l7b = (): number => this.columnB('7')
  l7c = (): number => this.columnC('7')

  // Line 8: Subtract line 7 from line 6
  l8a = (): number => Math.max(0, this.l6a() - this.l7a())
  l8b = (): number => this.l6b() - this.l7b()
  l8c = (): number => Math.max(0, this.l6c() - this.l7c())

  // Line 9: Other taxes
  l9a = (): number => this.columnA('9')
  l9b = (): number => this.columnB('9')
  l9c = (): number => this.columnC('9')

  // Line 10: Total tax (line 8 + line 9)
  l10a = (): number => this.l8a() + this.l9a()
  l10b = (): number => this.l8b() + this.l9b()
  l10c = (): number => this.l8c() + this.l9c()

  // Line 11: Total payments
  l11a = (): number => this.columnA('11')
  l11b = (): number => this.columnB('11')
  l11c = (): number => this.columnC('11')

  // Line 12: Overpayment (if line 11 > line 10)
  l12 = (): number => Math.max(0, this.l11c() - this.l10c())

  // Line 13: Amount of line 12 to be refunded
  l13 = (): number => this.l12()

  // Line 14: Amount of line 12 to be applied to estimated tax
  l14 = (): number => 0

  // Line 15: Amount you owe (if line 10 > line 11)
  l15 = (): number => Math.max(0, this.l10c() - this.l11c())

  // Part III explanation
  partIIIExplanation = (): string => this.amendedData?.partIIIExplanation ?? ''

  taxYearAmended = (): string => this.amendedData?.taxYearAmended ?? ''

  fields = (): Field[] => [
    // Header info
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.taxYearAmended(),
    // Filing status
    this.amendedData?.filingStatus ?? '',
    // Line 1: AGI (A, B, C)
    this.l1a(),
    this.l1b(),
    this.l1c(),
    // Line 2: Deductions (A, B, C)
    this.l2a(),
    this.l2b(),
    this.l2c(),
    // Line 3: Line 1 - Line 2 (A, B, C)
    this.l3a(),
    this.l3b(),
    this.l3c(),
    // Line 4: Exemptions (A, B, C)
    this.l4a(),
    this.l4b(),
    this.l4c(),
    // Line 5: Taxable income (A, B, C)
    this.l5a(),
    this.l5b(),
    this.l5c(),
    // Line 6: Tax (A, B, C)
    this.l6a(),
    this.l6b(),
    this.l6c(),
    // Line 7: Credits (A, B, C)
    this.l7a(),
    this.l7b(),
    this.l7c(),
    // Line 8: Tax - Credits (A, B, C)
    this.l8a(),
    this.l8b(),
    this.l8c(),
    // Line 9: Other taxes (A, B, C)
    this.l9a(),
    this.l9b(),
    this.l9c(),
    // Line 10: Total tax (A, B, C)
    this.l10a(),
    this.l10b(),
    this.l10c(),
    // Line 11: Total payments (A, B, C)
    this.l11a(),
    this.l11b(),
    this.l11c(),
    // Line 12: Overpayment
    this.l12(),
    // Line 13: Refunded
    this.l13(),
    // Line 14: Applied to estimated tax
    this.l14(),
    // Line 15: Amount owed
    this.l15(),
    // Part III explanation
    this.partIIIExplanation()
  ]
}
