import { FilingStatus } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

// California 2025 tax brackets
// Single / Married Filing Separately
const bracketsSingle: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 10412, rate: 0.02 },
  { threshold: 24684, rate: 0.04 },
  { threshold: 38959, rate: 0.06 },
  { threshold: 54081, rate: 0.08 },
  { threshold: 68350, rate: 0.093 },
  { threshold: 349137, rate: 0.103 },
  { threshold: 418961, rate: 0.113 },
  { threshold: 698271, rate: 0.123 }
]

// Married Filing Jointly / Qualifying Widow(er)
const bracketsJoint: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 20824, rate: 0.02 },
  { threshold: 49368, rate: 0.04 },
  { threshold: 77918, rate: 0.06 },
  { threshold: 108162, rate: 0.08 },
  { threshold: 136700, rate: 0.093 },
  { threshold: 698274, rate: 0.103 },
  { threshold: 837922, rate: 0.113 },
  { threshold: 1396542, rate: 0.123 }
]

// Head of Household
const bracketsHOH: TaxBracket[] = [
  { threshold: 0, rate: 0.01 },
  { threshold: 20839, rate: 0.02 },
  { threshold: 49371, rate: 0.04 },
  { threshold: 63644, rate: 0.06 },
  { threshold: 78765, rate: 0.08 },
  { threshold: 93037, rate: 0.093 },
  { threshold: 474824, rate: 0.103 },
  { threshold: 569790, rate: 0.113 },
  { threshold: 949649, rate: 0.123 }
]

const brackets: Record<FilingStatus, TaxBracket[]> = {
  [FilingStatus.S]: bracketsSingle,
  [FilingStatus.MFJ]: bracketsJoint,
  [FilingStatus.W]: bracketsJoint,
  [FilingStatus.HOH]: bracketsHOH,
  [FilingStatus.MFS]: bracketsSingle
}

const standardDeduction: Record<FilingStatus, number> = {
  [FilingStatus.S]: 5540,
  [FilingStatus.MFJ]: 11080,
  [FilingStatus.W]: 11080,
  [FilingStatus.HOH]: 11080,
  [FilingStatus.MFS]: 5540
}

// Mental Health Services Tax: 1% surcharge on taxable income over $1,000,000
const mentalHealthServicesThreshold = 1000000
const mentalHealthServicesRate = 0.01

// Personal exemption credit per exemption (taxpayer, spouse, dependents)
const personalExemptionCredit = 144

// Renter's credit amounts and AGI limits (2025)
const renterCreditSingle = 60
const renterCreditJoint = 120

const renterCreditAGILimit: Record<FilingStatus, number> = {
  [FilingStatus.S]: 50746,
  [FilingStatus.MFJ]: 101492,
  [FilingStatus.W]: 101492,
  [FilingStatus.HOH]: 101492,
  [FilingStatus.MFS]: 50746
}

// Child and Dependent Care Expenses Credit
// CA credit is a percentage of the federal credit amount.
// The percentage varies by federal AGI. Simplified: for AGI ≤ $100,000 → 50% of
// federal percentage; scales down to 34% for higher incomes.
const childCareExpenseLimit = 3000 // per child, max 2 children ($6000)
const childCareMaxChildren = 2

const parameters = {
  brackets,
  standardDeduction,
  mentalHealthServicesThreshold,
  mentalHealthServicesRate,
  personalExemptionCredit,
  renterCreditSingle,
  renterCreditJoint,
  renterCreditAGILimit,
  childCareExpenseLimit,
  childCareMaxChildren
}

export default parameters
