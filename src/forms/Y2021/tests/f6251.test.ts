/* eslint @typescript-eslint/no-empty-function: "off" */

import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F6251 from '../irsForms/F6251'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

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
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  form6781: [],
  itemizedDeductions: undefined,
  form2441Input: undefined,
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'w2s employer name' },
      personRole: PersonRole.PRIMARY,
      occupation: 'w2s-occupation',
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
        address: '0001',
        aptNo: '',
        city: 'AR city',
        state: 'AR',
        zip: '1234567'
      },
      firstName: 'payer-first-name',
      lastName: 'payer-last-name',
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
    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(true)
    expect(Math.round(f6251.l1() ?? 0)).toEqual(87450)
    expect(Math.round(f6251.l7() ?? 0)).toEqual(32864)
    expect(Math.round(f6251.l10())).toEqual(15015)
    expect(Math.round(f6251.l11())).toEqual(17849)
  })

  it('small stock options should NOT trigger AMT', () => {
    const information = cloneDeep(baseInformation)
    information.f3921s[0].exercisePricePerShare = 100

    const f1040 = new F1040(information, [])
    const f6251 = new F6251(f1040)
    expect(f6251.isNeeded()).toEqual(false)
    expect(Math.round(f6251.l1() ?? 0)).toEqual(87450)
    expect(Math.round(f6251.l7() ?? 0)).toEqual(7124)
    expect(Math.round(f6251.l10())).toEqual(15015)
    expect(Math.round(f6251.l11())).toEqual(0)
  })
})
