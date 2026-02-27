/**
 * Maryland state form with percentage-based standard deduction.
 * MD standard deduction = 15% of AGI, with floor and ceiling by filing status.
 */
import StateFormBase, { F1040Like } from 'ustaxes/core/stateForms/StateFormBase'
import { FilingStatus } from 'ustaxes/core/data'
import { MD } from '../progressiveConfigs'

const stdDedLimits: {
  [K in FilingStatus]: { min: number; max: number }
} = {
  [FilingStatus.S]: { min: 1800, max: 2700 },
  [FilingStatus.MFJ]: { min: 3600, max: 5450 },
  [FilingStatus.MFS]: { min: 1800, max: 2700 },
  [FilingStatus.HOH]: { min: 1800, max: 2700 },
  [FilingStatus.W]: { min: 3600, max: 5450 }
}

export default class MDForm extends StateFormBase {
  constructor(f1040: F1040Like) {
    super(f1040, MD)
  }

  standardDeductionAmount = (): number => {
    const fs = this.info.taxPayer.filingStatus
    const limits = stdDedLimits[fs]
    const pctDeduction = Math.round(this.adjustedIncome() * 0.15)
    return Math.max(limits.min, Math.min(limits.max, pctDeduction))
  }
}
