import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Maryland 2025 tax brackets
// Same brackets for all filing statuses
const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 1000, rate: 0.03 },
  { threshold: 2000, rate: 0.04 },
  { threshold: 3000, rate: 0.0475 },
  { threshold: 100000, rate: 0.05 },
  { threshold: 125000, rate: 0.0525 },
  { threshold: 150000, rate: 0.055 },
  { threshold: 250000, rate: 0.0575 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsAll,
  [FilingStatus.MFJ]: bracketsAll,
  [FilingStatus.W]: bracketsAll,
  [FilingStatus.HOH]: bracketsAll,
  [FilingStatus.MFS]: bracketsAll
}

// Maryland standard deduction is computed dynamically in Form.ts
// (15% of AGI with min/max floors). These are not used directly
// but kept for reference.
const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2550,
  [FilingStatus.MFJ]: 5150,
  [FilingStatus.W]: 5150,
  [FilingStatus.HOH]: 2550,
  [FilingStatus.MFS]: 2550
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
