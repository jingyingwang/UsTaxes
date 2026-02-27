import { FilingStatus, State } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../StateFormBase'
import ProgressiveTaxFormBase from '../ProgressiveTaxFormBase'

/**
 * Georgia 2025 tax parameters.
 *
 * GA uses 6 marginal brackets (1% - 5.49%) with filing-status-keyed
 * standard deductions. Brackets are the same for all filing statuses
 * but standard deduction differs.
 */
const brackets: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 750, rate: 0.02 },
  { threshold: 2250, rate: 0.03 },
  { threshold: 3750, rate: 0.04 },
  { threshold: 5250, rate: 0.05 },
  { threshold: 7000, rate: 0.0549 }
]

const standardDeductions: Record<FilingStatus, number> = {
  [FilingStatus.S]: 5400,
  [FilingStatus.MFJ]: 7100,
  [FilingStatus.MFS]: 3550,
  [FilingStatus.HOH]: 5400,
  [FilingStatus.W]: 7100
}

const personalExemptionAmount = 2700
const dependentExemptionAmount = 3000

export class GA500 extends ProgressiveTaxFormBase {
  state: State = 'GA'
  formName = 'GA-500'

  constructor(f1040: StateF1040) {
    super(f1040)
  }

  standardDeduction(): number {
    return standardDeductions[this.filingStatus()]
  }

  personalExemptions(): number {
    let exemptions = personalExemptionAmount
    if (this.filingStatus() === FilingStatus.MFJ && this.info.taxPayer.spouse) {
      exemptions += personalExemptionAmount
    }
    const numDependents = this.info.taxPayer.dependents.length
    exemptions += numDependents * dependentExemptionAmount
    return exemptions
  }

  bracketsForFilingStatus(): TaxBracket[] {
    return brackets
  }

  fields = (): Field[] => [
    this.primaryFirstName(),
    this.primaryLastName(),
    this.spouseFirstName(),
    this.spouseLastName(),
    this.primarySsn(),
    this.spouseSsn(),
    this.address(),
    this.city(),
    this.stateAbbrev(),
    this.zip(),
    this.federalAgi(),
    this.stateAdditions(),
    this.stateSubtractions(),
    this.standardDeduction(),
    this.personalExemptions(),
    this.stateTaxableIncome(),
    this.stateTax(),
    this.credits(),
    this.taxAfterCredits(),
    this.withholding(),
    this.refund(),
    this.amountDue()
  ]
}

const makeGAForm = (f1040: StateF1040): GA500 => new GA500(f1040)

export default makeGAForm
