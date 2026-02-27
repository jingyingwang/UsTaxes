import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { Field } from 'ustaxes/core/pdfFiller'
import { ScheduleHInput } from 'ustaxes/core/data'

// 2024 Schedule H thresholds
const SS_MEDICARE_WAGE_THRESHOLD = 2700
const SS_TAX_RATE = 0.124 // 12.4% combined employer + employee
const MEDICARE_TAX_RATE = 0.029 // 2.9% combined employer + employee
const FUTA_WAGE_BASE = 7000
const FUTA_TAX_RATE = 0.06 // 6.0%
const FUTA_STATE_CREDIT_MAX = 0.054 // 5.4% maximum state credit

export default class ScheduleH extends F1040Attachment {
  tag: FormTag = 'f1040sh'
  sequenceIndex = 44

  get inputs(): ScheduleHInput[] {
    return this.f1040.info.scheduleHInputs
  }

  isNeeded = (): boolean => this.inputs.length > 0

  // Total cash wages to all household employees
  totalCashWages = (): number =>
    this.inputs.reduce((sum, input) => sum + input.cashWages, 0)

  // --- Part A: Social Security, Medicare, and Additional Medicare Taxes ---

  // Line A1: Did you pay any one household employee cash wages of $2,700 or more?
  a1 = (): boolean =>
    this.inputs.some((input) => input.cashWages >= SS_MEDICARE_WAGE_THRESHOLD)

  // Line A2: Total cash wages subject to social security tax
  a2 = (): number | undefined => {
    if (!this.a1()) return undefined
    return this.inputs
      .filter((input) => input.cashWages >= SS_MEDICARE_WAGE_THRESHOLD)
      .reduce((sum, input) => sum + input.cashWages, 0)
  }

  // Line A3: Social security tax (line A2 * 12.4%)
  a3 = (): number | undefined => {
    const wages = this.a2()
    if (wages === undefined) return undefined
    return Math.round(wages * SS_TAX_RATE * 100) / 100
  }

  // Line A4: Total cash wages subject to Medicare tax
  a4 = (): number | undefined => {
    if (!this.a1()) return undefined
    return this.a2() // Same wages for Medicare
  }

  // Line A5: Medicare tax (line A4 * 2.9%)
  a5 = (): number | undefined => {
    const wages = this.a4()
    if (wages === undefined) return undefined
    return Math.round(wages * MEDICARE_TAX_RATE * 100) / 100
  }

  // Line A6: Additional Medicare tax withholding (from employee share only, if applicable)
  a6 = (): number | undefined => undefined // Requires W-2 box 6 detail, not yet implemented

  // Line A7: Total social security, Medicare, and Additional Medicare taxes
  a7 = (): number | undefined => {
    if (!this.a1()) return undefined
    return sumFields([this.a3(), this.a5(), this.a6()])
  }

  // Line A8: Federal income tax withheld
  a8 = (): number =>
    this.inputs.reduce((sum, input) => sum + input.federalIncomeTaxWithheld, 0)

  // Line A10: Total taxes (Part A) = a7 + a8
  a10 = (): number => sumFields([this.a7(), this.a8()])

  // --- Part B: Federal Unemployment (FUTA) Tax ---

  // Line B11: Did you pay $1,000+ in any calendar quarter?
  b11 = (): boolean => this.inputs.some((input) => input.paidOver1000InQuarter)

  // Line B12: Total cash wages subject to FUTA tax (capped at $7,000 per employee)
  b12 = (): number | undefined => {
    if (!this.b11()) return undefined
    return this.inputs
      .filter((input) => input.paidOver1000InQuarter)
      .reduce(
        (sum, input) => sum + Math.min(input.cashWages, FUTA_WAGE_BASE),
        0
      )
  }

  // Line B15: FUTA tax before adjustments (line B12 * 6.0%)
  b15 = (): number | undefined => {
    const wages = this.b12()
    if (wages === undefined) return undefined
    return Math.round(wages * FUTA_TAX_RATE * 100) / 100
  }

  // Line B19: State unemployment tax credit
  // If all contributions paid by due date and no credit reduction state,
  // credit is the lesser of state contributions or 5.4% of FUTA wages
  b19 = (): number | undefined => {
    const futaWages = this.b12()
    if (futaWages === undefined) return undefined

    const allPaidByDueDate = this.inputs.every(
      (input) => input.contributionsPaidByDueDate
    )
    const anyCreditReduction = this.inputs.some(
      (input) => input.creditReductionState
    )

    if (!allPaidByDueDate || anyCreditReduction) {
      // Simplified: if not all paid by due date or credit reduction applies,
      // no automatic 5.4% credit (would need Schedule H worksheet)
      return 0
    }

    const totalStateContributions = this.inputs.reduce(
      (sum, input) => sum + input.stateUnemploymentContributions,
      0
    )
    const maxCredit = Math.round(futaWages * FUTA_STATE_CREDIT_MAX * 100) / 100
    return Math.min(totalStateContributions, maxCredit)
  }

  // Line B22: FUTA tax after credit (b15 - b19)
  b22 = (): number | undefined => {
    const tax = this.b15()
    const credit = this.b19()
    if (tax === undefined) return undefined
    return Math.max(0, tax - (credit ?? 0))
  }

  // Line B25: Total household employment taxes (Part A + Part B)
  b25 = (): number => sumFields([this.a10(), this.b22()])

  // This value flows to Schedule 2, line 9
  toSchedule2l9 = (): number | undefined => {
    if (!this.isNeeded()) return undefined
    const total = this.b25()
    return total > 0 ? total : undefined
  }

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.a1(),
    this.a2(),
    this.a3(),
    this.a4(),
    this.a5(),
    this.a6(),
    this.a7(),
    this.a8(),
    this.a10(),
    this.b11(),
    this.b12(),
    this.b15(),
    this.b19(),
    this.b22(),
    this.b25()
  ]
}
