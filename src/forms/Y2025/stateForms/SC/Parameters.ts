import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// South Carolina 2025 tax brackets (same for all filing statuses)
const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0 },
  { threshold: 3460, rate: 0.03 },
  { threshold: 17330, rate: 0.064 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsAll,
  [FilingStatus.MFJ]: bracketsAll,
  [FilingStatus.W]: bracketsAll,
  [FilingStatus.HOH]: bracketsAll,
  [FilingStatus.MFS]: bracketsAll
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
