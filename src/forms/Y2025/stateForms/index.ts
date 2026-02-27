import F1040 from '../irsForms/F1040'
import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either } from 'ustaxes/core/util'
import { createStateReturn as createStateReturnF } from '../../StateForms'
import { StateFormError } from '../../StateForms'
import MAForm from './MA/Form'
import makeGAForm from './GA/Form'
import makeNJForm from './NJ/Form'
import makeOHForm from './OH/Form'
import makeVAForm from './VA/Form'
import makeNYIT201 from './NY/Form'

export const noFilingRequirementStates: State[] = [
  'AK',
  'TN',
  'WY',
  'FL',
  'NH',
  'SD',
  'TX',
  'WA',
  'NV'
]

export const stateForms: {
  [K in State]?: (f1040: F1040) => StateForm
} = {
  GA: makeGAForm,
  MA: (f1040: F1040) => new MAForm(f1040),
  NJ: makeNJForm,
  NY: makeNYIT201,
  OH: makeOHForm,
  VA: makeVAForm
}

export const createStateReturn = (
  f1040: F1040
): Either<StateFormError[], StateForm[]> =>
  createStateReturnF<F1040>(noFilingRequirementStates, stateForms)(f1040)
