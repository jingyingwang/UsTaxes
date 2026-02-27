import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// Missouri 2025 tax brackets (same for all filing statuses)
const bracketsMO: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 1207, rate: 0.025 },
  { threshold: 2414, rate: 0.03 },
  { threshold: 3621, rate: 0.035 },
  { threshold: 4828, rate: 0.04 },
  { threshold: 6035, rate: 0.045 },
  { threshold: 7242, rate: 0.048 },
  { threshold: 8449, rate: 0.048 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsMO,
  [FilingStatus.MFJ]: bracketsMO,
  [FilingStatus.W]: bracketsMO,
  [FilingStatus.HOH]: bracketsMO,
  [FilingStatus.MFS]: bracketsMO
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 14600,
  [FilingStatus.MFJ]: 29200,
  [FilingStatus.W]: 29200,
  [FilingStatus.HOH]: 14600,
  [FilingStatus.MFS]: 14600
}

const parameters = {
  brackets,
  standardDeduction
}

export default parameters
