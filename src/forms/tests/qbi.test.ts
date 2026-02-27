import { buildQbiItems, totalQbi } from 'ustaxes/forms/qbi'
import { blankState } from 'ustaxes/redux/reducer'
import {
  AccountingMethod,
  PersonRole,
  PropertyType
} from 'ustaxes/core/data'

describe('qbi helpers', () => {
  it('includes schedule C, rental, and K-1 QBI amounts', () => {
    const info = {
      ...blankState,
      scheduleCInputs: [
        {
          personRole: PersonRole.PRIMARY,
          businessName: 'Main Street LLC',
          businessActivityCode: '1111',
          businessDescription: 'Consulting',
          accountingMethod: AccountingMethod.cash,
          grossReceipts: 1000,
          returns: 100,
          otherIncome: 50,
          beginningInventory: 0,
          purchases: 0,
          costOfLabor: 0,
          materialsAndSupplies: 0,
          otherCosts: 0,
          endingInventory: 0,
          expenses: {
            advertising: 100,
            supplies: 50
          }
        }
      ],
      realEstate: [
        {
          address: {
            address: '123 Main St',
            city: 'Seattle',
            state: 'WA',
            zip: '98101'
          },
          rentalDays: 200,
          personalUseDays: 0,
          rentReceived: 1000,
          propertyType: PropertyType.singleFamily,
          qualifiedJointVenture: false,
          expenses: {
            mortgage: 100
          }
        }
      ],
      scheduleK1Form1065s: [
        {
          personRole: PersonRole.PRIMARY,
          partnershipName: 'Acme Partners',
          partnershipEin: '12-3456789',
          partnerOrSCorp: 'P',
          isForeign: false,
          isPassive: false,
          ordinaryBusinessIncome: 0,
          interestIncome: 0,
          guaranteedPaymentsForServices: 0,
          guaranteedPaymentsForCapital: 0,
          selfEmploymentEarningsA: 0,
          selfEmploymentEarningsB: 0,
          selfEmploymentEarningsC: 0,
          distributionsCodeAAmount: 0,
          section199AQBI: 500
        }
      ]
    }

    const items = buildQbiItems(info)
    const qbiAmounts = items.map((item) => item.qbi)
    expect(qbiAmounts).toEqual([800, 900, 500])
    expect(totalQbi(info)).toBe(2200)
  })

  it('filters out non-positive QBI items', () => {
    const info = {
      ...blankState,
      scheduleCInputs: [
        {
          personRole: PersonRole.PRIMARY,
          businessName: 'Loss LLC',
          businessActivityCode: '1111',
          businessDescription: 'Consulting',
          accountingMethod: AccountingMethod.cash,
          grossReceipts: 100,
          returns: 0,
          otherIncome: 0,
          beginningInventory: 0,
          purchases: 0,
          costOfLabor: 0,
          materialsAndSupplies: 0,
          otherCosts: 0,
          endingInventory: 0,
          expenses: {
            advertising: 200
          }
        }
      ],
      scheduleK1Form1065s: [
        {
          personRole: PersonRole.PRIMARY,
          partnershipName: 'Acme Partners',
          partnershipEin: '12-3456789',
          partnerOrSCorp: 'P',
          isForeign: false,
          isPassive: false,
          ordinaryBusinessIncome: 0,
          interestIncome: 0,
          guaranteedPaymentsForServices: 0,
          guaranteedPaymentsForCapital: 0,
          selfEmploymentEarningsA: 0,
          selfEmploymentEarningsB: 0,
          selfEmploymentEarningsC: 0,
          distributionsCodeAAmount: 0,
          section199AQBI: 300
        }
      ]
    }

    const items = buildQbiItems(info)
    expect(items).toHaveLength(1)
    expect(items[0].qbi).toBe(300)
    expect(totalQbi(info)).toBe(300)
  })
})
