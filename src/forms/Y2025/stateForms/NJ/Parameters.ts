import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const tableA: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 20000, rate: 0.0175 },
  { threshold: 35000, rate: 0.035 },
  { threshold: 40000, rate: 0.05525 },
  { threshold: 75000, rate: 0.0637 },
  { threshold: 500000, rate: 0.0897 },
  { threshold: 1000000, rate: 0.1075 }
]

const tableB: TaxBracket[] = [
  { threshold: 0, rate: 0.014 },
  { threshold: 20000, rate: 0.0175 },
  { threshold: 50000, rate: 0.0245 },
  { threshold: 70000, rate: 0.035 },
  { threshold: 80000, rate: 0.05525 },
  { threshold: 150000, rate: 0.0637 },
  { threshold: 500000, rate: 0.0897 },
  { threshold: 1000000, rate: 0.1075 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: tableA,
  [FilingStatus.MFJ]: tableB,
  [FilingStatus.W]: tableB,
  [FilingStatus.HOH]: tableB,
  [FilingStatus.MFS]: tableA
}

const parameters = {
  brackets,
  propertyTaxDeductionCap: 15000,
  propertyTaxCredit: 50
}

export default parameters
