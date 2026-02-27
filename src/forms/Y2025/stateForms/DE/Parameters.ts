import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0.0 },
  { threshold: 2000, rate: 0.022 },
  { threshold: 5000, rate: 0.039 },
  { threshold: 10000, rate: 0.048 },
  { threshold: 20000, rate: 0.052 },
  { threshold: 25000, rate: 0.0555 },
  { threshold: 60000, rate: 0.066 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsAll,
  [FilingStatus.MFJ]: bracketsAll,
  [FilingStatus.W]: bracketsAll,
  [FilingStatus.HOH]: bracketsAll,
  [FilingStatus.MFS]: bracketsAll
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 3250,
  [FilingStatus.MFJ]: 6500,
  [FilingStatus.W]: 6500,
  [FilingStatus.HOH]: 3250,
  [FilingStatus.MFS]: 3250
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
