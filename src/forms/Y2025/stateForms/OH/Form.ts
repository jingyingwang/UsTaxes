import { State } from 'ustaxes/core/data'
import { Field } from 'ustaxes/core/pdfFiller'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'
import { StateF1040 } from '../StateFormBase'
import ProgressiveTaxFormBase from '../ProgressiveTaxFormBase'

/**
 * Ohio 2025 tax parameters.
 *
 * OH uses 4 brackets (0% - 3.5%) with a $0 bracket up to $26,050
 * that effectively serves as an exemption. Ohio has no standard
 * deduction and no local income tax at state level. The same
 * brackets apply to all filing statuses.
 */
const brackets: TaxBracket[] = [
  { threshold: 0, rate: 0 },
  { threshold: 26050, rate: 0.02765 },
  { threshold: 46100, rate: 0.03226 },
  { threshold: 92150, rate: 0.03688 }
]

const personalExemptionPerPerson = 2400
const dependentExemptionPerDependent = 2500

export class OHIT1040 extends ProgressiveTaxFormBase {
  state: State = 'OH'
  formName = 'OH-IT1040'

  constructor(f1040: StateF1040) {
    super(f1040)
  }

  /**
   * Ohio has no standard deduction.
   */
  standardDeduction(): number {
    return 0
  }

  personalExemptions(): number {
    let count = 1
    if (this.info.taxPayer.spouse) {
      count += 1
    }
    const numDependents = this.info.taxPayer.dependents.length
    return (
      count * personalExemptionPerPerson +
      numDependents * dependentExemptionPerDependent
    )
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

const makeOHForm = (f1040: StateF1040): OHIT1040 => new OHIT1040(f1040)

export default makeOHForm
