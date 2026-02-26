import { FilingStatus } from 'ustaxes/core/data'

/**
 * NY IT-201 tax parameters for 2024 tax year.
 *
 * Sources:
 * - NY Tax Rate Schedule: https://www.tax.ny.gov/pit/file/tax_tables.htm
 * - NYC Tax Rate Schedule
 * - Standard deduction amounts per filing status
 */

export interface TaxBracket {
  threshold: number
  rate: number
}

/**
 * Compute progressive bracket tax from an array of brackets.
 * Each bracket's rate applies to income above its threshold
 * up to the next bracket's threshold.
 */
export const computeBracketTax = (
  brackets: TaxBracket[],
  income: number
): number => {
  if (income <= 0) return 0
  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const lower = brackets[i].threshold
    const upper = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity
    const rate = brackets[i].rate
    if (income <= lower) break
    const taxableInBracket = Math.min(income, upper) - lower
    tax += taxableInBracket * rate
  }
  return Math.round(tax)
}

// NY State tax brackets for 2024
// 8 brackets: 4% to 10.9%
const nyStateBrackets: { [key in FilingStatus]: TaxBracket[] } = {
  [FilingStatus.S]: [
    { threshold: 0, rate: 0.04 },
    { threshold: 8500, rate: 0.045 },
    { threshold: 11700, rate: 0.0525 },
    { threshold: 13900, rate: 0.055 },
    { threshold: 80650, rate: 0.06 },
    { threshold: 215400, rate: 0.0685 },
    { threshold: 1077550, rate: 0.0965 },
    { threshold: 5000000, rate: 0.103 },
    { threshold: 25000000, rate: 0.109 }
  ],
  [FilingStatus.MFJ]: [
    { threshold: 0, rate: 0.04 },
    { threshold: 17150, rate: 0.045 },
    { threshold: 23600, rate: 0.0525 },
    { threshold: 27900, rate: 0.055 },
    { threshold: 161550, rate: 0.06 },
    { threshold: 323200, rate: 0.0685 },
    { threshold: 2155350, rate: 0.0965 },
    { threshold: 5000000, rate: 0.103 },
    { threshold: 25000000, rate: 0.109 }
  ],
  [FilingStatus.MFS]: [
    { threshold: 0, rate: 0.04 },
    { threshold: 8500, rate: 0.045 },
    { threshold: 11700, rate: 0.0525 },
    { threshold: 13900, rate: 0.055 },
    { threshold: 80650, rate: 0.06 },
    { threshold: 215400, rate: 0.0685 },
    { threshold: 1077550, rate: 0.0965 },
    { threshold: 5000000, rate: 0.103 },
    { threshold: 25000000, rate: 0.109 }
  ],
  [FilingStatus.HOH]: [
    { threshold: 0, rate: 0.04 },
    { threshold: 12800, rate: 0.045 },
    { threshold: 17650, rate: 0.0525 },
    { threshold: 20900, rate: 0.055 },
    { threshold: 107650, rate: 0.06 },
    { threshold: 269300, rate: 0.0685 },
    { threshold: 1616450, rate: 0.0965 },
    { threshold: 5000000, rate: 0.103 },
    { threshold: 25000000, rate: 0.109 }
  ],
  [FilingStatus.W]: [
    { threshold: 0, rate: 0.04 },
    { threshold: 17150, rate: 0.045 },
    { threshold: 23600, rate: 0.0525 },
    { threshold: 27900, rate: 0.055 },
    { threshold: 161550, rate: 0.06 },
    { threshold: 323200, rate: 0.0685 },
    { threshold: 2155350, rate: 0.0965 },
    { threshold: 5000000, rate: 0.103 },
    { threshold: 25000000, rate: 0.109 }
  ]
}

// NYC resident tax brackets for 2024
// Rates range from 3.078% to 3.876%
const nycBrackets: { [key in FilingStatus]: TaxBracket[] } = {
  [FilingStatus.S]: [
    { threshold: 0, rate: 0.03078 },
    { threshold: 12000, rate: 0.03762 },
    { threshold: 25000, rate: 0.03819 },
    { threshold: 50000, rate: 0.03876 }
  ],
  [FilingStatus.MFJ]: [
    { threshold: 0, rate: 0.03078 },
    { threshold: 21600, rate: 0.03762 },
    { threshold: 45000, rate: 0.03819 },
    { threshold: 90000, rate: 0.03876 }
  ],
  [FilingStatus.MFS]: [
    { threshold: 0, rate: 0.03078 },
    { threshold: 12000, rate: 0.03762 },
    { threshold: 25000, rate: 0.03819 },
    { threshold: 50000, rate: 0.03876 }
  ],
  [FilingStatus.HOH]: [
    { threshold: 0, rate: 0.03078 },
    { threshold: 14400, rate: 0.03762 },
    { threshold: 30000, rate: 0.03819 },
    { threshold: 60000, rate: 0.03876 }
  ],
  [FilingStatus.W]: [
    { threshold: 0, rate: 0.03078 },
    { threshold: 21600, rate: 0.03762 },
    { threshold: 45000, rate: 0.03819 },
    { threshold: 90000, rate: 0.03876 }
  ]
}

// NY standard deduction amounts for 2024
const standardDeduction: { [key in FilingStatus]: number } = {
  [FilingStatus.S]: 8000,
  [FilingStatus.MFJ]: 16050,
  [FilingStatus.MFS]: 8000,
  [FilingStatus.HOH]: 11200,
  [FilingStatus.W]: 16050
}

// NY dependent exemption amount
const dependentExemption = 1000

// Yonkers resident surcharge rate (percentage of NY State tax)
const yonkersSurchargeRate = 0.16975

// Yonkers nonresident earnings tax rate
const yonkersNonresidentRate = 0.005

// NY earned income credit is 30% of federal EIC
const earnedIncomeCreditRate = 0.3

// NYC earned income credit is 5% of federal EIC (for full-year NYC residents)
// For part-year or certain scenarios, the rate may differ.
const nycEarnedIncomeCreditRate = 0.05

// NY child and dependent care credit (percentage of federal credit, based on income)
// Simplified: percentage ranges from 20% to 110% of federal credit
const childDependentCareCredit = {
  maxIncomeForFullCredit: 25000,
  percentOfFederalCreditAbove: 0.2,
  percentOfFederalCreditBelow: 1.1
}

// NY Empire State child credit
// $330 per qualifying child for income up to $75,000
const empireStateChildCredit = {
  amountPerChild: 330,
  incomeLimit: 75000
}

const parameters = {
  brackets: nyStateBrackets,
  nycBrackets,
  standardDeduction,
  dependentExemption,
  yonkersSurchargeRate,
  yonkersNonresidentRate,
  earnedIncomeCreditRate,
  nycEarnedIncomeCreditRate,
  childDependentCareCredit,
  empireStateChildCredit
}

export default parameters
