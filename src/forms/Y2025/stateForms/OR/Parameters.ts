import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Oregon 2025 tax brackets
// Single / Married Filing Separately
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.0475 },
  { threshold: 4050, rate: 0.0675 },
  { threshold: 10200, rate: 0.0875 },
  { threshold: 125000, rate: 0.099 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.0475 },
  { threshold: 8100, rate: 0.0675 },
  { threshold: 20400, rate: 0.0875 },
  { threshold: 250000, rate: 0.099 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2745,
  [FilingStatus.MFJ]: 5495,
  [FilingStatus.W]: 5495,
  [FilingStatus.HOH]: 2745,
  [FilingStatus.MFS]: 2745
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
