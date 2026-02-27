import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 10000, rate: 0.045 },
  { threshold: 50000, rate: 0.055 },
  { threshold: 100000, rate: 0.06 },
  { threshold: 200000, rate: 0.065 },
  { threshold: 250000, rate: 0.069 },
  { threshold: 500000, rate: 0.0699 }
]

const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 20000, rate: 0.045 },
  { threshold: 100000, rate: 0.055 },
  { threshold: 200000, rate: 0.06 },
  { threshold: 400000, rate: 0.065 },
  { threshold: 500000, rate: 0.069 },
  { threshold: 1000000, rate: 0.0699 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 0,
  [FilingStatus.MFJ]: 0,
  [FilingStatus.W]: 0,
  [FilingStatus.HOH]: 0,
  [FilingStatus.MFS]: 0
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
