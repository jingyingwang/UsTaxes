import { AccountingMethod, FilingStatus, PersonRole } from 'ustaxes/core/data'
import F1040 from '../irsForms/F1040'
import { cloneDeep } from 'lodash'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'

const baseInformation: ValidatedInformation = {
  f1099s: [],
  f3921s: [],
  credits: [],
  scheduleCInputs: [
    {
      personRole: PersonRole.PRIMARY,
      businessName: 'Test Consulting',
      businessActivityCode: '541990',
      businessDescription: 'Consulting',
      accountingMethod: AccountingMethod.cash,
      grossReceipts: 100000,
      returns: 0,
      otherIncome: 0,
      beginningInventory: 0,
      purchases: 0,
      costOfLabor: 0,
      materialsAndSupplies: 0,
      otherCosts: 0,
      endingInventory: 0,
      expenses: {},
      selfEmployedHealthInsurancePremiums: 12000
    }
  ],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  w2s: [],
  estimatedTaxes: [],
  realEstate: [],
  taxPayer: {
    primaryPerson: {
      address: {
        address: '123 Main St',
        aptNo: '',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      },
      firstName: 'Jane',
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
  stateResidencies: [{ state: 'TX' }],
  healthSavingsAccounts: [],
  individualRetirementArrangements: []
}

describe('Form 7206 - Self-Employed Health Insurance Deduction', () => {
  it('should compute deduction when premiums are less than net profit', () => {
    const info = cloneDeep(baseInformation)
    const f1040 = new F1040(info, [])

    expect(f1040.f7206).toBeDefined()
    expect(f1040.f7206!.isNeeded()).toBe(true)

    // Schedule C net profit = 100000 (gross) - 0 (expenses) - 0 (COGS) = 100000
    expect(f1040.scheduleC!.l31()).toBe(100000)

    // Premiums (12000) < net profit adjusted, so deduction = 12000
    expect(f1040.f7206!.l1()).toBe(12000)
    expect(f1040.f7206!.l3()).toBe(12000)
    expect(f1040.f7206!.l4()).toBe(100000)

    const deduction = f1040.f7206!.deduction()
    expect(deduction).toBe(12000)

    // Should flow to Schedule 1 line 17
    expect(f1040.schedule1.l17()).toBe(12000)
  })

  it('should cap deduction at net self-employment income', () => {
    const info = cloneDeep(baseInformation)
    // Set premiums higher than net profit
    info.scheduleCInputs[0].grossReceipts = 10000
    info.scheduleCInputs[0].selfEmployedHealthInsurancePremiums = 15000

    const f1040 = new F1040(info, [])

    // Net profit = 10000
    expect(f1040.scheduleC!.l31()).toBe(10000)

    // Deduction should be capped at less than premiums
    const deduction = f1040.f7206!.deduction()!
    expect(deduction).toBeLessThanOrEqual(10000)
    expect(deduction).toBeLessThan(15000)
  })

  it('should not be needed when no premiums exist', () => {
    const info = cloneDeep(baseInformation)
    info.scheduleCInputs[0].selfEmployedHealthInsurancePremiums = undefined

    const f1040 = new F1040(info, [])

    expect(f1040.f7206).toBeDefined()
    expect(f1040.f7206!.isNeeded()).toBe(false)
  })

  it('should not be needed when no Schedule C inputs', () => {
    const info = cloneDeep(baseInformation)
    info.scheduleCInputs = []

    const f1040 = new F1040(info, [])

    expect(f1040.f7206).toBeUndefined()
  })

  it('should handle zero premiums', () => {
    const info = cloneDeep(baseInformation)
    info.scheduleCInputs[0].selfEmployedHealthInsurancePremiums = 0

    const f1040 = new F1040(info, [])

    expect(f1040.f7206!.isNeeded()).toBe(false)
  })

  it('should account for expenses reducing net profit', () => {
    const info = cloneDeep(baseInformation)
    info.scheduleCInputs[0].grossReceipts = 50000
    info.scheduleCInputs[0].expenses = {
      advertising: 5000,
      officeExpense: 3000
    }
    info.scheduleCInputs[0].selfEmployedHealthInsurancePremiums = 20000

    const f1040 = new F1040(info, [])

    // Net profit = 50000 - 8000 = 42000
    expect(f1040.scheduleC!.l31()).toBe(42000)

    // Deduction capped at adjusted net income (less than net profit due to SE tax)
    const deduction = f1040.f7206!.deduction()!
    expect(deduction).toBe(20000) // Premiums 20000 < adjusted income
  })

  it('should integrate Schedule 1 line 17 into 1040 line 10', () => {
    const info = cloneDeep(baseInformation)
    const f1040 = new F1040(info, [])

    // Schedule 1 should be needed because of F7206
    expect(f1040.schedule1.isNeeded()).toBe(true)

    // The deduction should flow to 1040 line 10 via Schedule 1
    const l10 = f1040.l10()
    expect(l10).toBeDefined()
    expect(l10!).toBeGreaterThan(0)
  })

  it('should handle net loss from Schedule C', () => {
    const info = cloneDeep(baseInformation)
    info.scheduleCInputs[0].grossReceipts = 5000
    info.scheduleCInputs[0].expenses = { advertising: 10000 }
    info.scheduleCInputs[0].selfEmployedHealthInsurancePremiums = 3000

    const f1040 = new F1040(info, [])

    // Net profit = 5000 - 10000 = -5000 (loss)
    expect(f1040.scheduleC!.l31()).toBe(-5000)

    // l4 should be undefined when profit is not positive
    expect(f1040.f7206!.l4()).toBeUndefined()

    // Deduction should be undefined (no positive income to deduct against)
    expect(f1040.f7206!.deduction()).toBeUndefined()
  })
})
