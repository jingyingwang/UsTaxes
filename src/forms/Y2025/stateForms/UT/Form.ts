import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'UT',
  formName: 'TC-40',
  taxRate: 0.0465,
  incomeBase: 'taxable',
  pdfFields: flatTaxFieldOrder
}

export class UTForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeUTForm = (f1040: StateF1040): UTForm => new UTForm(f1040)

export default makeUTForm
