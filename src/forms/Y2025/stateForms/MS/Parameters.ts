import { FilingStatus } from 'ustaxes/core/data'

const rate = 0.044

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 2300,
  [FilingStatus.MFJ]: 4600,
  [FilingStatus.W]: 4600,
  [FilingStatus.HOH]: 2300,
  [FilingStatus.MFS]: 2300
}

const exemption = 10000

const parameters = {
  rate,
  standardDeduction,
  exemption
}

export default parameters
