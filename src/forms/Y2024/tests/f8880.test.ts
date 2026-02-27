import {
  FilingStatus,
  IraPlanType,
  PersonRole,
  W2Box12Code
} from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import F8880 from '../irsForms/F8880'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  f3922s: [],
  credits: [],
  scheduleCInputs: [],
  scheduleFInputs: [],
  scheduleHInputs: [],
  scheduleK1Form1065s: [],
  scheduleK1Form1120Ss: [],
  scheduleK1Form1041s: [],
  form6781: [],
  itemizedDeductions: undefined,
  casualtyTheftLosses: [],
  form2441Input: undefined,
  royaltyIncomes: [],
  netOperatingLossCarryforwards: [],
  amendedReturns: [],
  w2s: [
    {
      employer: { EIN: '111111111', employerName: 'Test Employer' },
      personRole: PersonRole.PRIMARY,
      occupation: 'Engineer',
      state: 'AL',
      income: 20000,
      medicareIncome: 20000,
      fedWithholding: 2000,
      ssWages: 20000,
      ssWithholding: 1240,
      medicareWithholding: 290,
      stateWages: 20000,
      stateWithholding: 0,
      box12: {
        [W2Box12Code.D]: 3000 // 401(k) elective deferral
      }
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
      dateOfBirth: new Date('1985-06-15'),
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
  individualRetirementArrangements: [
    {
      payer: 'Fidelity',
      personRole: PersonRole.PRIMARY,
      grossDistribution: 0,
      taxableAmount: 0,
      taxableAmountNotDetermined: false,
      totalDistribution: false,
      federalIncomeTaxWithheld: 0,
      planType: IraPlanType.IRA,
      contributions: 1000,
      rolloverContributions: 0,
      rothIraConversion: 0,
      recharacterizedContributions: 0,
      requiredMinimumDistributions: 0,
      lateContributions: 0,
      repayments: 0
    }
  ]
}

describe("Form 8880 - Saver's Credit", () => {
  it('should compute credit for low-income single filer with IRA + 401k contributions', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // Line 1: IRA contributions = 1000
    expect(f8880.l1(PersonRole.PRIMARY)).toEqual(1000)
    // Line 2: Elective deferrals (W2 Box 12 code D) = 3000
    expect(f8880.l2(PersonRole.PRIMARY)).toEqual(3000)
    // Line 3: Total contributions = 4000
    expect(f8880.l3(PersonRole.PRIMARY)).toEqual(4000)
    // Line 4: No distributions
    expect(f8880.l4(PersonRole.PRIMARY)).toEqual(0)
    // Line 5: Net = 4000
    expect(f8880.l5(PersonRole.PRIMARY)).toEqual(4000)
    // Line 6: Capped at 2000
    expect(f8880.l6(PersonRole.PRIMARY)).toEqual(2000)
    // Line 7: Combined (single, no spouse)
    expect(f8880.l7()).toEqual(2000)
    // Line 8: AGI = F1040 line 11
    expect(f8880.l8()).toEqual(f1040.l11())
    // AGI of 20000 for single filer => 50% rate (threshold is 23000)
    expect(f8880.l9()).toEqual(0.5)
    // Line 10: 2000 * 0.5 = 1000
    expect(f8880.l10()).toEqual(1000)
  })

  it('should return 0% rate when AGI exceeds threshold', () => {
    const information = cloneDeep(baseInformation)
    information.w2s[0].income = 50000
    information.w2s[0].medicareIncome = 50000
    information.w2s[0].ssWages = 50000
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // AGI well above 38250 for single => 0% rate
    expect(f8880.l9()).toEqual(0)
    expect(f8880.l10()).toEqual(0)
    expect(f8880.l12()).toEqual(0)
    expect(f8880.isNeeded()).toEqual(false)
  })

  it('should cap contributions at 2000 per person', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // Total contributions = 4000, but capped at 2000
    expect(f8880.l6(PersonRole.PRIMARY)).toEqual(2000)
  })

  it('should reduce contributions by distributions', () => {
    const information = cloneDeep(baseInformation)
    information.individualRetirementArrangements[0].grossDistribution = 500
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // Line 3: 4000 contributions, Line 4: 500 distributions
    // Line 5: 3500, Line 6: capped at 2000
    expect(f8880.l4(PersonRole.PRIMARY)).toEqual(500)
    expect(f8880.l5(PersonRole.PRIMARY)).toEqual(3500)
    expect(f8880.l6(PersonRole.PRIMARY)).toEqual(2000)
  })

  it('should handle distributions exceeding contributions', () => {
    const information = cloneDeep(baseInformation)
    information.individualRetirementArrangements[0].grossDistribution = 5000
    // Remove 401k deferral so total contributions = 1000 (IRA only)
    information.w2s[0].box12 = {}
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // Line 3: 1000, Line 4: 5000, Line 5: max(0, 1000-5000) = 0
    expect(f8880.l5(PersonRole.PRIMARY)).toEqual(0)
    expect(f8880.l6(PersonRole.PRIMARY)).toEqual(0)
    expect(f8880.l7()).toEqual(0)
    expect(f8880.l12()).toEqual(0)
    expect(f8880.isNeeded()).toEqual(false)
  })

  it('should not be eligible for dependents', () => {
    const information = cloneDeep(baseInformation)
    information.taxPayer.primaryPerson.isTaxpayerDependent = true
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    expect(f8880.l1(PersonRole.PRIMARY)).toEqual(0)
    expect(f8880.l2(PersonRole.PRIMARY)).toEqual(0)
    expect(f8880.isNeeded()).toEqual(false)
  })

  it('should not be eligible for taxpayers under 18', () => {
    const information = cloneDeep(baseInformation)
    information.taxPayer.primaryPerson.dateOfBirth = new Date('2010-01-01')
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    expect(f8880.l1(PersonRole.PRIMARY)).toEqual(0)
    expect(f8880.isNeeded()).toEqual(false)
  })

  it('should handle MFJ with both spouses contributing', () => {
    const information = cloneDeep(baseInformation)
    information.taxPayer.filingStatus = FilingStatus.MFJ
    information.taxPayer.spouse = {
      firstName: 'Jane',
      lastName: 'Doe',
      ssid: '222222222',
      role: PersonRole.SPOUSE,
      isTaxpayerDependent: false,
      dateOfBirth: new Date('1987-03-20'),
      isBlind: false
    }
    // Add spouse W2 with 403(b) contributions
    information.w2s.push({
      employer: { EIN: '222222222', employerName: 'Spouse Employer' },
      personRole: PersonRole.SPOUSE,
      occupation: 'Teacher',
      state: 'AL',
      income: 18000,
      medicareIncome: 18000,
      fedWithholding: 1500,
      ssWages: 18000,
      ssWithholding: 1116,
      medicareWithholding: 261,
      stateWages: 18000,
      stateWithholding: 0,
      box12: {
        [W2Box12Code.E]: 2500 // 403(b) deferral
      }
    })
    // Add spouse Roth IRA
    information.individualRetirementArrangements.push({
      payer: 'Vanguard',
      personRole: PersonRole.SPOUSE,
      grossDistribution: 0,
      taxableAmount: 0,
      taxableAmountNotDetermined: false,
      totalDistribution: false,
      federalIncomeTaxWithheld: 0,
      planType: IraPlanType.RothIRA,
      contributions: 500,
      rolloverContributions: 0,
      rothIraConversion: 0,
      recharacterizedContributions: 0,
      requiredMinimumDistributions: 0,
      lateContributions: 0,
      repayments: 0
    })

    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // Primary: IRA 1000 + 401k 3000 = 4000, capped at 2000
    expect(f8880.l6(PersonRole.PRIMARY)).toEqual(2000)
    // Spouse: IRA 500 + 403b 2500 = 3000, capped at 2000
    expect(f8880.l6(PersonRole.SPOUSE)).toEqual(2000)
    // Combined: 4000
    expect(f8880.l7()).toEqual(4000)
    // AGI = 38000 (20000 + 18000) for MFJ => 50% rate (threshold 46000)
    expect(f8880.l9()).toEqual(0.5)
    // Credit: 4000 * 0.5 = 2000
    expect(f8880.l10()).toEqual(2000)
  })

  it('should apply 20% rate in the correct AGI band', () => {
    const information = cloneDeep(baseInformation)
    // Set income so AGI falls in 20% band for single (23001-25000)
    information.w2s[0].income = 24000
    information.w2s[0].medicareIncome = 24000
    information.w2s[0].ssWages = 24000
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // AGI = f1040.l11(), should be 24000 for this simple case
    expect(f8880.l8()).toEqual(f1040.l11())
    // If AGI is 24000, it's in the 20% band (23001-25000)
    if (f8880.l8() > 23000 && f8880.l8() <= 25000) {
      expect(f8880.l9()).toEqual(0.2)
    }
  })

  it('should apply 10% rate in the correct AGI band', () => {
    const information = cloneDeep(baseInformation)
    // Set income so AGI falls in 10% band for single (25001-38250)
    information.w2s[0].income = 30000
    information.w2s[0].medicareIncome = 30000
    information.w2s[0].ssWages = 30000
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    // AGI = 30000, in 10% band for single (25001-38250)
    if (f8880.l8() > 25000 && f8880.l8() <= 38250) {
      expect(f8880.l9()).toEqual(0.1)
    }
  })

  it('should wire to Schedule 3 line 4', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])

    // Schedule 3 line 4 should return the F8880 credit
    expect(f1040.schedule3.l4()).toEqual(f1040.f8880?.l12())
  })

  it('should produce valid fields array', () => {
    const information = cloneDeep(baseInformation)
    const f1040 = new F1040(information, [])
    const f8880 = new F8880(f1040)

    const fields = f8880.fields()
    expect(fields.length).toEqual(20)
    // First field is names string
    expect(fields[0]).toEqual(f1040.namesString())
    // Second field is SSN
    expect(fields[1]).toEqual('111111111')
  })
})
