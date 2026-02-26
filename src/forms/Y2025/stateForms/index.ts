import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either } from 'ustaxes/core/util'
import { createStateReturn as createStateReturnF } from '../../StateForms'
import { StateFormError } from '../../StateForms'
import { StateF1040 } from './StateFormBase'

import makeCOForm from './CO/Form'
import makeILForm from './IL/Form'
import makeINForm from './IN/Form'
import makeKYForm from './KY/Form'
import makeMIForm from './MI/Form'
import makeNCForm from './NC/Form'
import makePAForm from './PA/Form'
import makeUTForm from './UT/Form'

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
  [K in State]?: (f1040: StateF1040) => StateForm
} = {
  CO: makeCOForm,
  IL: makeILForm,
  IN: makeINForm,
  KY: makeKYForm,
  MI: makeMIForm,
  NC: makeNCForm,
  PA: makePAForm,
  UT: makeUTForm
}

export const createStateReturn = (
  f1040: StateF1040
): Either<StateFormError[], StateForm[]> =>
  createStateReturnF<StateF1040>(noFilingRequirementStates, stateForms)(f1040)
