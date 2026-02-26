import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'NC',
  formName: 'D-400',
  taxRate: 0.045,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class NCForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeNCForm = (f1040: StateF1040): NCForm => new NCForm(f1040)

export default makeNCForm
