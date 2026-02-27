import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Nebraska 2025 tax brackets — Single / MFS
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.0246 },
  { threshold: 3700, rate: 0.0351 },
  { threshold: 22170, rate: 0.0501 },
  { threshold: 35730, rate: 0.0584 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.0246 },
  { threshold: 7400, rate: 0.0351 },
  { threshold: 44350, rate: 0.0501 },
  { threshold: 71460, rate: 0.0584 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 8000,
  [FilingStatus.MFJ]: 16000,
  [FilingStatus.W]: 16000,
  [FilingStatus.HOH]: 8000,
  [FilingStatus.MFS]: 8000
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
