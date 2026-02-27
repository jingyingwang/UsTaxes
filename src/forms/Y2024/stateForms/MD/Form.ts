import MDForm from './MDForm'
import F1040 from '../../irsForms/F1040'

export default (f1040: F1040): MDForm => new MDForm(f1040)
