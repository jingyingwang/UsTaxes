/* eslint @typescript-eslint/no-empty-function: "off" */

import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import { CURRENT_YEAR, healthSavingsAccounts } from '../data/federal'
import F8889 from '../irsForms/F8889'
import { cloneDeep } from 'lodash'
import F1040 from '../irsForms/F1040'
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
  royaltyIncomes: [],
  f1098es: [],
  f1098ts: [],
  individualRetirementArrangements: [],
  amendedReturns: [],
  depreciableAssets: [],
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'Test Employer' },
      personRole: PersonRole.SPOUSE,
      occupation: 'Engineer',
      state: 'AL',
      income: 111,
      medicareIncome: 222,
      fedWithholding: 333,
      ssWages: 111,
      ssWithholding: 444,
      medicareWithholding: 555,
      stateWages: 666,
      stateWithholding: 777
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
      dateOfBirth: new Date('01/01/1970'),
      isBlind: false
    },
    spouse: {
      firstName: 'Jane',
      isTaxpayerDependent: false,
      lastName: 'Doe',
      role: PersonRole.SPOUSE,
      ssid: '222222222',
      dateOfBirth: new Date('01/01/1970'),
      isBlind: false
    },
    dependents: [],
    filingStatus: FilingStatus.MFS
  },
  questions: {},
  f1098es: [],
  f1098ts: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: []
}

describe('Health Savings Accounts (F8889)', () => {
  it('should not need form 8889 if there are no health savings accounts', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.isNeeded()).toEqual(false)
  })

  it('should have a max contribution limit when covered for all months', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.fullYearHsa()).toEqual(true)
    expect(f8889.lastMonthCoverage()).toEqual('self-only')
    expect(f8889.contributionLimit()).toEqual(
      healthSavingsAccounts.contributionLimit['self-only']
    )
    expect(f8889.calculatedCoverageType).toEqual('self-only')
  })

  it('should select family coverage when both are options', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      },
      {
        coverageType: 'family',
        contributions: 8550,
        personRole: PersonRole.SPOUSE,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.fullYearHsa()).toEqual(true)
    expect(f8889.lastMonthCoverage()).toEqual('family')
    expect(f8889.contributionLimit()).toEqual(
      healthSavingsAccounts.contributionLimit['family']
    )
    expect(f8889.calculatedCoverageType).toEqual('family')
  })

  it('should calculate a partial contribution limit correctly with a single HSA', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'family',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 5, 30),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.fullYearHsa()).toEqual(false)
    expect(f8889.contributionLimit()).toEqual(
      Math.round((healthSavingsAccounts.contributionLimit['family'] * 6) / 12)
    )
    expect(f8889.calculatedCoverageType).toEqual('family')
  })

  it('should calculate a partial contribution limit correctly with multiple HSAs', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'family',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 5, 30),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      },
      {
        coverageType: 'self-only',
        contributions: 1750,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 6, 1),
        endDate: new Date(CURRENT_YEAR, 10, 30),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.fullYearHsa()).toEqual(false)
    expect(f8889.contributionLimit()).toEqual(
      Math.round(
        (healthSavingsAccounts.contributionLimit['family'] * 6) / 12 +
          (healthSavingsAccounts.contributionLimit['self-only'] * 5) / 12
      )
    )
    expect(f8889.calculatedCoverageType).toEqual('family')
  })

  it('should not apply the last-month rule if coverage ends before December 1', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 100,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 9, 1),
        endDate: new Date(CURRENT_YEAR, 10, 30),
        label: 'ended early',
        totalDistributions: 0,
        qualifiedDistributions: 0
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.lastMonthRule()).toEqual(false)
    expect(f8889.lastMonthCoverage()).toEqual(undefined)
    // Only covered Oct-Nov (2 months)
    expect(f8889.contributionLimit()).toEqual(
      Math.round(
        (healthSavingsAccounts.contributionLimit['self-only'] * 2) / 12
      )
    )
  })

  it('should split the family contribution correctly', () => {
    const information = cloneDeep(baseInformation)
    // Family coverage Jan-May, self-only Jun-Dec (last month rule applies: self-only on Dec 1)
    information.healthSavingsAccounts = [
      {
        coverageType: 'family',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 4, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      },
      {
        coverageType: 'self-only',
        contributions: 1750,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 5, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]
    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    // With last-month rule (self-only through Dec), the contribution limit is the
    // full self-only annual limit, and splitFamilyContributionLimit returns that value
    expect(f8889.splitFamilyContributionLimit()).toEqual(
      healthSavingsAccounts.contributionLimit['self-only']
    )
    expect(f8889.calculatedCoverageType).toEqual('self-only')
  })

  it('should calculate additional tax on nonqualified distributions', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 0,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'distributions',
        totalDistributions: 1000,
        qualifiedDistributions: 600
      }
    ]

    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.l16()).toEqual(400)
    expect(f8889.l17b()).toEqual(80)
  })

  it('should apply employer contributions to only the form belonging to the right person', () => {
    const information = cloneDeep(baseInformation)
    information.w2s[0].box12 = { W: 4000 }
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      },
      {
        coverageType: 'self-only',
        contributions: 4300,
        personRole: PersonRole.SPOUSE,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 500,
        qualifiedDistributions: 500
      }
    ]
    const f1040 = new F1040(information, [])

    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)
    expect(f8889.l9()).toEqual(0)

    if (information.taxPayer.spouse !== undefined) {
      const f8889spouse = new F8889(f1040, information.taxPayer.spouse)
      expect(f8889spouse.l9()).toEqual(4000)
    }
  })

  it('should produce valid fields array', () => {
    const information = cloneDeep(baseInformation)
    information.healthSavingsAccounts = [
      {
        coverageType: 'self-only',
        contributions: 4300,
        personRole: PersonRole.PRIMARY,
        startDate: new Date(CURRENT_YEAR, 0, 1),
        endDate: new Date(CURRENT_YEAR, 11, 31),
        label: 'test',
        totalDistributions: 0,
        qualifiedDistributions: 0
      }
    ]
    const f1040 = new F1040(information, [])
    const f8889 = new F8889(f1040, information.taxPayer.primaryPerson)

    const fields = f8889.fields()
    expect(fields.length).toEqual(27)
    expect(fields[0]).toEqual('John Doe')
    expect(fields[1]).toEqual('111111111')
  })
})
