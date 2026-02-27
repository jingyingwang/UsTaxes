import { FilingStatus, State } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../StateFormBase'
import ProgressiveTaxFormBase from '../ProgressiveTaxFormBase'

/**
 * New Jersey 2025 tax parameters.
 *
 * NJ uses 7 marginal brackets (1.4% - 10.75%) with different
 * thresholds for Single vs MFJ/HOH. NJ has no standard deduction
 * but offers a property tax deduction or credit.
 */
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 20000, rate: 0.0175 },
  { threshold: 35000, rate: 0.035 },
  { threshold: 40000, rate: 0.05525 },
  { threshold: 75000, rate: 0.0637 },
  { threshold: 500000, rate: 0.0897 },
  { threshold: 1000000, rate: 0.1075 }
]

const bracketsMFJ: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 20000, rate: 0.0175 },
  { threshold: 50000, rate: 0.0245 },
  { threshold: 70000, rate: 0.035 },
  { threshold: 80000, rate: 0.05525 },
  { threshold: 150000, rate: 0.0637 },
  { threshold: 500000, rate: 0.0897 },
  { threshold: 1000000, rate: 0.1075 }
]

const propertyTaxDeductionLimit = 15000
const personalExemptionAmount = 1000
const dependentExemptionAmount = 1500

export class NJ1040 extends ProgressiveTaxFormBase {
  state: State = 'NJ'
  formName = 'NJ-1040'

  constructor(f1040: StateF1040) {
    super(f1040)
  }

  /**
   * NJ has no standard deduction. Returns 0.
   */
  standardDeduction(): number {
    return 0
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

  /**
   * NJ property tax deduction (capped at $15,000).
   * Property tax data would come from user input; currently stubbed.
   */
  propertyTaxDeduction(): number {
    return 0
  }

  stateSubtractions(): number {
    return Math.min(this.propertyTaxDeduction(), propertyTaxDeductionLimit)
  }

  bracketsForFilingStatus(): TaxBracket[] {
    switch (this.filingStatus()) {
      case FilingStatus.MFJ:
      case FilingStatus.HOH:
      case FilingStatus.W:
        return bracketsMFJ
      default:
        return bracketsSingle
    }
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

const makeNJForm = (f1040: StateF1040): NJ1040 => new NJ1040(f1040)

export default makeNJForm
