import { FilingStatus } from 'ustaxes/core/data'

const rate = 0.0195

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 14600,
  [FilingStatus.MFJ]: 29200,
  [FilingStatus.W]: 29200,
  [FilingStatus.HOH]: 21900,
  [FilingStatus.MFS]: 14600
}

const parameters = {
  rate,
  standardDeduction
}

export default parameters
