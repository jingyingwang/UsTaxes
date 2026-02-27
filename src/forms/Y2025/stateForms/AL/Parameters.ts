import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 500, rate: 0.04 },
  { threshold: 3000, rate: 0.05 }
]

const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 1000, rate: 0.04 },
  { threshold: 6000, rate: 0.05 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2500,
  [FilingStatus.MFJ]: 7500,
  [FilingStatus.W]: 7500,
  [FilingStatus.HOH]: 3750,
  [FilingStatus.MFS]: 3750
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
