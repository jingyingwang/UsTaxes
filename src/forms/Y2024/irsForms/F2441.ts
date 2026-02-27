import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import {
  CareExpense,
  CareProvider,
  Dependent,
  FilingStatus,
  Form2441Input,
  PersonRole
} from 'ustaxes/core/data'
import { childDependentCareCredit, CURRENT_YEAR } from '../data/federal'

/**
 * Form 2441: Child and Dependent Care Expenses
 *
 * Calculates the credit for child and dependent care expenses.
 * The credit is 20-35% of qualifying expenses (up to $3,000 for
 * one qualifying person or $6,000 for two or more), based on AGI.
 *
 * Qualifying persons: dependents under 13, or disabled dependents/spouse.
 * Credit flows to Schedule 3, line 2.
 */
export default class F2441 extends F1040Attachment {
  tag: FormTag = 'f2441'
  sequenceIndex = childDependentCareCredit.sequenceIndex

  get input(): Form2441Input | undefined {
    return this.f1040.info.form2441Input ?? undefined
  }

  /**
   * Determine which dependents are qualifying persons for Form 2441.
   * A qualifying person is:
   * - Your dependent child who was under age 13 when the care was provided
   * - Your disabled spouse or dependent of any age who is physically or
   *   mentally incapable of self-care
   */
  qualifyingDependents = (): Dependent[] => {
    return this.f1040.info.taxPayer.dependents.filter((dep) =>
      this.isQualifyingPerson(dep)
    )
  }

  /**
   * Check if a dependent qualifies for the child and dependent care credit.
   * Under 13 at end of tax year is the primary test.
   */
  isQualifyingPerson = (dep: Dependent): boolean => {
    const ageAtEndOfYear =
      CURRENT_YEAR -
      dep.dateOfBirth.getFullYear() -
      (dep.dateOfBirth >
      new Date(
        CURRENT_YEAR,
        dep.dateOfBirth.getMonth(),
        dep.dateOfBirth.getDate()
      )
        ? 1
        : 0)
    return ageAtEndOfYear < childDependentCareCredit.qualifyingChildMaxAge
  }

  /**
   * Get care expenses for qualifying dependents only.
   * Filters out expenses for non-qualifying dependents.
   */
  qualifyingCareExpenses = (): CareExpense[] => {
    if (this.input === undefined) return []
    const deps = this.f1040.info.taxPayer.dependents
    return this.input.careExpenses.filter((ce) => {
      const dep = deps[ce.dependentIndex]
      return dep !== undefined && this.isQualifyingPerson(dep)
    })
  }

  /**
   * Number of qualifying persons (for expense limit determination)
   */
  numberOfQualifyingPersons = (): number => {
    return this.qualifyingDependents().length
  }

  // Part I: Care provider information is stored in input.careProviders
  careProviders = (): CareProvider[] => {
    return this.input?.careProviders ?? []
  }

  // Part II: Credit calculation

  /**
   * Line 3: Total qualifying expenses paid
   * Sum of care expenses for all qualifying dependents
   */
  l3 = (): number => {
    return this.qualifyingCareExpenses().reduce((sum, ce) => sum + ce.amount, 0)
  }

  /**
   * Line 4: Employer-provided dependent care benefits (from Part III)
   * For simplified implementation: total employer benefits that are excludable
   */
  l4 = (): number => {
    return this.partIIIExcludableBenefits()
  }

  /**
   * Line 5: Subtract employer benefits from total expenses
   */
  l5 = (): number => {
    return Math.max(0, this.l3() - this.l4())
  }

  /**
   * Line 6: Expense limit based on number of qualifying persons
   * $3,000 for one qualifying person, $6,000 for two or more
   */
  l6 = (): number => {
    const numQualifying = this.numberOfQualifyingPersons()
    if (numQualifying === 0) return 0
    if (numQualifying === 1)
      return childDependentCareCredit.maxExpensesOneQualifying
    return childDependentCareCredit.maxExpensesTwoOrMoreQualifying
  }

  /**
   * Line 7: Earned income of the taxpayer (primary)
   * Includes wages, salaries, tips, and other employee compensation,
   * plus net earnings from self-employment.
   */
  l7 = (): number => {
    return this.earnedIncome(PersonRole.PRIMARY)
  }

  /**
   * Line 8: Earned income of spouse (if filing jointly)
   * For MFS: must use own earned income
   */
  l8 = (): number | undefined => {
    if (this.f1040.info.taxPayer.filingStatus === FilingStatus.MFJ) {
      return this.earnedIncome(PersonRole.SPOUSE)
    }
    return undefined
  }

  /**
   * Line 9: Smallest of lines 5, 6, 7, and 8 (if applicable)
   * This is the amount of expenses eligible for the credit
   */
  l9 = (): number => {
    const values = [this.l5(), this.l6(), this.l7()]
    const l8 = this.l8()
    if (l8 !== undefined) {
      values.push(l8)
    }
    return Math.min(...values)
  }

  /**
   * Line 10: Credit percentage based on AGI
   * 35% for AGI <= $15,000
   * Decreases by 1% for each $2,000 (or fraction) above $15,000
   * Minimum 20% for AGI > $43,000
   */
  l10 = (): number => {
    return this.creditPercentage()
  }

  /**
   * Line 11: Credit amount = line 9 × line 10 percentage
   * This is the child and dependent care credit
   */
  l11 = (): number => {
    return Math.round(this.l9() * (this.l10() / 100))
  }

  /**
   * Calculate the credit percentage based on AGI.
   * Starts at 35% for AGI <= $15,000, decreases 1% per $2,000 above that,
   * down to a minimum of 20%.
   */
  creditPercentage = (): number => {
    const agi = this.f1040.l11()
    const {
      maxCreditPercentage,
      minCreditPercentage,
      agiThresholdStart,
      agiStepSize
    } = childDependentCareCredit

    if (agi <= agiThresholdStart) {
      return maxCreditPercentage
    }

    const stepsAboveThreshold = Math.ceil(
      (agi - agiThresholdStart) / agiStepSize
    )
    return Math.max(
      minCreditPercentage,
      maxCreditPercentage - stepsAboveThreshold
    )
  }

  /**
   * Calculate earned income for a given person role.
   * Earned income includes W-2 wages plus net self-employment income.
   */
  earnedIncome = (role: PersonRole): number => {
    const w2Income = this.f1040.info.w2s
      .filter((w2) => w2.personRole === role)
      .reduce((sum, w2) => sum + w2.income, 0)

    // Include Schedule C net profit (self-employment income)
    const scheduleCIncome = this.f1040.info.scheduleCInputs
      .filter((sc) => sc.personRole === role)
      .reduce((sum, sc) => sum + Math.max(0, sc.grossReceipts - sc.returns), 0)

    return w2Income + scheduleCIncome
  }

  // Part III: Dependent Care Benefits (simplified)

  /**
   * Calculate excludable employer-provided dependent care benefits.
   * Full Part III calculation (lines 12-28) simplified:
   * The excludable amount is the lesser of:
   * - Total benefits received
   * - $5,000 ($2,500 if MFS)
   * - Earned income of taxpayer
   * - Earned income of spouse (if MFJ)
   */
  partIIIExcludableBenefits = (): number => {
    const benefits = this.input?.dependentCareBenefits ?? 0
    if (benefits === 0) return 0

    const maxExclusion =
      this.f1040.info.taxPayer.filingStatus === FilingStatus.MFS ? 2500 : 5000

    const values = [benefits, maxExclusion, this.l7()]
    const l8 = this.l8()
    if (l8 !== undefined) {
      values.push(l8)
    }

    return Math.min(...values)
  }

  /**
   * The nonrefundable credit amount from Form 2441.
   * Returns the credit for Schedule 3, line 2.
   */
  credit = (): number | undefined => {
    if (!this.isNeeded()) return undefined
    const creditAmount = this.l11()
    return creditAmount > 0 ? creditAmount : undefined
  }

  /**
   * Form is needed if there are qualifying care expenses entered
   */
  isNeeded = (): boolean => {
    return (
      this.input !== undefined &&
      this.input.careExpenses.length > 0 &&
      this.qualifyingCareExpenses().length > 0
    )
  }

  /**
   * PDF field mappings for Form 2441.
   * Maps to the official IRS f2441.pdf field order.
   * Note: PDF not yet available in this project; fields prepared for when it is.
   */
  fields = (): Field[] => {
    const providers = this.careProviders()
    const qualExpenses = this.qualifyingCareExpenses()
    const deps = this.f1040.info.taxPayer.dependents

    // Part I: Care providers (up to 2)
    const providerFields = (idx: number): Field[] => {
      const p: CareProvider | undefined = providers[idx]
      if (p === undefined) return ['', '', '', '', '', '', '']
      return [
        p.name,
        p.address?.address ?? '',
        p.address?.city ?? '',
        p.address?.state ?? '',
        p.address?.zip ?? '',
        p.identifyingNumber,
        p.amountPaid
      ]
    }

    // Part II: Qualifying persons (up to 3)
    const qualifyingPersonFields = (idx: number): Field[] => {
      const ce = qualExpenses[idx]
      if (ce === undefined) return ['', '', '']
      const dep = deps[ce.dependentIndex]
      if (dep === undefined) return ['', '', '']
      return [`${dep.firstName} ${dep.lastName}`, dep.ssid, ce.amount]
    }

    return [
      this.f1040.namesString(),
      this.f1040.info.taxPayer.primaryPerson.ssid,
      // Part I: providers
      ...providerFields(0),
      ...providerFields(1),
      // Part II: qualifying persons
      ...qualifyingPersonFields(0),
      ...qualifyingPersonFields(1),
      ...qualifyingPersonFields(2),
      // Credit calculation
      this.l3(),
      this.l4(),
      this.l5(),
      this.l6(),
      this.l7(),
      this.l8(),
      this.l9(),
      this.l10(),
      this.l11()
    ]
  }
}
