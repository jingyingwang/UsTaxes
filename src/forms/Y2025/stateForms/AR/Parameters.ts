import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 4400, rate: 0.04 },
  { threshold: 8800, rate: 0.044 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsAll,
  [FilingStatus.MFJ]: bracketsAll,
  [FilingStatus.W]: bracketsAll,
  [FilingStatus.HOH]: bracketsAll,
  [FilingStatus.MFS]: bracketsAll
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2340,
  [FilingStatus.MFJ]: 4680,
  [FilingStatus.W]: 4680,
  [FilingStatus.HOH]: 2340,
  [FilingStatus.MFS]: 2340
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
