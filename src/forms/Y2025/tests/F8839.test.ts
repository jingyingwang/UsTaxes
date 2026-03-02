import { FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F8839 from '../irsForms/F8839'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

// Form 8839 (2025) constants
const MAX_CREDIT = 17280
const PHASE_OUT_START = 239230
const PHASE_OUT_RANGE = 40000

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
      employer: { EIN: '111111111', employerName: 'Acme Corp' },
      personRole: PersonRole.PRIMARY,
      occupation: 'Engineer',
      state: 'AL',
      income: 50000,
      medicareIncome: 50000,
      fedWithholding: 5000,
      ssWages: 50000,
      ssWithholding: 3100,
      medicareWithholding: 725,
      stateWages: 50000,
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
      firstName: 'Jane',
      lastName: 'Smith',
      isTaxpayerDependent: false,
      role: PersonRole.PRIMARY,
      ssid: '123456789',
      dateOfBirth: new Date('1980-06-15'),
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
  depreciableAssets: [],
  f8839Input: {
    adoptions: [
      {
        childName: 'Baby Smith',
        yearOfBirth: 2025,
        isSpecialNeeds: false,
        isForeignAdoption: false,
        qualifyingExpenses: 10000,
        employerBenefitsReceived: 0,
        priorYearEmployerBenefitsExcluded: 0
      }
    ],
    priorYearCreditCarryforward: 0
  }
}

describe('Form 8839 - Qualified Adoption Expenses Credit (2025)', () => {
  describe('Part I: Maximum credit per child', () => {
    it('should return $17,280 as max credit for any child', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      expect(f8839.partIColE(child)).toEqual(MAX_CREDIT)
    })
  })

  describe('Part II: Adoption Credit per-child rows', () => {
    it('should use actual expenses for non-special-needs child (Row 2)', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 1: max credit
      expect(f8839.partIIRow1(child)).toEqual(MAX_CREDIT)
      // Row 2: actual qualifying expenses
      expect(f8839.partIIRow2(child)).toEqual(10000)
      // Row 3: no employer benefits
      expect(f8839.partIIRow3(child)).toEqual(0)
      // Row 4: expenses - employer benefits = 10000
      expect(f8839.partIIRow4(child)).toEqual(10000)
      // Row 5: min(17280, 10000) = 10000
      expect(f8839.partIIRow5(child)).toEqual(10000)
    })

    it('should use max credit amount for special-needs child (Row 2)', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].isSpecialNeeds = true
      info.f8839Input!.adoptions[0].qualifyingExpenses = 3000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // For special needs, Row 2 = max credit even if actual expenses < max
      expect(f8839.partIIRow2(child)).toEqual(MAX_CREDIT)
      // Row 5: min(17280, 17280 - 0) = 17280
      expect(f8839.partIIRow5(child)).toEqual(MAX_CREDIT)
    })

    it('should cap expenses at max credit per child', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].qualifyingExpenses = 25000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 2: actual expenses (25000, uncapped at the row level)
      expect(f8839.partIIRow2(child)).toEqual(25000)
      // Row 5: min(17280, 25000) = 17280
      expect(f8839.partIIRow5(child)).toEqual(MAX_CREDIT)
    })

    it('should reduce credit by employer-provided benefits', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].qualifyingExpenses = 15000
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 5000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 3: employer benefits = 5000 (from Part III Row 5)
      expect(f8839.partIIRow3(child)).toEqual(5000)
      // Row 4: 15000 - 5000 = 10000
      expect(f8839.partIIRow4(child)).toEqual(10000)
      // Row 5: min(17280, 10000) = 10000
      expect(f8839.partIIRow5(child)).toEqual(10000)
    })
  })

  describe('Part II: Combined credit lines', () => {
    it('should compute Line 6 as sum of Row 5 for all children', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions = [
        {
          childName: 'Child A',
          yearOfBirth: 2025,
          isSpecialNeeds: false,
          isForeignAdoption: false,
          qualifyingExpenses: 8000,
          employerBenefitsReceived: 0,
          priorYearEmployerBenefitsExcluded: 0
        },
        {
          childName: 'Child B',
          yearOfBirth: 2024,
          isSpecialNeeds: false,
          isForeignAdoption: false,
          qualifyingExpenses: 6000,
          employerBenefitsReceived: 0,
          priorYearEmployerBenefitsExcluded: 0
        }
      ]
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // Row 5 per child: 8000 and 6000
      expect(f8839.l6()).toEqual(14000)
    })

    it('should use f1040.l11() as modified AGI (Line 7)', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.l7()).toEqual(f1040.l11())
    })

    it('should have phase-out start at $239,230 (Line 8)', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.l8()).toEqual(PHASE_OUT_START)
    })

    it('should return 0 for Line 9 when MAGI is below phase-out start', () => {
      const info = cloneDeep(baseInformation)
      // MAGI = 50000 (well below 239230)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.l9()).toEqual(0)
    })

    it('should return 0 for Line 10 when MAGI is below phase-out start', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.l10()).toEqual(0)
    })

    it('should return full credit on Line 12 when below phase-out', () => {
      const info = cloneDeep(baseInformation)
      // income 50000 < 239230, so no phase-out
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // l6 = 10000, l10 = 0, l11 = 0, l12 = 10000
      expect(f8839.l12()).toEqual(10000)
    })

    it('should phase out credit proportionally above threshold', () => {
      const info = cloneDeep(baseInformation)
      // Set income to put MAGI at 259230 (20000 above phase-out start)
      // => phase-out ratio = 20000/40000 = 0.5
      info.w2s[0].income = 259230
      info.w2s[0].medicareIncome = 259230
      info.w2s[0].ssWages = 259230
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      const agi = f1040.l11()
      expect(agi).toBeGreaterThan(PHASE_OUT_START)
      const excessOverThreshold = agi - PHASE_OUT_START
      const expectedRatio =
        Math.round((excessOverThreshold / PHASE_OUT_RANGE) * 1000) / 1000
      expect(f8839.l10()).toEqual(expectedRatio)
      expect(f8839.l12()).toBeCloseTo(
        f8839.l6() * (1 - expectedRatio),
        0
      )
    })

    it('should completely phase out credit when MAGI >= $279,230', () => {
      const info = cloneDeep(baseInformation)
      info.w2s[0].income = 300000
      info.w2s[0].medicareIncome = 300000
      info.w2s[0].ssWages = 300000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // Phase-out ratio capped at 1.0 → credit = 0
      expect(f8839.l10()).toEqual(1)
      expect(f8839.l12()).toEqual(0)
    })

    it('should add prior year carryforward to credit (Lines 13 and 14)', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.priorYearCreditCarryforward = 3000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.l13()).toEqual(3000)
      // l14 = l12 + l13 = 10000 + 3000 = 13000
      expect(f8839.l14()).toEqual(13000)
    })
  })

  describe('Part III: Employer-Provided Adoption Benefits', () => {
    it('should compute Part III rows correctly', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 8000
      info.f8839Input!.adoptions[0].priorYearEmployerBenefitsExcluded = 2000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 1: max = 17280
      expect(f8839.partIIIRow1(child)).toEqual(MAX_CREDIT)
      // Row 2: received = 8000
      expect(f8839.partIIIRow2(child)).toEqual(8000)
      // Row 3: prior excluded = 2000
      expect(f8839.partIIIRow3(child)).toEqual(2000)
      // Row 4: 8000 - 2000 = 6000
      expect(f8839.partIIIRow4(child)).toEqual(6000)
      // Row 5: min(17280, 6000) = 6000
      expect(f8839.partIIIRow5(child)).toEqual(6000)
    })

    it('should cap Part III Row 5 at max credit per child', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 20000
      info.f8839Input!.adoptions[0].priorYearEmployerBenefitsExcluded = 0
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 5: min(17280, 20000) = 17280
      expect(f8839.partIIIRow5(child)).toEqual(MAX_CREDIT)
    })

    it('should not reduce Part III rows below 0 when prior exclusions exceed received', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 3000
      info.f8839Input!.adoptions[0].priorYearEmployerBenefitsExcluded = 5000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 4: max(0, 3000 - 5000) = 0
      expect(f8839.partIIIRow4(child)).toEqual(0)
      expect(f8839.partIIIRow5(child)).toEqual(0)
    })

    it('should apply phase-out to employer benefits exclusion', () => {
      const info = cloneDeep(baseInformation)
      // Set income above phase-out threshold
      info.w2s[0].income = 259230
      info.w2s[0].medicareIncome = 259230
      info.w2s[0].ssWages = 259230
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 10000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // Employer benefits line 6: 10000 (row 5 per child)
      expect(f8839.partIIIL6()).toEqual(10000)
      // Phase-out applies
      expect(f8839.partIIIL10()).toBeGreaterThan(0)
      // Excludable amount < line 6
      expect(f8839.partIIIL12()).toBeLessThan(10000)
    })
  })

  describe('Form registration and credit flow', () => {
    it('should be instantiated when f8839Input is provided', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])

      expect(f1040.f8839).toBeDefined()
    })

    it('should NOT be instantiated when f8839Input is absent', () => {
      const info = cloneDeep(baseInformation)
      delete info.f8839Input
      const f1040 = new F1040(info, [])

      expect(f1040.f8839).toBeUndefined()
    })

    it('should wire adoption credit to Schedule 3, line 6b', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])

      expect(f1040.schedule3.l6b()).toEqual(f1040.f8839?.l16())
    })

    it('should return undefined for Schedule 3 line 6b when f8839 absent', () => {
      const info = cloneDeep(baseInformation)
      delete info.f8839Input
      const f1040 = new F1040(info, [])

      expect(f1040.schedule3.l6b()).toBeUndefined()
    })

    it('isNeeded should be true when there is a non-zero credit', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      expect(f8839.isNeeded()).toEqual(true)
    })

    it('isNeeded should be false when credit is zero and no carryforward', () => {
      const info = cloneDeep(baseInformation)
      // Set income above complete phase-out
      info.w2s[0].income = 300000
      info.w2s[0].medicareIncome = 300000
      info.w2s[0].ssWages = 300000
      info.f8839Input!.priorYearCreditCarryforward = 0
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // Credit is 0 due to phase-out, no carryforward, no employer benefits
      expect(f8839.l16()).toEqual(0)
      expect(f8839.isNeeded()).toEqual(false)
    })

    it('should produce fields array with names, SSN, child rows, and credit lines', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      const fields = f8839.fields()
      // 2 header fields + 9 per-child fields (1 child) + 11 combined lines
      expect(fields.length).toEqual(2 + 9 * 1 + 11)
      expect(fields[0]).toEqual(f1040.namesString())
      expect(fields[1]).toEqual('123456789')
    })
  })

  describe('Edge cases', () => {
    it('should handle three children (form supports up to 3)', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions = [
        {
          childName: 'Child 1',
          yearOfBirth: 2025,
          isSpecialNeeds: false,
          isForeignAdoption: false,
          qualifyingExpenses: 5000,
          employerBenefitsReceived: 0,
          priorYearEmployerBenefitsExcluded: 0
        },
        {
          childName: 'Child 2',
          yearOfBirth: 2024,
          isSpecialNeeds: true,
          isForeignAdoption: true,
          qualifyingExpenses: 0,
          employerBenefitsReceived: 0,
          priorYearEmployerBenefitsExcluded: 0
        },
        {
          childName: 'Child 3',
          yearOfBirth: 2023,
          isSpecialNeeds: false,
          isForeignAdoption: false,
          qualifyingExpenses: 15000,
          employerBenefitsReceived: 0,
          priorYearEmployerBenefitsExcluded: 0
        }
      ]
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      // Child 1: min(17280, 5000) = 5000
      // Child 2: special needs → Row 2 = 17280, Row 5 = 17280
      // Child 3: min(17280, 15000) = 15000
      expect(f8839.l6()).toEqual(5000 + MAX_CREDIT + 15000)
    })

    it('should not allow negative Row 4 when employer benefits exceed expenses', () => {
      const info = cloneDeep(baseInformation)
      info.f8839Input!.adoptions[0].qualifyingExpenses = 3000
      info.f8839Input!.adoptions[0].employerBenefitsReceived = 5000
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)
      const child = info.f8839Input!.adoptions[0]

      // Row 3 = Part III Row 5 = min(17280, 5000 - 0) = 5000
      // Row 4 = max(0, 3000 - 5000) = 0
      expect(f8839.partIIRow4(child)).toEqual(0)
      expect(f8839.partIIRow5(child)).toEqual(0)
    })

    it('l15 tax limitation should equal tax minus prior Schedule 3 credits', () => {
      const info = cloneDeep(baseInformation)
      const f1040 = new F1040(info, [])
      const f8839 = new F8839(f1040)

      const tax = f1040.l18()
      const expectedL15 = Math.max(
        0,
        tax -
          (f1040.schedule3.l1() ?? 0) -
          (f1040.schedule3.l2() ?? 0) -
          (f1040.schedule3.l3() ?? 0) -
          (f1040.schedule3.l4() ?? 0) -
          (f1040.schedule3.l5() ?? 0) -
          (f1040.schedule3.l6a() ?? 0)
      )
      expect(f8839.l15()).toEqual(expectedL15)
    })
  })
})
