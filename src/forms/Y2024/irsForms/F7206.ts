import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 7206 - Self-Employed Health Insurance Deduction
 *
 * Computes the deductible amount of health insurance premiums
 * paid by self-employed individuals. The deduction is limited to
 * net self-employment income minus allocable SE tax deduction
 * and retirement plan contributions. Result flows to Schedule 1 line 17.
 */
export default class F7206 extends F1040Attachment {
  tag: FormTag = 'f7206'
  sequenceIndex = 55

  isNeeded = (): boolean => {
    const premiums = this.totalPremiums()
    return premiums > 0
  }

  // Total self-employed health insurance premiums from all Schedule C businesses
  totalPremiums = (): number =>
    this.f1040.info.scheduleCInputs.reduce(
      (sum, sc) => sum + (sc.selfEmployedHealthInsurancePremiums ?? 0),
      0
    )

  // Line 1: Health insurance premiums paid
  l1 = (): number | undefined => {
    const premiums = this.totalPremiums()
    return premiums > 0 ? premiums : undefined
  }

  // Line 2: Qualified long-term care insurance premiums (not implemented)
  l2 = (): number | undefined => undefined

  // Line 3: Add lines 1 and 2
  l3 = (): number | undefined => sumFields([this.l1(), this.l2()]) || undefined

  // Line 4: Net profit from the trade or business under which the
  // insurance plan is established (Schedule C line 31)
  l4 = (): number | undefined => {
    const profit = this.f1040.scheduleC?.l31()
    return profit !== undefined && profit > 0 ? profit : undefined
  }

  // Line 5: Total net profit from all self-employment
  // (sum of Schedule C line 31, Schedule F line 34, K-1 box 14 code A)
  // Only include positive amounts
  l5 = (): number | undefined => {
    const schCProfit = Math.max(0, this.f1040.scheduleC?.l31() ?? 0)
    const k1Earnings = this.f1040.info.scheduleK1Form1065s.reduce(
      (sum, k1) => sum + Math.max(0, k1.selfEmploymentEarningsA),
      0
    )
    const total = schCProfit + k1Earnings
    return total > 0 ? total : undefined
  }

  // Line 6: Divide line 4 by line 5 (allocation percentage)
  l6 = (): number | undefined => {
    const l4 = this.l4()
    const l5 = this.l5()
    if (l4 === undefined || l5 === undefined || l5 === 0) return undefined
    return l4 / l5
  }

  // Line 7: Multiply deductible part of SE tax (Schedule 1 line 15) by line 6
  l7 = (): number | undefined => {
    const seTaxDeduction = this.f1040.schedule1.l15()
    const ratio = this.l6()
    if (seTaxDeduction === undefined || ratio === undefined) return undefined
    return Math.round(seTaxDeduction * ratio)
  }

  // Line 8: Subtract line 7 from line 4
  l8 = (): number | undefined => {
    const l4 = this.l4()
    const l7 = this.l7()
    if (l4 === undefined) return undefined
    return Math.max(0, l4 - (l7 ?? 0))
  }

  // Line 9: SEP/SIMPLE/qualified plan contributions from Schedule 1 line 16
  // attributable to this business (simplified: use full amount if single business)
  l9 = (): number | undefined => {
    const ratio = this.l6()
    const retirement = this.f1040.schedule1.l16()
    if (retirement === undefined || ratio === undefined) return undefined
    return Math.round(retirement * ratio)
  }

  // Line 10: Subtract line 9 from line 8
  l10 = (): number | undefined => {
    const l8 = this.l8()
    if (l8 === undefined) return undefined
    return Math.max(0, l8 - (this.l9() ?? 0))
  }

  // Line 11: S-corp Medicare wages (not implemented - requires W-2 box 5 from S-corp)
  l11 = (): number | undefined => undefined

  // Line 12: Foreign earned income exclusion (Form 2555 line 45, not implemented)
  l12 = (): number | undefined => undefined

  // Line 13: Line 10 (or line 11 if applicable) minus line 12
  l13 = (): number | undefined => {
    const base = this.l11() ?? this.l10()
    if (base === undefined) return undefined
    return Math.max(0, base - (this.l12() ?? 0))
  }

  // Line 14: Smaller of line 3 or line 13 — the deductible amount
  l14 = (): number | undefined => {
    const l3 = this.l3()
    const l13 = this.l13()
    if (l3 === undefined || l13 === undefined) return undefined
    return Math.min(l3, l13)
  }

  // The deduction amount that flows to Schedule 1 line 17
  deduction = (): number | undefined => this.l14()

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
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
    this.l14()
  ]
}
