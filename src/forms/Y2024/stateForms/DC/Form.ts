import StateFormBase from 'ustaxes/core/stateForms/StateFormBase'
import { DC } from '../progressiveConfigs'
import F1040 from '../../irsForms/F1040'

export default (f1040: F1040): StateFormBase => new StateFormBase(f1040, DC)
