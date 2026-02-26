import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'MI',
  formName: 'MI-1040',
  taxRate: 0.0425,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class MIForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeMIForm = (f1040: StateF1040): MIForm => new MIForm(f1040)

export default makeMIForm
