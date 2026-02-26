import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'IN',
  formName: 'IT-40',
  taxRate: 0.0305,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class INForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeINForm = (f1040: StateF1040): INForm => new INForm(f1040)

export default makeINForm
