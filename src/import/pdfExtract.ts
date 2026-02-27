import { PDFDocument, PDFField, PDFTextField, PDFCheckBox } from 'pdf-lib'
import {
  IncomeW2,
  Income1099Type,
  Income1099Int,
  Income1099Div,
  Income1099R,
  Income1099SSA,
  F1099IntData,
  F1099DivData,
  F1099RData,
  F1099SSAData,
  PlanType1099,
  ScheduleK1Form1065,
  ScheduleK1Form1120S,
  PersonRole,
  Supported1099
} from 'ustaxes/core/data'

// ---------- helpers ----------

const num = (v: string | undefined): number => {
  if (v === undefined || v === '') return 0
  const cleaned = v.replace(/[$,\s()]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

const str = (v: string | undefined): string => (v ?? '').trim()

const getTextField = (f: PDFField): string | undefined => {
  if (f instanceof PDFTextField) {
    return f.getText()
  }
  return undefined
}

const isChecked = (f: PDFField): boolean => {
  if (f instanceof PDFCheckBox) {
    return f.isChecked()
  }
  return false
}

// ---------- field name → value map from PDF ----------

export interface PdfFieldInfo {
  name: string
  value: string | undefined
  checked: boolean
}

export const extractPdfFields = async (
  data: ArrayBuffer
): Promise<PdfFieldInfo[]> => {
  const pdf = await PDFDocument.load(data)
  const form = pdf.getForm()
  return form.getFields().map((f) => ({
    name: f.getName(),
    value: getTextField(f),
    checked: isChecked(f)
  }))
}

// ---------- form type detection ----------

export type DetectedFormType =
  | 'W-2'
  | '1099-INT'
  | '1099-DIV'
  | '1099-R'
  | '1099-SSA'
  | 'K-1 (1065)'
  | 'K-1 (1120-S)'
  | 'unknown'

// Find field value by partial match on field name.
const findField = (
  fields: PdfFieldInfo[],
  ...patterns: string[]
): string | undefined => {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase()
    const found = fields.find((f) => f.name.toLowerCase().includes(lower))
    if (found?.value !== undefined && found.value !== '') {
      return found.value
    }
  }
  return undefined
}

const findChecked = (
  fields: PdfFieldInfo[],
  ...patterns: string[]
): boolean => {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase()
    const found = fields.find((f) => f.name.toLowerCase().includes(lower))
    if (found !== undefined) return found.checked
  }
  return false
}

export const detectFormType = (fields: PdfFieldInfo[]): DetectedFormType => {
  const names = fields.map((f) => f.name.toLowerCase()).join(' ')

  // W-2: look for wages/tips/compensation + employer fields
  if (
    (names.includes('wages') || names.includes('compensation')) &&
    (names.includes('employer') || names.includes('ein')) &&
    names.includes('withh')
  ) {
    return 'W-2'
  }

  // K-1 Form 1065 (partnership)
  if (
    names.includes('1065') ||
    (names.includes('partner') && names.includes('ordinary'))
  ) {
    return 'K-1 (1065)'
  }

  // K-1 Form 1120-S (S-Corp)
  if (
    names.includes('1120s') ||
    names.includes('1120-s') ||
    (names.includes('s corp') && names.includes('ordinary'))
  ) {
    return 'K-1 (1120-S)'
  }

  // 1099-SSA: social security benefits
  if (names.includes('ssa') || names.includes('social security benefit')) {
    return '1099-SSA'
  }

  // 1099-R: distributions from pensions, annuities, IRAs
  if (
    names.includes('1099-r') ||
    names.includes('1099r') ||
    (names.includes('gross distribution') && names.includes('taxable amount'))
  ) {
    return '1099-R'
  }

  // 1099-DIV: dividends
  if (
    names.includes('1099-div') ||
    names.includes('1099div') ||
    (names.includes('dividend') && names.includes('qualified'))
  ) {
    return '1099-DIV'
  }

  // 1099-INT: interest income
  if (
    names.includes('1099-int') ||
    names.includes('1099int') ||
    (names.includes('interest income') && !names.includes('dividend'))
  ) {
    return '1099-INT'
  }

  return 'unknown'
}

// ---------- extraction per form type ----------

export const extractW2 = (fields: PdfFieldInfo[]): IncomeW2 => ({
  occupation: str(findField(fields, 'occupation', 'job title')),
  income: num(findField(fields, 'wages_tips', 'wages, tips', 'box1', 'f1_10')),
  medicareIncome: num(
    findField(fields, 'medicare_wages', 'medicare wages', 'box5', 'f1_14')
  ),
  fedWithholding: num(
    findField(
      fields,
      'fed_tax',
      'federal_tax',
      'federal income tax',
      'box2',
      'f1_11'
    )
  ),
  ssWages: num(
    findField(fields, 'ss_wages', 'social security wages', 'box3', 'f1_12')
  ),
  ssWithholding: num(
    findField(fields, 'ss_tax', 'social security tax', 'box4', 'f1_13')
  ),
  medicareWithholding: num(
    findField(fields, 'medicare_tax', 'medicare tax withheld', 'box6', 'f1_15')
  ),
  employer: {
    EIN: str(findField(fields, 'employer_ein', 'ein', 'b_ein')),
    employerName: str(
      findField(fields, 'employer_name', 'employer name', 'c_name')
    )
  },
  personRole: PersonRole.PRIMARY
})

const extractPayer = (fields: PdfFieldInfo[]): string =>
  str(
    findField(
      fields,
      'payer_name',
      'payer',
      'filer_name',
      'name_of_payer',
      'corporation',
      'partnership'
    )
  )

export const extract1099Int = (fields: PdfFieldInfo[]): Income1099Int => {
  const form: F1099IntData = {
    income: num(findField(fields, 'interest_income', 'box1', 'interest_paid')),
    taxExemptInterest: num(
      findField(fields, 'tax_exempt', 'box8', 'tax-exempt')
    ),
    earlyWithdrawalPenalty: num(
      findField(fields, 'early_withdrawal', 'box2', 'penalty')
    ),
    privateActivityBondInterest: num(
      findField(fields, 'private_activity', 'box9', 'specified_private')
    )
  }
  return {
    payer: extractPayer(fields),
    type: Income1099Type.INT,
    form,
    personRole: PersonRole.PRIMARY
  }
}

export const extract1099Div = (fields: PdfFieldInfo[]): Income1099Div => {
  const form: F1099DivData = {
    dividends: num(
      findField(
        fields,
        'total_ordinary',
        'ordinary_dividends',
        'box1a',
        'total ordinary dividends'
      )
    ),
    qualifiedDividends: num(
      findField(fields, 'qualified', 'box1b', 'qualified dividends')
    ),
    totalCapitalGainsDistributions: num(
      findField(fields, 'capital_gain', 'box2a', 'total capital gain')
    ),
    foreignTaxPaid: num(findField(fields, 'foreign_tax', 'box7'))
  }
  return {
    payer: extractPayer(fields),
    type: Income1099Type.DIV,
    form,
    personRole: PersonRole.PRIMARY
  }
}

export const extract1099R = (fields: PdfFieldInfo[]): Income1099R => {
  const form: F1099RData = {
    grossDistribution: num(
      findField(fields, 'gross_distribution', 'box1', 'gross distribution')
    ),
    taxableAmount: num(
      findField(fields, 'taxable_amount', 'box2a', 'taxable amount')
    ),
    federalIncomeTaxWithheld: num(
      findField(fields, 'federal_tax', 'box4', 'income tax withheld')
    ),
    planType: findChecked(fields, 'ira', 'IRA/SEP/SIMPLE')
      ? PlanType1099.IRA
      : PlanType1099.Pension
  }
  return {
    payer: extractPayer(fields),
    type: Income1099Type.R,
    form,
    personRole: PersonRole.PRIMARY
  }
}

export const extract1099SSA = (fields: PdfFieldInfo[]): Income1099SSA => {
  const form: F1099SSAData = {
    netBenefits: num(findField(fields, 'net_benefits', 'box5', 'net benefits')),
    federalIncomeTaxWithheld: num(
      findField(fields, 'federal_tax', 'box6', 'voluntary')
    )
  }
  return {
    payer: 'Social Security Administration',
    type: Income1099Type.SSA,
    form,
    personRole: PersonRole.PRIMARY
  }
}

export const extractK1Form1065 = (
  fields: PdfFieldInfo[]
): ScheduleK1Form1065 => ({
  personRole: PersonRole.PRIMARY,
  partnershipName: str(findField(fields, 'partnership_name', 'name_of_part')),
  partnershipEin: str(findField(fields, 'partnership_ein', 'ein')),
  partnerOrSCorp: 'P',
  isForeign: findChecked(fields, 'foreign'),
  isPassive: findChecked(fields, 'passive'),
  ordinaryBusinessIncome: num(
    findField(fields, 'ordinary_business', 'box1', 'line1')
  ),
  interestIncome: num(findField(fields, 'interest_income', 'box5', 'line5')),
  guaranteedPaymentsForServices: num(
    findField(fields, 'guaranteed_services', 'box4a', 'line4a')
  ),
  guaranteedPaymentsForCapital: num(
    findField(fields, 'guaranteed_capital', 'box4b', 'line4b')
  ),
  selfEmploymentEarningsA: num(
    findField(fields, 'self_employment_a', 'box14a', 'line14a')
  ),
  selfEmploymentEarningsB: num(
    findField(fields, 'self_employment_b', 'box14b', 'line14b')
  ),
  selfEmploymentEarningsC: num(
    findField(fields, 'self_employment_c', 'box14c', 'line14c')
  ),
  distributionsCodeAAmount: num(
    findField(fields, 'distributions', 'box19', 'line19')
  ),
  section199AQBI: num(findField(fields, 'section_199a', '199a', 'qbi'))
})

export const extractK1Form1120S = (
  fields: PdfFieldInfo[]
): ScheduleK1Form1120S => ({
  personRole: PersonRole.PRIMARY,
  corporationName: str(
    findField(fields, 'corporation_name', 'name_of_corp', 's_corporation')
  ),
  corporationEin: str(findField(fields, 'corporation_ein', 'ein')),
  isForeign: findChecked(fields, 'foreign'),
  isPassive: findChecked(fields, 'passive'),
  ordinaryBusinessIncome: num(
    findField(fields, 'ordinary_business', 'box1', 'line1')
  ),
  netRentalRealEstateIncome: num(
    findField(fields, 'net_rental_real', 'box2', 'line2')
  ),
  otherNetRentalIncome: num(
    findField(fields, 'other_net_rental', 'box3', 'line3')
  ),
  interestIncome: num(findField(fields, 'interest_income', 'box4', 'line4')),
  ordinaryDividends: num(
    findField(fields, 'ordinary_dividend', 'box5a', 'line5a')
  ),
  qualifiedDividends: num(
    findField(fields, 'qualified_dividend', 'box5b', 'line5b')
  ),
  royalties: num(findField(fields, 'royalties', 'box6', 'line6')),
  netShortTermCapitalGain: num(
    findField(fields, 'short_term', 'box7', 'line7')
  ),
  netLongTermCapitalGain: num(
    findField(fields, 'long_term', 'box8a', 'line8a')
  ),
  section199AQBI: num(findField(fields, 'section_199a', '199a', 'qbi'))
})

// ---------- unified extraction ----------

export type ExtractionResult =
  | { type: 'W-2'; data: IncomeW2 }
  | { type: '1099'; data: Supported1099 }
  | { type: 'K-1 (1065)'; data: ScheduleK1Form1065 }
  | { type: 'K-1 (1120-S)'; data: ScheduleK1Form1120S }
  | { type: 'unknown'; fields: PdfFieldInfo[] }

export const extractFromPdf = async (
  data: ArrayBuffer
): Promise<ExtractionResult> => {
  const fields = await extractPdfFields(data)
  const formType = detectFormType(fields)

  switch (formType) {
    case 'W-2':
      return { type: 'W-2', data: extractW2(fields) }
    case '1099-INT':
      return { type: '1099', data: extract1099Int(fields) }
    case '1099-DIV':
      return { type: '1099', data: extract1099Div(fields) }
    case '1099-R':
      return { type: '1099', data: extract1099R(fields) }
    case '1099-SSA':
      return { type: '1099', data: extract1099SSA(fields) }
    case 'K-1 (1065)':
      return { type: 'K-1 (1065)', data: extractK1Form1065(fields) }
    case 'K-1 (1120-S)':
      return { type: 'K-1 (1120-S)', data: extractK1Form1120S(fields) }
    default:
      return { type: 'unknown', fields }
  }
}
