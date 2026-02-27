import {
  ImportCategory,
  availableCategories,
  buildImportedInfo,
  getImportSummary
} from '../priorYear'
import { blankState } from 'ustaxes/redux/reducer'
import {
  FilingStatus,
  Information,
  PersonRole,
  AccountType
} from 'ustaxes/core/data'

const makePriorInfo = (): Information => ({
  ...blankState,
  taxPayer: {
    filingStatus: FilingStatus.MFJ,
    primaryPerson: {
      firstName: 'John',
      lastName: 'Doe',
      ssid: '123456789',
      role: PersonRole.PRIMARY,
      isBlind: false,
      dateOfBirth: new Date('1985-06-15'),
      address: {
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701'
      },
      isTaxpayerDependent: false
    },
    spouse: {
      firstName: 'Jane',
      lastName: 'Doe',
      ssid: '987654321',
      role: PersonRole.SPOUSE,
      isBlind: false,
      dateOfBirth: new Date('1987-03-20'),
      isTaxpayerDependent: false
    },
    dependents: [
      {
        firstName: 'Jimmy',
        lastName: 'Doe',
        ssid: '111223333',
        role: PersonRole.DEPENDENT,
        isBlind: false,
        dateOfBirth: new Date('2015-01-10'),
        relationship: 'son'
      }
    ],
    contactPhoneNumber: '5551234567',
    contactEmail: 'john@example.com'
  },
  w2s: [
    {
      occupation: 'Engineer',
      income: 100000,
      medicareIncome: 100000,
      fedWithholding: 20000,
      ssWages: 100000,
      ssWithholding: 6200,
      medicareWithholding: 1450,
      personRole: PersonRole.PRIMARY,
      employer: {
        employerName: 'Acme Corp',
        EIN: '123456789'
      }
    }
  ],
  stateResidencies: [{ state: 'IL' }],
  refund: {
    routingNumber: '123456789',
    accountNumber: '987654321',
    accountType: AccountType.checking
  },
  capitalLossCarryforward: { shortTerm: 1000, longTerm: 2000 },
  netOperatingLossCarryforwards: [{ year: 2022, amount: 5000 }],
  individualRetirementArrangements: [
    {
      payer: 'Fidelity',
      personRole: PersonRole.PRIMARY,
      grossDistribution: 5000,
      taxableAmount: 5000,
      taxableAmountNotDetermined: false,
      totalDistribution: false,
      federalIncomeTaxWithheld: 500,
      planType: 'IRA' as const,
      contributions: 6000,
      rolloverContributions: 0,
      rothIraConversion: 0,
      recharacterizedContributions: 0,
      requiredMinimumDistributions: 0,
      lateContributions: 0,
      repayments: 0,
      nondeductibleContributions: 2000,
      priorYearBasis: 10000,
      totalIraValue: 50000,
      rothDistributions: 0,
      rothBasis: 5000
    }
  ],
  f8801Input: {
    priorYearMinimumTaxCredit: 1500,
    priorYearNetMinimumTaxOnExclusionItems: 500
  }
})

describe('priorYear import', () => {
  describe('getImportSummary', () => {
    it('identifies available data in prior year info', () => {
      const priorInfo = makePriorInfo()
      const summary = getImportSummary(priorInfo, 'Y2023')

      expect(summary.year).toBe('Y2023')
      expect(summary.taxpayerName).toBe('John Doe')
      expect(summary.hasDependents).toBe(true)
      expect(summary.hasW2s).toBe(true)
      expect(summary.hasRefund).toBe(true)
      expect(summary.hasCapitalLossCarryforward).toBe(true)
      expect(summary.hasNOLCarryforwards).toBe(true)
      expect(summary.hasIraBasis).toBe(true)
      expect(summary.hasF8801).toBe(true)
      expect(summary.hasStateResidencies).toBe(true)
    })

    it('reports empty data correctly', () => {
      const summary = getImportSummary(blankState, 'Y2023')

      expect(summary.taxpayerName).toBeUndefined()
      expect(summary.hasDependents).toBe(false)
      expect(summary.hasW2s).toBe(false)
      expect(summary.hasRefund).toBe(false)
    })
  })

  describe('availableCategories', () => {
    it('returns all categories for full prior year data', () => {
      const priorInfo = makePriorInfo()
      const summary = getImportSummary(priorInfo, 'Y2023')
      const categories = availableCategories(summary)

      expect(categories).toContain(ImportCategory.TAXPAYER_INFO)
      expect(categories).toContain(ImportCategory.DEPENDENTS)
      expect(categories).toContain(ImportCategory.EMPLOYERS)
      expect(categories).toContain(ImportCategory.REFUND)
      expect(categories).toContain(ImportCategory.CAPITAL_LOSS_CARRYFORWARD)
      expect(categories).toContain(ImportCategory.NOL_CARRYFORWARDS)
      expect(categories).toContain(ImportCategory.IRA_BASIS)
      expect(categories).toContain(ImportCategory.PRIOR_YEAR_AMT_CREDIT)
      expect(categories).toContain(ImportCategory.STATE_RESIDENCIES)
    })

    it('returns empty for blank state', () => {
      const summary = getImportSummary(blankState, 'Y2023')
      const categories = availableCategories(summary)
      expect(categories).toEqual([])
    })
  })

  describe('buildImportedInfo', () => {
    it('imports only taxpayer info when selected', () => {
      const priorInfo = makePriorInfo()
      const result = buildImportedInfo(
        blankState,
        priorInfo,
        new Set([ImportCategory.TAXPAYER_INFO])
      )

      expect(result.taxPayer.primaryPerson?.firstName).toBe('John')
      expect(result.taxPayer.spouse?.firstName).toBe('Jane')
      expect(result.taxPayer.filingStatus).toBe(FilingStatus.MFJ)
      // Dependents should NOT be imported (separate category)
      expect(result.taxPayer.dependents).toEqual([])
      // W2s should NOT be imported
      expect(result.w2s).toEqual([])
    })

    it('imports dependents separately from taxpayer info', () => {
      const priorInfo = makePriorInfo()
      const result = buildImportedInfo(
        blankState,
        priorInfo,
        new Set([ImportCategory.DEPENDENTS])
      )

      expect(result.taxPayer.dependents).toHaveLength(1)
      expect(result.taxPayer.dependents[0].firstName).toBe('Jimmy')
      // Primary person should NOT be imported
      expect(result.taxPayer.primaryPerson).toBeUndefined()
    })

    it('imports employers with zeroed income', () => {
      const priorInfo = makePriorInfo()
      const result = buildImportedInfo(
        blankState,
        priorInfo,
        new Set([ImportCategory.EMPLOYERS])
      )

      expect(result.w2s).toHaveLength(1)
      expect(result.w2s[0].employer?.employerName).toBe('Acme Corp')
      expect(result.w2s[0].occupation).toBe('Engineer')
      // Income amounts should be zeroed
      expect(result.w2s[0].income).toBe(0)
      expect(result.w2s[0].fedWithholding).toBe(0)
      expect(result.w2s[0].ssWages).toBe(0)
    })

    it('imports IRA basis with zeroed current-year amounts', () => {
      const priorInfo = makePriorInfo()
      const result = buildImportedInfo(
        blankState,
        priorInfo,
        new Set([ImportCategory.IRA_BASIS])
      )

      expect(result.individualRetirementArrangements).toHaveLength(1)
      const ira = result.individualRetirementArrangements[0]
      // Basis fields preserved
      expect(ira.priorYearBasis).toBe(10000)
      expect(ira.totalIraValue).toBe(50000)
      expect(ira.rothBasis).toBe(5000)
      // Current-year amounts zeroed
      expect(ira.grossDistribution).toBe(0)
      expect(ira.contributions).toBe(0)
      expect(ira.federalIncomeTaxWithheld).toBe(0)
    })

    it('imports multiple categories together', () => {
      const priorInfo = makePriorInfo()
      const result = buildImportedInfo(
        blankState,
        priorInfo,
        new Set([
          ImportCategory.TAXPAYER_INFO,
          ImportCategory.DEPENDENTS,
          ImportCategory.REFUND,
          ImportCategory.CAPITAL_LOSS_CARRYFORWARD
        ])
      )

      expect(result.taxPayer.primaryPerson?.firstName).toBe('John')
      expect(result.taxPayer.dependents).toHaveLength(1)
      expect(result.refund?.routingNumber).toBe('123456789')
      expect(result.capitalLossCarryforward?.shortTerm).toBe(1000)
      // Non-selected categories should be blank
      expect(result.w2s).toEqual([])
    })

    it('preserves existing current year data for non-imported categories', () => {
      const currentInfo: Information = {
        ...blankState,
        w2s: [
          {
            occupation: 'Existing Job',
            income: 50000,
            medicareIncome: 50000,
            fedWithholding: 10000,
            ssWages: 50000,
            ssWithholding: 3100,
            medicareWithholding: 725,
            personRole: PersonRole.PRIMARY
          }
        ]
      }
      const priorInfo = makePriorInfo()

      const result = buildImportedInfo(
        currentInfo,
        priorInfo,
        new Set([ImportCategory.TAXPAYER_INFO])
      )

      // Should import taxpayer info
      expect(result.taxPayer.primaryPerson?.firstName).toBe('John')
      // Should preserve existing W2s (not selected for import)
      expect(result.w2s).toHaveLength(1)
      expect(result.w2s[0].occupation).toBe('Existing Job')
      expect(result.w2s[0].income).toBe(50000)
    })
  })
})
