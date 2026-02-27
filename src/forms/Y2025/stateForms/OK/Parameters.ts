import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Oklahoma 2025 tax brackets
// Single / Married Filing Separately
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.0025 },
  { threshold: 1000, rate: 0.0075 },
  { threshold: 2500, rate: 0.0175 },
  { threshold: 3750, rate: 0.0275 },
  { threshold: 4900, rate: 0.0375 },
  { threshold: 7200, rate: 0.0475 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.0025 },
  { threshold: 2000, rate: 0.0075 },
  { threshold: 5000, rate: 0.0175 },
  { threshold: 7500, rate: 0.0275 },
  { threshold: 9800, rate: 0.0375 },
  { threshold: 12200, rate: 0.0475 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 6350,
  [FilingStatus.MFJ]: 12700,
  [FilingStatus.W]: 12700,
  [FilingStatus.HOH]: 6350,
  [FilingStatus.MFS]: 6350
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
