import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'PA',
  formName: 'PA-40',
  taxRate: 0.0307,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class PAForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makePAForm = (f1040: StateF1040): PAForm => new PAForm(f1040)

export default makePAForm
