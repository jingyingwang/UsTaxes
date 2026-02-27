import { FilingStatus, State } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../StateFormBase'
import ProgressiveTaxFormBase from '../ProgressiveTaxFormBase'

/**
 * Virginia 2025 tax parameters.
 *
 * VA uses 4 marginal brackets (2% - 5.75%) that are the same
 * for all filing statuses. VA has a standard deduction and
 * personal exemptions ($930 per person).
 */
const brackets: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 3000, rate: 0.03 },
  { threshold: 5000, rate: 0.05 },
  { threshold: 17000, rate: 0.0575 }
]

const standardDeductions: Record<FilingStatus, number> = {
  [FilingStatus.S]: 4500,
  [FilingStatus.MFJ]: 9000,
  [FilingStatus.MFS]: 4500,
  [FilingStatus.HOH]: 4500,
  [FilingStatus.W]: 9000
}

const personalExemptionPerPerson = 930
export class VA760 extends ProgressiveTaxFormBase {
  state: State = 'VA'
  formName = 'VA-760'

  constructor(f1040: StateF1040) {
    super(f1040)
  }

  standardDeduction(): number {
    return standardDeductions[this.filingStatus()]
  }

  personalExemptions(): number {
    let count = 1
    if (this.filingStatus() === FilingStatus.MFJ && this.info.taxPayer.spouse) {
      count += 1
    }
    const numDependents = this.info.taxPayer.dependents.length
    return (count + numDependents) * personalExemptionPerPerson
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

const makeVAForm = (f1040: StateF1040): VA760 => new VA760(f1040)

export default makeVAForm
