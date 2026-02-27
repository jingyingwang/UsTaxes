import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Wisconsin 2025 tax brackets
// Single / Married Filing Separately
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.035 },
  { threshold: 14320, rate: 0.044 },
  { threshold: 28640, rate: 0.053 },
  { threshold: 315310, rate: 0.0765 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.035 },
  { threshold: 19100, rate: 0.044 },
  { threshold: 38200, rate: 0.053 },
  { threshold: 420420, rate: 0.0765 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 12760,
  [FilingStatus.MFJ]: 23620,
  [FilingStatus.W]: 23620,
  [FilingStatus.HOH]: 12760,
  [FilingStatus.MFS]: 12760
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
