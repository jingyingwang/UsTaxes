import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// New Mexico 2025 tax brackets — Single / MFS / HOH
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.017 },
  { threshold: 5500, rate: 0.032 },
  { threshold: 11000, rate: 0.047 },
  { threshold: 16000, rate: 0.049 },
  { threshold: 210000, rate: 0.059 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.017 },
  { threshold: 8000, rate: 0.032 },
  { threshold: 16000, rate: 0.047 },
  { threshold: 24000, rate: 0.049 },
  { threshold: 315000, rate: 0.059 }
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
  [FilingStatus.HOH]: 14600,
  [FilingStatus.MFS]: 14600
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
