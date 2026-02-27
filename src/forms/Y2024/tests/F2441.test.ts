import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F2441 from '../irsForms/F2441'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

// Helper to create a child dependent born N years ago
const childBorn = (yearsAgo: number) => ({
  firstName: 'Child',
  lastName: 'Test',
  ssid: '222222222',
  role: PersonRole.DEPENDENT,
  isBlind: false,
  dateOfBirth: new Date(2024 - yearsAgo, 6, 1),
  relationship: 'son',
  qualifyingInfo: { numberOfMonths: 12, isStudent: false }
})

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  credits: [],
  scheduleCInputs: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  form2441Input: {
    careProviders: [
      {
        name: 'ABC Daycare',
        identifyingNumber: '123456789',
        amountPaid: 5000
      }
    ],
    careExpenses: [{ dependentIndex: 0, amount: 5000 }],
    dependentCareBenefits: 0
  },
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'Test Employer' },
      personRole: PersonRole.PRIMARY,
      occupation: 'engineer',
      state: 'AL',
      income: 50000,
      medicareIncome: 50000,
      fedWithholding: 5000,
      ssWages: 50000,
      ssWithholding: 3100,
      medicareWithholding: 725,
      stateWages: 50000,
      stateWithholding: 2000
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
      dateOfBirth: new Date('01/01/1985'),
      isBlind: false
    },
    spouse: undefined,
    dependents: [childBorn(5)], // 5-year-old child
    filingStatus: FilingStatus.S
  },
  questions: {},
  f1098es: [],
  stateResidencies: [{ state: 'AL' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: []
}

describe('Form 2441 - Child and Dependent Care Credit', () => {
  it('should calculate credit for one qualifying child', () => {
    const info = cloneDeep(baseInformation)
    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    expect(f2441).toBeDefined()
    expect(f2441.isNeeded()).toBe(true)
    expect(f2441.numberOfQualifyingPersons()).toBe(1)

    // Expenses limited to $3,000 for one qualifying person
    expect(f2441.l3()).toBe(5000) // total expenses
    expect(f2441.l6()).toBe(3000) // limit for one
    expect(f2441.l7()).toBe(50000) // earned income

    // Line 9: smallest of l5, l6, l7 = min(5000, 3000, 50000) = 3000
    expect(f2441.l9()).toBe(3000)

    // AGI of ~50000: credit rate = max(20, 35 - ceil((50000-15000)/2000)) = 20%
    expect(f2441.l10()).toBe(20)

    // Credit = 3000 * 0.20 = 600
    expect(f2441.credit()).toBe(600)
  })

  it('should calculate higher rate for low AGI', () => {
    const info = cloneDeep(baseInformation)
    info.w2s[0].income = 15000
    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    // AGI <= $15,000: credit rate = 35%
    expect(f2441.l10()).toBe(35)

    // Expenses limited to $3,000, credit = 3000 * 0.35 = 1050
    expect(f2441.credit()).toBe(1050)
  })

  it('should calculate $6,000 limit for two or more qualifying persons', () => {
    const info = cloneDeep(baseInformation)
    info.taxPayer.dependents = [childBorn(5), childBorn(3)]
    info.form2441Input = {
      careProviders: [
        {
          name: 'ABC Daycare',
          identifyingNumber: '123456789',
          amountPaid: 8000
        }
      ],
      careExpenses: [
        { dependentIndex: 0, amount: 4000 },
        { dependentIndex: 1, amount: 4000 }
      ],
      dependentCareBenefits: 0
    }

    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    expect(f2441.numberOfQualifyingPersons()).toBe(2)
    expect(f2441.l3()).toBe(8000) // total expenses
    expect(f2441.l6()).toBe(6000) // limit for two+
    expect(f2441.l9()).toBe(6000) // capped at limit
    expect(f2441.credit()).toBe(6000 * 0.2) // 1200
  })

  it('should not be needed when no form2441Input is provided', () => {
    const info = cloneDeep(baseInformation)
    info.form2441Input = undefined
    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    expect(f2441.isNeeded()).toBe(false)
    expect(f2441.credit()).toBeUndefined()
  })

  it('should exclude child 13 or older', () => {
    const info = cloneDeep(baseInformation)
    info.taxPayer.dependents = [childBorn(14)] // 14-year-old
    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    expect(f2441.numberOfQualifyingPersons()).toBe(0)
    expect(f2441.isNeeded()).toBe(false)
    expect(f2441.credit()).toBeUndefined()
  })

  it('should reduce credit by employer-provided DCFSA benefits', () => {
    const info = cloneDeep(baseInformation)
    info.form2441Input!.dependentCareBenefits = 3000

    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    // Line 3: 5000, Line 4: 3000 (excluded benefits)
    // Line 5: 5000 - 3000 = 2000
    expect(f2441.l3()).toBe(5000)
    expect(f2441.l4()).toBe(3000)
    expect(f2441.l5()).toBe(2000)

    // Line 9: min(2000, 3000, 50000) = 2000
    expect(f2441.l9()).toBe(2000)
    expect(f2441.credit()).toBe(2000 * 0.2) // 400
  })

  it('should use spouse earned income as limiting factor for MFJ', () => {
    const info = cloneDeep(baseInformation)
    info.taxPayer.filingStatus = FilingStatus.MFJ
    info.taxPayer.spouse = {
      firstName: 'Jane',
      lastName: 'Doe',
      ssid: '333333333',
      role: PersonRole.SPOUSE,
      isBlind: false,
      dateOfBirth: new Date('06/15/1985'),
      isTaxpayerDependent: false
    }
    // Spouse has low W-2 income
    info.w2s.push({
      employer: { EIN: '222222222', employerName: 'Spouse Employer' },
      personRole: PersonRole.SPOUSE,
      occupation: 'writer',
      state: 'AL',
      income: 1000, // very low
      medicareIncome: 1000,
      fedWithholding: 0,
      ssWages: 1000,
      ssWithholding: 62,
      medicareWithholding: 15,
      stateWages: 1000,
      stateWithholding: 0
    })

    const f1040 = new F1040(info, [])
    const f2441 = f1040.f2441!

    // Spouse earned income of 1000 limits the credit
    expect(f2441.l8()).toBe(1000)
    // Line 9: min(5000, 3000, 50000, 1000) = 1000
    expect(f2441.l9()).toBe(1000)
  })

  it('should calculate credit percentage at intermediate AGI levels', () => {
    // Test the step function at various AGI levels
    const info = cloneDeep(baseInformation)

    // AGI = $20,000: 35 - ceil((20000-15000)/2000) = 35 - 3 = 32%
    info.w2s[0].income = 20000
    const f1040_20k = new F1040(cloneDeep(info), [])
    expect(f1040_20k.f2441!.creditPercentage()).toBe(32)

    // AGI = $30,000: 35 - ceil((30000-15000)/2000) = 35 - 8 = 27%
    info.w2s[0].income = 30000
    const f1040_30k = new F1040(cloneDeep(info), [])
    expect(f1040_30k.f2441!.creditPercentage()).toBe(27)

    // AGI = $43,001: 35 - ceil((43001-15000)/2000) = 35 - 15 = 20%
    info.w2s[0].income = 43001
    const f1040_43k = new F1040(cloneDeep(info), [])
    expect(f1040_43k.f2441!.creditPercentage()).toBe(20)
  })

  it('should flow credit to Schedule 3 line 2', () => {
    const info = cloneDeep(baseInformation)
    const f1040 = new F1040(info, [])

    expect(f1040.schedule3.l2()).toBe(600)
  })
})
