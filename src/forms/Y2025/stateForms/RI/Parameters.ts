import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Rhode Island 2025 tax brackets (same for all filing statuses)
const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0.0375 },
  { threshold: 73450, rate: 0.0475 },
  { threshold: 166950, rate: 0.0599 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsAll,
  [FilingStatus.MFJ]: bracketsAll,
  [FilingStatus.W]: bracketsAll,
  [FilingStatus.HOH]: bracketsAll,
  [FilingStatus.MFS]: bracketsAll
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 10550,
  [FilingStatus.MFJ]: 21100,
  [FilingStatus.W]: 21100,
  [FilingStatus.HOH]: 10550,
  [FilingStatus.MFS]: 10550
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
