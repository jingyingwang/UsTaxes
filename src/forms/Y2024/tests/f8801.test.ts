import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  credits: [],
  scheduleCInputs: [],
  homeOfficeInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'employer' },
      personRole: PersonRole.PRIMARY,
      occupation: 'occupation',
      state: 'AL',
      income: 150000,
      medicareIncome: 150000,
      fedWithholding: 30000,
      ssWages: 150000,
      ssWithholding: 0,
      medicareWithholding: 0,
      stateWages: 150000,
      stateWithholding: 0
    }
  ],
  estimatedTaxes: [],
  realEstate: [],
  taxPayer: {
    primaryPerson: {
      address: {
        address: '123 Main St',
        aptNo: '',
        city: 'Anytown',
        state: 'AL',
        zip: '12345'
      },
      firstName: 'John',
      lastName: 'Doe',
      isTaxpayerDependent: false,
      role: PersonRole.PRIMARY,
      ssid: '111111111',
      dateOfBirth: new Date('01/01/1980'),
      isBlind: false
    },
    spouse: undefined,
    dependents: [],
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  royaltyIncomes: [],
  f1098ts: [],
  f3922s: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  form6781: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  form2441Input: undefined,
  netOperatingLossCarryforwards: [],
  amendedReturns: [],
  depreciableAssets: []
}

describe('Form 8801', () => {
  it('should not be needed when no f8801Input is provided', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    expect(f1040.f8801.isNeeded()).toEqual(false)
    expect(f1040.f8801.credit()).toEqual(0)
  })

  it('should not be needed when priorYearMinimumTaxCredit is 0', () => {
    const information = cloneDeep(baseInformation)
    information.f8801Input = {
      priorYearMinimumTaxCredit: 0,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])
    expect(f1040.f8801.isNeeded()).toEqual(false)
    expect(f1040.f8801.credit()).toEqual(0)
  })

  it('should be needed when priorYearMinimumTaxCredit > 0', () => {
    const information = cloneDeep(baseInformation)
    information.f8801Input = {
      priorYearMinimumTaxCredit: 5000,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])
    expect(f1040.f8801.isNeeded()).toEqual(true)
  })

  it('should limit credit to regular tax minus TMT', () => {
    const information = cloneDeep(baseInformation)
    // Large carryforward — credit will be limited by tax liability
    information.f8801Input = {
      priorYearMinimumTaxCredit: 1000000,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])
    const f8801 = f1040.f8801

    // l17 is the regular tax liability, l16 is TMT
    const regularTax = f8801.l17()
    const tmt = f8801.l16()
    const maxCredit = Math.max(0, regularTax - tmt)

    expect(f8801.credit()).toEqual(maxCredit)
    // carryforward should be the remainder
    expect(f8801.l25()).toEqual(1000000 - maxCredit)
  })

  it('should allow full credit when carryforward is small enough', () => {
    const information = cloneDeep(baseInformation)
    // Small carryforward — should be fully usable
    information.f8801Input = {
      priorYearMinimumTaxCredit: 100,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])
    const f8801 = f1040.f8801

    expect(f8801.credit()).toEqual(100)
    expect(f8801.l25()).toEqual(0) // No carryforward remaining
  })

  it('should flow credit to Schedule 3 line 6j', () => {
    const information = cloneDeep(baseInformation)
    information.f8801Input = {
      priorYearMinimumTaxCredit: 500,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])

    expect(f1040.schedule3.l6j()).toEqual(500)
    // Schedule 3 should be needed
    expect(f1040.schedule3.isNeeded()).toEqual(true)
  })

  it('should work alongside AMT from ISO exercises', () => {
    const information = cloneDeep(baseInformation)
    // ISO exercises create current-year AMT via F6251
    information.f3921s = [
      {
        name: 'Stock Option',
        personRole: PersonRole.PRIMARY,
        exercisePricePerShare: 1,
        fmv: 101,
        numShares: 1000
      }
    ]
    // Prior year AMT credit carryforward
    information.f8801Input = {
      priorYearMinimumTaxCredit: 3000,
      priorYearNetMinimumTaxOnExclusionItems: 0
    }
    const f1040 = new F1040(information, [])

    // F6251 should be needed (both for current AMT and because F8801 is needed)
    expect(f1040.f6251.isNeeded()).toEqual(true)
    expect(f1040.f8801.isNeeded()).toEqual(true)

    // Credit should be non-negative
    expect(f1040.f8801.credit()).toBeGreaterThanOrEqual(0)
    // Carryforward should be non-negative
    expect(f1040.f8801.l25()).toBeGreaterThanOrEqual(0)
    // Credit + carryforward should equal original MTC
    expect(f1040.f8801.credit() + f1040.f8801.l25()).toEqual(3000)
  })
})
