import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'CO',
  formName: 'DR-0104',
  taxRate: 0.044,
  incomeBase: 'taxable',
  pdfFields: flatTaxFieldOrder
}

export class COForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeCOForm = (f1040: StateF1040): COForm => new COForm(f1040)

export default makeCOForm
