/* eslint @typescript-eslint/no-empty-function: "off" */

import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F6251 from '../irsForms/F6251'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import federalBrackets, { amt } from '../data/federal'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [
    {
      name: 'Stock Option',
      personRole: PersonRole.PRIMARY,
      exercisePricePerShare: 1,
      fmv: 101,
      numShares: 1000
    }
  ],
  credits: [],
  f3922s: [],
  scheduleCInputs: [],
  homeOfficeInputs: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  form6781: [],
  itemizedDeductions: undefined,
  form2441Input: undefined,
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'Test Employer' },
      personRole: PersonRole.PRIMARY,
      occupation: 'Engineer',
      state: 'AL',
      income: 100000,
      medicareIncome: 0,
      fedWithholding: 0,
      ssWages: 100000,
      ssWithholding: 0,
      medicareWithholding: 0,
      stateWages: 100000,
      stateWithholding: 0
    }
  ],
  estimatedTaxes: [],
  realEstate: [],
  royaltyIncomes: [],
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
      dateOfBirth: new Date('01/01/1970'),
      isBlind: false
    },
    spouse: undefined,
    dependents: [],
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  f1098ts: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  netOperatingLossCarryforwards: [],
  amendedReturns: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  depreciableAssets: []
}

describe('AMT', () => {
  it('stock options should trigger AMT', () => {
    const information = cloneDeep(baseInformation)
    const income = baseInformation.w2s[0].income
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(true)
    expect(Math.round(f6251.l1() ?? 0)).toEqual(
      income -
        federalBrackets.ordinary.status[FilingStatus.S].deductions[0].amount
    )
    // ISO adjustment: (101 - 1) * 1000 = 100000
    expect(f6251.l2i()).toEqual(100000)
  })

  it('small stock options should NOT trigger AMT', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s[0].exercisePricePerShare = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(false)
    expect(Math.round(f6251.l11())).toEqual(0)
  })

  it('ESPP (F3922) should NOT affect AMT adjustment', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s = []
    information.f3922s = [
      {
        name: 'ESPP Transfer',
        personRole: PersonRole.PRIMARY,
        fmvPerShareOnGrant: 50,
        fmvPerShareOnExercise: 80,
        exercisePricePerShare: 42.5,
        numShares: 100
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l2i()).toEqual(0)
  })

  it('ISO and ESPP combined: only ISO triggers AMT', () => {
    const information = cloneDeep(baseInformation)
    information.f3922s = [
      {
        name: 'ESPP Transfer',
        personRole: PersonRole.PRIMARY,
        fmvPerShareOnGrant: 50,
        fmvPerShareOnExercise: 80,
        exercisePricePerShare: 42.5,
        numShares: 100
      }
    ]

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    // Only ISO contributes to AMT: (101 - 1) * 1000 = 100000
    expect(f6251.l2i()).toEqual(100000)
    expect(f6251.isNeeded()).toEqual(true)
  })
})

describe('AMT exemption', () => {
  it('returns full exemption when AMTI is below threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 500000)).toEqual(88100)
  })

  it('returns full exemption at exactly the threshold (Single)', () => {
    expect(amt.excemption(FilingStatus.S, 626350)).toEqual(88100)
  })

  it('returns undefined above threshold (Single, phase-out TODO)', () => {
    expect(amt.excemption(FilingStatus.S, 700000)).toBeUndefined()
  })

  it('returns full exemption for MFJ below threshold', () => {
    expect(amt.excemption(FilingStatus.MFJ, 1000000)).toEqual(137000)
    expect(amt.excemption(FilingStatus.MFJ, 1252700)).toEqual(137000)
  })

  it('returns undefined for MFJ above threshold', () => {
    expect(amt.excemption(FilingStatus.MFJ, 1300000)).toBeUndefined()
  })

  it('handles MFS filing status', () => {
    expect(amt.excemption(FilingStatus.MFS, 500000)).toEqual(68500)
    expect(amt.excemption(FilingStatus.MFS, 700000)).toBeUndefined()
  })
})

describe('AMT 26%/28% rate structure', () => {
  it('uses 26% rate when AMT taxable income is at or below cap', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeLessThanOrEqual(amt.cap(FilingStatus.S))
    expect(f6251.l7()).toEqual(l6 * 0.26)
  })

  it('uses 28% rate for AMT taxable income above cap', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s[0].numShares = 10000
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l6 = f6251.l6()
    expect(l6).toBeGreaterThan(amt.cap(FilingStatus.S))
    // l7 = l6 * 0.28 - 4414 (for non-MFS)
    expect(f6251.l7()).toEqual(l6 * 0.28 - 4414)
  })
})

describe('AMT tentative minimum tax vs regular tax', () => {
  it('AMT is zero when tentative minimum tax does not exceed regular tax', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s[0].exercisePricePerShare = 100
    information.f3921s[0].numShares = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.l11()).toEqual(0)
  })

  it('AMT equals excess of tentative minimum tax over regular tax', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    const l9 = f6251.l9()
    const l10 = f6251.l10()
    expect(l9).toBeGreaterThan(l10)
    expect(f6251.l11()).toEqual(l9 - l10)
  })
})
