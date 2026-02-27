import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const brackets: TaxBracket[] = [
  { threshold: 0, rate: 0.02 },
  { threshold: 3000, rate: 0.03 },
  { threshold: 5000, rate: 0.05 },
  { threshold: 17000, rate: 0.0575 }
]

const parameters = {
  brackets,
  personalExemption: 930
}

export default parameters
