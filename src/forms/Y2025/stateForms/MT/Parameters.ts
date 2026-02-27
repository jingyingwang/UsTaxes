import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Montana 2025 tax brackets (same for all filing statuses)
const bracketsMT: TaxBracket[] = [
  { threshold: 0, rate: 0.047 },
  { threshold: 20500, rate: 0.059 },
  { threshold: 36400, rate: 0.0675 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsMT,
  [FilingStatus.MFJ]: bracketsMT,
  [FilingStatus.W]: bracketsMT,
  [FilingStatus.HOH]: bracketsMT,
  [FilingStatus.MFS]: bracketsMT
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 5540,
  [FilingStatus.MFJ]: 11080,
  [FilingStatus.W]: 11080,
  [FilingStatus.HOH]: 5540,
  [FilingStatus.MFS]: 5540
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
