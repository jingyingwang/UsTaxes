import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F1040X from '../irsForms/F1040X'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  credits: [],
  scheduleCInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'Test Employer' },
      personRole: PersonRole.PRIMARY,
      occupation: 'engineer',
      state: 'CA',
      income: 80000,
      medicareIncome: 80000,
      fedWithholding: 12000,
      ssWages: 80000,
      ssWithholding: 4960,
      medicareWithholding: 1160,
      stateWages: 80000,
      stateWithholding: 4000
    }
  ],
  estimatedTaxes: [],
  realEstate: [],
  taxPayer: {
    primaryPerson: {
      address: {
        address: '123 Main St',
        aptNo: '',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102'
      },
      firstName: 'John',
      lastName: 'Doe',
      isTaxpayerDependent: false,
      role: PersonRole.PRIMARY,
      ssid: '123456789',
      dateOfBirth: new Date('1985-06-15'),
      isBlind: false
    },
    spouse: undefined,
    dependents: [],
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  stateResidencies: [{ state: 'CA' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: [],
  amendedReturns: []
}

describe('Form 1040X', () => {
  it('should not be needed when no amended return data exists', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)
    expect(f1040x.isNeeded()).toBe(false)
  })

  it('should be needed when amended return data exists', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Correcting reported wages',
        lines: [
          {
            lineDescription: '1',
            columnA: 75000,
            columnB: 5000,
            explanation: 'Additional W-2 income discovered'
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)
    expect(f1040x.isNeeded()).toBe(true)
  })

  it('should compute Column C as Column A + Column B', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Correcting AGI and deductions',
        lines: [
          {
            lineDescription: '1',
            columnA: 75000,
            columnB: 5000,
            explanation: 'Additional income'
          },
          {
            lineDescription: '2',
            columnA: 14600,
            columnB: 0,
            explanation: ''
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    // Line 1: AGI
    expect(f1040x.l1a()).toBe(75000) // Column A
    expect(f1040x.l1b()).toBe(5000) // Column B
    expect(f1040x.l1c()).toBe(80000) // Column C = A + B

    // Line 2: Deductions
    expect(f1040x.l2a()).toBe(14600)
    expect(f1040x.l2b()).toBe(0)
    expect(f1040x.l2c()).toBe(14600)

    // Line 3: AGI minus deductions
    expect(f1040x.l3a()).toBe(75000 - 14600)
    expect(f1040x.l3b()).toBe(5000 - 0)
    expect(f1040x.l3c()).toBe(80000 - 14600)
  })

  it('should handle negative changes (decreases)', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Overstated income',
        lines: [
          {
            lineDescription: '1',
            columnA: 80000,
            columnB: -5000,
            explanation: 'Income was overstated'
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    expect(f1040x.l1a()).toBe(80000)
    expect(f1040x.l1b()).toBe(-5000)
    expect(f1040x.l1c()).toBe(75000)
  })

  it('should compute refund when payments exceed tax', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Additional payments found',
        lines: [
          {
            lineDescription: '6',
            columnA: 10000,
            columnB: 0,
            explanation: ''
          },
          {
            lineDescription: '11',
            columnA: 12000,
            columnB: 2000,
            explanation: 'Found additional withholding'
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    // Line 10 = Line 8 + Line 9 = (Line 6 - Line 7) + Line 9
    expect(f1040x.l10c()).toBe(10000) // Total tax
    expect(f1040x.l11c()).toBe(14000) // Total payments
    expect(f1040x.l12()).toBe(4000) // Overpayment
    expect(f1040x.l15()).toBe(0) // Nothing owed
  })

  it('should compute amount owed when tax exceeds payments', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Additional tax owed',
        lines: [
          {
            lineDescription: '6',
            columnA: 10000,
            columnB: 3000,
            explanation: 'Tax increased'
          },
          {
            lineDescription: '11',
            columnA: 10000,
            columnB: 0,
            explanation: ''
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    expect(f1040x.l10c()).toBe(13000)
    expect(f1040x.l11c()).toBe(10000)
    expect(f1040x.l12()).toBe(0) // No overpayment
    expect(f1040x.l15()).toBe(3000) // Amount owed
  })

  it('should return correct Part III explanation', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation:
          'Received corrected W-2 showing additional wages not originally reported.',
        lines: [
          {
            lineDescription: '1',
            columnA: 75000,
            columnB: 5000,
            explanation: ''
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    expect(f1040x.partIIIExplanation()).toBe(
      'Received corrected W-2 showing additional wages not originally reported.'
    )
    expect(f1040x.taxYearAmended()).toBe('2023')
  })

  it('should produce a fields array', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Test explanation',
        lines: [
          {
            lineDescription: '1',
            columnA: 75000,
            columnB: 5000,
            explanation: ''
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const f1040x = new F1040X(f1040)

    const fields = f1040x.fields()
    expect(fields.length).toBeGreaterThan(0)
    // First field is the name string
    expect(typeof fields[0]).toBe('string')
  })

  it('should not include F1040X in schedules when not needed', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const schedules = f1040.schedules()
    const hasF1040X = schedules.some((s) => s.tag === 'f1040x')
    expect(hasF1040X).toBe(false)
  })

  it('should include F1040X in schedules when needed', () => {
    const information = cloneDeep(baseInformation)
    information.amendedReturns = [
      {
        taxYearAmended: '2023',
        filingStatus: FilingStatus.S,
        partIIIExplanation: 'Amended',
        lines: [
          {
            lineDescription: '1',
            columnA: 75000,
            columnB: 5000,
            explanation: ''
          }
        ]
      }
    ]
    const f1040 = new F1040(information, [])
    const schedules = f1040.schedules()
    const hasF1040X = schedules.some((s) => s.tag === 'f1040x')
    expect(hasF1040X).toBe(true)
  })
})
