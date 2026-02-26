import StateFormBase, {
  flatTaxFieldOrder,
  FlatTaxConfig,
  StateF1040
} from '../StateFormBase'

const config: FlatTaxConfig = {
  state: 'IL',
  formName: 'IL-1040',
  taxRate: 0.0495,
  incomeBase: 'agi',
  pdfFields: flatTaxFieldOrder
}

export class ILForm extends StateFormBase {
  constructor(f1040: StateF1040) {
    super(f1040, config)
  }

  additions = (): number => 0

  subtractions = (): number => 0
}

const makeILForm = (f1040: StateF1040): ILForm => new ILForm(f1040)

export default makeILForm
