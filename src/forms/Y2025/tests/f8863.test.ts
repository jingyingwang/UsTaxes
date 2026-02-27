import F1040 from '../irsForms/F1040'
import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  f3922s: [],
  credits: [],
  scheduleCInputs: [],
  homeOfficeInputs: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  form6781: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  netOperatingLossCarryforwards: [],
  itemizedDeductions: undefined,
  form2441Input: undefined,
  w2s: [],
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
      firstName: 'Test',
      lastName: 'User',
      ssid: '123456789',
      role: PersonRole.PRIMARY,
      isBlind: false,
      dateOfBirth: new Date('1990-01-01'),
      isTaxpayerDependent: false
    },
    dependents: [],
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  f1098ts: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  amendedReturns: [],
  depreciableAssets: []
}

describe('Form 8863 (Education Credits) - Y2025 Stub', () => {
  it('should return undefined for l8 (refundable AOTC)', () => {
    const f1040 = new F1040(baseInformation, [])
    expect(f1040.f8863?.l8()).toBeUndefined()
  })

  it('should return undefined for l19 (nonrefundable credit)', () => {
    const f1040 = new F1040(baseInformation, [])
    expect(f1040.f8863?.l19()).toBeUndefined()
  })

  it('should not be instantiated on F1040 (stub form)', () => {
    const f1040 = new F1040(baseInformation, [])
    expect(f1040.f8863).toBeUndefined()
  })
})
