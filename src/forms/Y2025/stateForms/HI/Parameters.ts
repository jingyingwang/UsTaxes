import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Hawaii 2025 tax brackets
// Single / Married Filing Separately / Head of Household
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 2400, rate: 0.032 },
  { threshold: 4800, rate: 0.055 },
  { threshold: 9600, rate: 0.064 },
  { threshold: 14400, rate: 0.068 },
  { threshold: 19200, rate: 0.072 },
  { threshold: 24000, rate: 0.076 },
  { threshold: 36000, rate: 0.079 },
  { threshold: 48000, rate: 0.0825 },
  { threshold: 150000, rate: 0.09 },
  { threshold: 175000, rate: 0.10 },
  { threshold: 200000, rate: 0.11 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 4800, rate: 0.032 },
  { threshold: 9600, rate: 0.055 },
  { threshold: 19200, rate: 0.064 },
  { threshold: 28800, rate: 0.068 },
  { threshold: 38400, rate: 0.072 },
  { threshold: 48000, rate: 0.076 },
  { threshold: 72000, rate: 0.079 },
  { threshold: 96000, rate: 0.0825 },
  { threshold: 300000, rate: 0.09 },
  { threshold: 350000, rate: 0.10 },
  { threshold: 400000, rate: 0.11 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsSingle,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2200,
  [FilingStatus.MFJ]: 4400,
  [FilingStatus.W]: 4400,
  [FilingStatus.HOH]: 2200,
  [FilingStatus.MFS]: 2200
}

const parameters = { brackets, standardDeduction }
export default parameters
