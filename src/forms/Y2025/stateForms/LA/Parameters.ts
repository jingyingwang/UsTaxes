import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Louisiana 2025 tax brackets
// Single / Head of Household / Married Filing Separately
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.0185 },
  { threshold: 12500, rate: 0.035 },
  { threshold: 50000, rate: 0.0425 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.0185 },
  { threshold: 25000, rate: 0.035 },
  { threshold: 100000, rate: 0.0425 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 14600,
  [FilingStatus.MFJ]: 29200,
  [FilingStatus.W]: 29200,
  [FilingStatus.HOH]: 21900,
  [FilingStatus.MFS]: 14600
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
