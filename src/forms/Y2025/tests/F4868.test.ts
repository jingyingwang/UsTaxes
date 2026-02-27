import {
  FilingStatus,
  Income1099Type,
  PersonRole,
  PlanType1099
} from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import F4868 from '../irsForms/F4868'

const buildInfo = (): ValidatedInformation => ({
  f1099s: [
    {
      payer: 'Test Payer',
      type: Income1099Type.R,
      form: {
        grossDistribution: 0,
        taxableAmount: 0,
        federalIncomeTaxWithheld: 200,
        planType: PlanType1099.IRA
      },
      personRole: PersonRole.PRIMARY
    }
  ],
  w2s: [
    {
      occupation: 'Engineer',
      income: 100000,
      medicareIncome: 100000,
      fedWithholding: 500,
      ssWages: 100000,
      ssWithholding: 6200,
      medicareWithholding: 1450,
      personRole: PersonRole.PRIMARY
    }
  ],
  realEstate: [],
  estimatedTaxes: [{ label: 'Q1', payment: 100 }],
  f1098es: [],
  f3921s: [],
  scheduleCInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  taxPayer: {
    filingStatus: FilingStatus.S,
    primaryPerson: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      ssid: '123-45-6789',
      role: PersonRole.PRIMARY,
      isBlind: false,
      dateOfBirth: new Date('1990-01-01'),
      address: {
        address: '1 Main St',
        city: 'Townsville',
        state: 'CA',
        zip: '12345'
      },
      isTaxpayerDependent: false
    },
    dependents: []
  },
  questions: {},
  credits: [],
  stateResidencies: [],
  healthSavingsAccounts: [],
  individualRetirementArrangements: []
})

describe('F4868', () => {
  it('computes payments and balance due', () => {
    const info = buildInfo()
    const form = new F4868(info, { estimatedTaxLiability: 2000 })

    expect(form.l5()).toBe(800)
    expect(form.l6()).toBe(1200)
    expect(form.l7()).toBe(1200)

    const fields = form.fields()
    expect(fields[3]).toBe('Ada Lovelace')
    expect(fields[8]).toBe('123-45-6789')
    expect(fields[10]).toBe(2000)
    expect(fields[11]).toBe(800)
    expect(fields[12]).toBe(1200)
    expect(fields[13]).toBe(1200)
  })
})
