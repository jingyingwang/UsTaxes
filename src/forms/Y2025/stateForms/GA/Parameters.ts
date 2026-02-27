import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 750, rate: 0.02 },
  { threshold: 2250, rate: 0.03 },
  { threshold: 3750, rate: 0.04 },
  { threshold: 5250, rate: 0.05 },
  { threshold: 7000, rate: 0.0549 }
]

const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 1000, rate: 0.02 },
  { threshold: 3000, rate: 0.03 },
  { threshold: 5000, rate: 0.04 },
  { threshold: 7000, rate: 0.05 },
  { threshold: 10000, rate: 0.0549 }
]

const bracketsSeparate: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 500, rate: 0.02 },
  { threshold: 1500, rate: 0.03 },
  { threshold: 2500, rate: 0.04 },
  { threshold: 3500, rate: 0.05 },
  { threshold: 5000, rate: 0.0549 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsJoint,
  [FilingStatus.MFS]: bracketsSeparate
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 5400,
  [FilingStatus.MFJ]: 7100,
  [FilingStatus.W]: 7100,
  [FilingStatus.HOH]: 5400,
  [FilingStatus.MFS]: 3550
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
