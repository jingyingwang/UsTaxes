import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const bracketsAll: TaxBracket[] = [
  { threshold: 0, rate: 0.04 },
  { threshold: 10000, rate: 0.06 },
  { threshold: 40000, rate: 0.065 },
  { threshold: 60000, rate: 0.085 },
  { threshold: 250000, rate: 0.0925 },
  { threshold: 500000, rate: 0.0975 },
  { threshold: 1000000, rate: 0.1075 }
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

const parameters = { brackets, standardDeduction }
export default parameters
