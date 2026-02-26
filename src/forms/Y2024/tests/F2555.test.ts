import {
  FilingStatus,
  ForeignEarnedIncomeExclusion,
  Information,
  PersonRole
} from 'ustaxes/core/data'
import { daysInYear } from 'ustaxes/core/util'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import F1040 from '../irsForms/F1040'
import { computeOrdinaryTax } from '../irsForms/TaxTable'
import { CURRENT_YEAR, foreignEarnedIncomeExclusion } from '../data/federal'

const baseInfo = (
  foreignEarnedIncomeExclusion?: ForeignEarnedIncomeExclusion
): Information => ({
  f1099s: [],
  w2s: [
    {
      occupation: 'Engineer',
      income: 200000,
      medicareIncome: 200000,
      fedWithholding: 0,
      ssWages: 200000,
      ssWithholding: 0,
      medicareWithholding: 0,
      personRole: PersonRole.PRIMARY
    }
  ],
  realEstate: [],
  estimatedTaxes: [],
  f1098es: [],
  f3921s: [],
  scheduleCInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  refund: undefined,
  taxPayer: {
    filingStatus: FilingStatus.S,
    dependents: [],
    primaryPerson: {
      firstName: 'A',
      lastName: 'B',
      ssid: '111111111',
      role: PersonRole.PRIMARY,
      isBlind: false,
      dateOfBirth: new Date(1990, 0, 1),
      isTaxpayerDependent: false,
      address: {
        address: '1 Main',
        city: 'Town',
        state: 'CA',
        zip: '90001'
      }
    }
  },
  questions: {},
  credits: [],
  stateResidencies: [],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  foreignEarnedIncomeExclusion
})

describe('F2555', () => {
  it('applies stacking rule for bona fide residence', () => {
    const fei: ForeignEarnedIncomeExclusion = {
      taxHomeInForeignCountry: true,
      bonaFideResidence: true,
      physicalPresenceDays: 0,
      foreignEarnedIncome: 150000,
      housingExpenses: 0,
      isSelfEmployed: false
    }

    const info = baseInfo(fei)
    const f1040 = new F1040(info as ValidatedInformation, [])
    const f2555 = f1040.f2555

    expect(f2555).toBeDefined()
    if (f2555 === undefined) {
      return
    }

    const exclusions = f2555.l45() + f2555.l50()
    const line2c = Math.max(0, exclusions - (fei.disallowedDeductions ?? 0))
    const expectedTax =
      computeOrdinaryTax(FilingStatus.S, f1040.l15() + line2c) -
      computeOrdinaryTax(FilingStatus.S, line2c)

    expect(f1040.l16()).toBe(expectedTax)
  })

  it('prorates limits and computes housing deduction for physical presence', () => {
    const fei: ForeignEarnedIncomeExclusion = {
      taxHomeInForeignCountry: true,
      bonaFideResidence: false,
      physicalPresenceDays: 330,
      qualifyingDays: 180,
      foreignEarnedIncome: 100000,
      housingExpenses: 40000,
      isSelfEmployed: true
    }

    const info = baseInfo(fei)
    const f1040 = new F1040(info as ValidatedInformation, [])
    const f2555 = f1040.f2555

    expect(f2555).toBeDefined()
    if (f2555 === undefined) {
      return
    }

    const qualifyingDays = fei.qualifyingDays ?? 0
    const ratio = qualifyingDays / daysInYear(CURRENT_YEAR)
    const housingBase =
      foreignEarnedIncomeExclusion.exclusionLimit *
      foreignEarnedIncomeExclusion.housingBaseRate *
      ratio
    const housingMax =
      foreignEarnedIncomeExclusion.exclusionLimit *
      foreignEarnedIncomeExclusion.housingMaxRate *
      ratio
    const housingAmount = Math.max(
      0,
      Math.min(fei.housingExpenses, housingMax) - housingBase
    )
    const feieLimit = foreignEarnedIncomeExclusion.exclusionLimit * ratio
    const feie = Math.min(
      Math.max(0, fei.foreignEarnedIncome - housingAmount),
      feieLimit
    )

    expect(f2555.l45()).toBeCloseTo(feie, 6)
    expect(f2555.l50()).toBeCloseTo(housingAmount, 6)
  })
})
