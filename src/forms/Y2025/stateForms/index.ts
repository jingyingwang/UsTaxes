import F1040 from '../irsForms/F1040'
import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either } from 'ustaxes/core/util'
import { createStateReturn as createStateReturnF } from '../../StateForms'
import { StateFormError } from '../../StateForms'
import makeCOForm from './CO/Form'
import makeGAForm from './GA/Form'
import makeILForm from './IL/Form'
import makeINForm from './IN/Form'
import makeKYForm from './KY/Form'
import MAForm from './MA/Form'
import makeMIForm from './MI/Form'
import makeNCForm from './NC/Form'
import makeNJForm from './NJ/Form'
import makeOHForm from './OH/Form'
import makePAForm from './PA/Form'
import makeUTForm from './UT/Form'
import makeVAForm from './VA/Form'

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
  CO: makeCOForm,
  GA: makeGAForm,
  IL: makeILForm,
  IN: makeINForm,
  KY: makeKYForm,
  MA: (f1040: F1040) => new MAForm(f1040),
  MI: makeMIForm,
  NC: makeNCForm,
  NJ: makeNJForm,
  OH: makeOHForm,
  PA: makePAForm,
  UT: makeUTForm,
  VA: makeVAForm
}

export const createStateReturn = (
  f1040: F1040
): Either<StateFormError[], StateForm[]> =>
  createStateReturnF<F1040>(noFilingRequirementStates, stateForms)(f1040)
