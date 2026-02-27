import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'

/**
 * Form 8801 — Credit for Prior Year Minimum Tax — Individuals, Estates, and Trusts
 *
 * This form calculates the minimum tax credit (MTC) from prior-year AMT
 * attributable to deferral items (e.g., incentive stock options).
 *
 * Part I: Net Minimum Tax on Exclusion Items
 *   Refigures AMT using only exclusion items to isolate the "deferral" portion.
 *
 * Part II: Minimum Tax Credit and Carryforward
 *   Determines how much of the available MTC can be used in the current year,
 *   limited to: regular tax liability minus tentative minimum tax.
 */
export default class F8801 extends F1040Attachment {
  tag: FormTag = 'f8801'
  sequenceIndex = 74

  isNeeded = (): boolean => {
    const input = this.f1040.info.f8801Input
    if (input === undefined) {
      return false
    }
    return input.priorYearMinimumTaxCredit > 0
  }

  // ── Part I: Net Minimum Tax on Exclusion Items ──

  // Line 1: Net minimum tax on exclusion items from prior year (user input)
  l1 = (): number =>
    this.f1040.info.f8801Input?.priorYearNetMinimumTaxOnExclusionItems ?? 0

  // ── Part II: Minimum Tax Credit and Carryforward ──

  // Line 15: Carryforward of minimum tax credit from prior year
  // (Prior year Form 8801, line 26, or first-time filer: 0)
  l15 = (): number => this.f1040.info.f8801Input?.priorYearMinimumTaxCredit ?? 0

  // Line 16: Enter the tentative minimum tax from prior year Form 6251
  // For the current year credit calculation, we need the CURRENT year's
  // tentative minimum tax (Form 6251, line 9)
  l16 = (): number => this.f1040.f6251.l9()

  // Line 17: Enter the regular tax before credits
  // Form 1040, line 16 (minus any tax from Form 4972),
  // plus Schedule 2, line 1z, minus Schedule 3, line 1.
  l17 = (): number => {
    const f1040L16 = this.f1040.l16() ?? 0
    const f4972 = this.f1040.f4972?.tax() ?? 0
    const sch2L1z = this.f1040.schedule2.l1z()
    const sch3L1 = this.f1040.schedule3.l1() ?? 0
    return Math.max(0, f1040L16 - f4972 + sch2L1z - sch3L1)
  }

  // Line 18: Subtract line 16 from line 17 (regular tax minus TMT)
  // This is the maximum amount of MTC that can be used this year
  l18 = (): number => Math.max(0, this.l17() - this.l16())

  // Line 24: Minimum tax credit — the smaller of line 15 or line 18
  // This is the allowable credit for the current year
  l24 = (): number => Math.min(this.l15(), this.l18())

  // Line 25: Credit carryforward to next year
  // Any unused credit carries forward indefinitely
  l25 = (): number => Math.max(0, this.l15() - this.l24())

  // The credit amount that flows to Schedule 3, line 6j
  credit = (): number => this.l24()

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    // Part I
    this.l1(),
    // Part II
    this.l15(),
    this.l16(),
    this.l17(),
    this.l18(),
    this.l24(),
    this.l25()
  ]
}
