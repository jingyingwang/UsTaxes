import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'KY',
  formName: '740',
  taxRate: 0.04,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class KYForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeKYForm = (f1040: StateF1040): KYForm => new KYForm(f1040)

export default makeKYForm
