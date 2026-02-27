import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Kansas 2025 tax brackets
// Single
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.031 },
  { threshold: 15000, rate: 0.0525 },
  { threshold: 30000, rate: 0.057 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.031 },
  { threshold: 30000, rate: 0.0525 },
  { threshold: 60000, rate: 0.057 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 3500,
  [FilingStatus.MFJ]: 8000,
  [FilingStatus.W]: 8000,
  [FilingStatus.HOH]: 6000,
  [FilingStatus.MFS]: 4000
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
