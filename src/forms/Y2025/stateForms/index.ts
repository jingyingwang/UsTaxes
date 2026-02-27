import F1040 from '../irsForms/F1040'
import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either } from 'ustaxes/core/util'
import { createStateReturn as createStateReturnF } from '../../StateForms'
import { StateFormError } from '../../StateForms'
import makeALForm from './AL/Form'
import makeARForm from './AR/Form'
import makeAZForm from './AZ/Form'
import makeCAForm from './CA/Form'
import makeCOForm from './CO/Form'
import makeCTForm from './CT/Form'
import makeDCForm from './DC/Form'
import makeDEForm from './DE/Form'
import makeGAForm from './GA/Form'
import makeHIForm from './HI/Form'
import makeIAForm from './IA/Form'
import makeIDForm from './ID/Form'
import makeILForm from './IL/Form'
import makeINForm from './IN/Form'
import makeKSForm from './KS/Form'
import makeKYForm from './KY/Form'
import makeLAForm from './LA/Form'
import MAForm from './MA/Form'
import makeMDForm from './MD/Form'
import makeMEForm from './ME/Form'
import makeMIForm from './MI/Form'
import makeMNForm from './MN/Form'
import makeMOForm from './MO/Form'
import makeMSForm from './MS/Form'
import makeMTForm from './MT/Form'
import makeNCForm from './NC/Form'
import makeNDForm from './ND/Form'
import makeNEForm from './NE/Form'
import makeNJForm from './NJ/Form'
import makeNMForm from './NM/Form'
import makeNYIT201 from './NY/Form'
import makeOHForm from './OH/Form'
import makeOKForm from './OK/Form'
import makeORForm from './OR/Form'
import makePAForm from './PA/Form'
import makeRIForm from './RI/Form'
import makeSCForm from './SC/Form'
import makeUTForm from './UT/Form'
import makeVAForm from './VA/Form'
import makeVTForm from './VT/Form'
import makeWIForm from './WI/Form'
import makeWVForm from './WV/Form'

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
  AL: makeALForm,
  AR: makeARForm,
  AZ: makeAZForm,
  CA: makeCAForm,
  CO: makeCOForm,
  CT: makeCTForm,
  DC: makeDCForm,
  DE: makeDEForm,
  GA: makeGAForm,
  HI: makeHIForm,
  IA: makeIAForm,
  ID: makeIDForm,
  IL: makeILForm,
  IN: makeINForm,
  KS: makeKSForm,
  KY: makeKYForm,
  LA: makeLAForm,
  MA: (f1040: F1040) => new MAForm(f1040),
  MD: makeMDForm,
  ME: makeMEForm,
  MI: makeMIForm,
  MN: makeMNForm,
  MO: makeMOForm,
  MS: makeMSForm,
  MT: makeMTForm,
  NC: makeNCForm,
  ND: makeNDForm,
  NE: makeNEForm,
  NJ: makeNJForm,
  NM: makeNMForm,
  NY: makeNYIT201,
  OH: makeOHForm,
  OK: makeOKForm,
  OR: makeORForm,
  PA: makePAForm,
  RI: makeRIForm,
  SC: makeSCForm,
  UT: makeUTForm,
  VA: makeVAForm,
  VT: makeVTForm,
  WI: makeWIForm,
  WV: makeWVForm
}

export const createStateReturn = (
  f1040: F1040
): Either<StateFormError[], StateForm[]> =>
  createStateReturnF<F1040>(noFilingRequirementStates, stateForms)(f1040)
