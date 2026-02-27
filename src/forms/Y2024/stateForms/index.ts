import F1040 from '../irsForms/F1040'
import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either } from 'ustaxes/core/util'
import { createStateReturn as createStateReturnF } from '../../StateForms'
import { StateFormError } from '../../StateForms'

import alForm from './AL/Form'
import arForm from './AR/Form'
import azForm from './AZ/Form'
import ctForm from './CT/Form'
import dcForm from './DC/Form'
import deForm from './DE/Form'
import hiForm from './HI/Form'
import iaForm from './IA/Form'
import idForm from './ID/Form'
import ksForm from './KS/Form'
import laForm from './LA/Form'
import mdForm from './MD/Form'
import meForm from './ME/Form'
import mnForm from './MN/Form'
import moForm from './MO/Form'
import msForm from './MS/Form'
import mtForm from './MT/Form'
import neForm from './NE/Form'
import nmForm from './NM/Form'
import ndForm from './ND/Form'
import okForm from './OK/Form'
import orForm from './OR/Form'
import riForm from './RI/Form'
import scForm from './SC/Form'
import vtForm from './VT/Form'
import wiForm from './WI/Form'
import wvForm from './WV/Form'

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
  AL: alForm,
  AR: arForm,
  AZ: azForm,
  CT: ctForm,
  DC: dcForm,
  DE: deForm,
  HI: hiForm,
  IA: iaForm,
  ID: idForm,
  KS: ksForm,
  LA: laForm,
  MD: mdForm,
  ME: meForm,
  MN: mnForm,
  MO: moForm,
  MS: msForm,
  MT: mtForm,
  NE: neForm,
  NM: nmForm,
  ND: ndForm,
  OK: okForm,
  OR: orForm,
  RI: riForm,
  SC: scForm,
  VT: vtForm,
  WI: wiForm,
  WV: wvForm
}

export const createStateReturn = (
  f1040: F1040
): Either<StateFormError[], StateForm[]> =>
  createStateReturnF<F1040>(noFilingRequirementStates, stateForms)(f1040)
