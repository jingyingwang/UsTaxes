import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

const brackets: TaxBracket[] = [
  { threshold: 0, rate: 0 },
  { threshold: 26050, rate: 0.02765 },
  { threshold: 100000, rate: 0.035 }
]

const parameters = {
  brackets
}

export default parameters
