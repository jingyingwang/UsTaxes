import Form from 'ustaxes/core/stateForms/Form'
import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { Field } from 'ustaxes/core/pdfFiller'
import { FilingStatus, State } from 'ustaxes/core/data'
import { computeBracketTax } from 'ustaxes/core/stateForms/stateBrackets'
import F1040 from '../../irsForms/F1040'
import {
  BracketsByStatus,
  progressiveStateBrackets
} from './progressiveStateBrackets'

export interface ProgressiveStateAdjustments {
  standardDeduction?: Partial<Record<FilingStatus, number>>
  personalExemption?: number
}

export interface ProgressiveStateConfig {
  state: State
  formName: string
  brackets: BracketsByStatus
  adjustments?: ProgressiveStateAdjustments
}

export const progressiveStateAdjustments: Partial<
  Record<State, ProgressiveStateAdjustments>
> = {
  KS: {
    standardDeduction: {
      [FilingStatus.S]: 3500,
      [FilingStatus.MFJ]: 8000,
      [FilingStatus.MFS]: 3500,
      [FilingStatus.HOH]: 3500,
      [FilingStatus.W]: 8000
    },
    personalExemption: 2250
  }
}

export class ProgressiveStateForm extends StateFormBase {
  f1040: F1040
  state: State
  formName: string
  formOrder = 0
  adjustments?: ProgressiveStateAdjustments
  brackets: BracketsByStatus

  constructor(f1040: F1040, config: ProgressiveStateConfig) {
    super(f1040.info)
    this.f1040 = f1040
    this.state = config.state
    this.formName = config.formName
    this.brackets = config.brackets
    this.adjustments = config.adjustments
  }

  attachments = (): Form[] => []

  federalAGI = (): number => this.f1040.l11()

  stateStandardDeduction = (): number =>
    this.adjustments?.standardDeduction?.[this.filingStatus()] ?? 0

  stateExemptions = (): number => {
    const perExemption = this.adjustments?.personalExemption ?? 0
    if (perExemption <= 0) return 0
    const exemptions =
      1 +
      (this.info.taxPayer.spouse ? 1 : 0) +
      this.info.taxPayer.dependents.length
    return perExemption * exemptions
  }

  stateTax = (): number =>
    computeBracketTax(
      this.brackets[this.filingStatus()],
      this.stateTaxableIncome()
    )

  fields = (): Field[] => []
}

export const createProgressiveStateForm = (state: State, formName?: string) => {
  const brackets = progressiveStateBrackets[state]
  if (!brackets) {
    throw new Error(`Missing progressive brackets for ${state}`)
  }
  const adjustments = progressiveStateAdjustments[state]
  return (f1040: F1040): ProgressiveStateForm =>
    new ProgressiveStateForm(f1040, {
      state,
      formName: formName ?? state,
      brackets,
      adjustments
    })
}
