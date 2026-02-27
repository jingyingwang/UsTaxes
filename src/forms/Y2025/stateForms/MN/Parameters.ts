import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Minnesota 2025 tax brackets
// Single
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.0535 },
  { threshold: 31690, rate: 0.068 },
  { threshold: 104090, rate: 0.0785 },
  { threshold: 193240, rate: 0.0985 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.0535 },
  { threshold: 46330, rate: 0.068 },
  { threshold: 184040, rate: 0.0785 },
  { threshold: 321450, rate: 0.0985 }
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
