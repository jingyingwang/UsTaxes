import { FilingStatus } from 'ustaxes/core/data'

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 4400,
  [FilingStatus.MFJ]: 8800,
  [FilingStatus.MFS]: 4400,
  [FilingStatus.HOH]: 6800,
  [FilingStatus.W]: 8800
}

const parameters = {
  standardDeduction,
  dependentExemption: 1000,
  age65Exemption: 700,
  blindExemption: 2200,
  taxRate: 0.05,
  shortTermCapitalGainsRate: 0.085,
  surtaxRate: 0.04,
  surtaxThreshold: 1000000,
  earnedIncomeCreditRate: 0.4
}

export default parameters
