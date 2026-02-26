import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { ForeignEarnedIncomeExclusion } from 'ustaxes/core/data'
import { daysInYear } from 'ustaxes/core/util'
import { CURRENT_YEAR, foreignEarnedIncomeExclusion } from '../data/federal'
import SDQualifiedAndCapGains from './worksheets/SDQualifiedAndCapGains'
import { computeOrdinaryTax } from './TaxTable'

/**
 * Impacts EIC, 1040 instructions L27 step 1 squestion 4
 */
export default class F2555 extends F1040Attachment {
  tag: FormTag = 'f2555'
  sequenceIndex = 34

  private input = (): ForeignEarnedIncomeExclusion | undefined =>
    this.f1040.info.foreignEarnedIncomeExclusion

  isNeeded = (): boolean => this.taxWorksheetLine2a() > 0

  qualifies = (): boolean => {
    const input = this.input()
    if (input === undefined) {
      return false
    }
    if (!input.taxHomeInForeignCountry) {
      return false
    }
    return input.bonaFideResidence || input.physicalPresenceDays >= 330
  }

  qualifyingDays = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    const input = this.input()
    if (input === undefined) {
      return 0
    }
    const maxDays = daysInYear(CURRENT_YEAR)
    if (input.bonaFideResidence) {
      return maxDays
    }
    const qualifyingDays = input.qualifyingDays ?? input.physicalPresenceDays
    const cappedByPresence = Math.min(
      qualifyingDays,
      input.physicalPresenceDays
    )
    return Math.max(0, Math.min(cappedByPresence, maxDays))
  }

  qualifyingRatio = (): number => {
    const maxDays = daysInYear(CURRENT_YEAR)
    if (maxDays === 0) {
      return 0
    }
    return this.qualifyingDays() / maxDays
  }

  foreignEarnedIncome = (): number => this.input()?.foreignEarnedIncome ?? 0

  housingExpenses = (): number => this.input()?.housingExpenses ?? 0

  housingLimit = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    const input = this.input()
    if (input === undefined) {
      return 0
    }
    const annualLimit =
      input.housingLimit ??
      foreignEarnedIncomeExclusion.exclusionLimit *
        foreignEarnedIncomeExclusion.housingMaxRate
    return annualLimit * this.qualifyingRatio()
  }

  housingBaseAmount = (): number =>
    foreignEarnedIncomeExclusion.exclusionLimit *
    foreignEarnedIncomeExclusion.housingBaseRate *
    this.qualifyingRatio()

  housingAmount = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    const housingLimit = this.housingLimit()
    const housingExpenses = Math.max(0, this.housingExpenses())
    return Math.max(
      0,
      Math.min(housingExpenses, housingLimit) - this.housingBaseAmount()
    )
  }

  housingExclusion = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    return this.input()?.isSelfEmployed ? 0 : this.housingAmount()
  }

  housingDeduction = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    return this.input()?.isSelfEmployed ? this.housingAmount() : 0
  }

  foreignEarnedIncomeExclusionLimit = (): number =>
    foreignEarnedIncomeExclusion.exclusionLimit * this.qualifyingRatio()

  foreignEarnedIncomeExclusionAmount = (): number => {
    if (!this.qualifies()) {
      return 0
    }
    const remainingIncome = Math.max(
      0,
      this.foreignEarnedIncome() - this.housingAmount()
    )
    return Math.min(remainingIncome, this.foreignEarnedIncomeExclusionLimit())
  }

  // TODO - Required from SDCapitalGainWorksheet
  // Line 3 of the Foreign Earned Income Tax Worksheet
  l3 = (): number | undefined => this.taxWorksheetLine3()

  // TODO - required from 6251
  l36 = (): number => (this.qualifies() ? this.foreignEarnedIncome() : 0)

  // TODO - required from 6251
  l42 = (): number => this.foreignEarnedIncomeExclusionAmount()

  // TODO - required from 8812
  // Line 45 is the total exclusion (foreign earned income exclusion + housing exclusion)
  l45 = (): number =>
    this.qualifies()
      ? this.foreignEarnedIncomeExclusionAmount() + this.housingExclusion()
      : 0

  // TODO - required from 6251 & 8812
  // Line 50 is the housing deduction for self-employed taxpayers
  l50 = (): number => this.housingDeduction()

  taxWorksheetLine1 = (): number => this.f1040.l15()

  taxWorksheetLine2a = (): number => this.l45() + this.l50()

  taxWorksheetLine2b = (): number => this.input()?.disallowedDeductions ?? 0

  taxWorksheetLine2c = (): number =>
    Math.max(0, this.taxWorksheetLine2a() - this.taxWorksheetLine2b())

  taxWorksheetLine3 = (): number =>
    this.taxWorksheetLine1() + this.taxWorksheetLine2c()

  taxWorksheetLine4 = (): number => {
    const taxableIncome = this.taxWorksheetLine3()

    if (
      this.f1040.scheduleD.computeTaxOnQDWorksheet() ||
      this.f1040.totalQualifiedDividends() > 0
    ) {
      const worksheet = new SDQualifiedAndCapGains(this.f1040, taxableIncome)
      this.f1040.qualifiedAndCapGainsWorksheet = worksheet
      return worksheet.tax()
    }

    return computeOrdinaryTax(
      this.f1040.info.taxPayer.filingStatus,
      taxableIncome
    )
  }

  taxWorksheetLine5 = (): number =>
    computeOrdinaryTax(
      this.f1040.info.taxPayer.filingStatus,
      this.taxWorksheetLine2c()
    )

  taxWorksheetLine6 = (): number =>
    Math.max(0, this.taxWorksheetLine4() - this.taxWorksheetLine5())

  fields = (): Field[] => []
}
