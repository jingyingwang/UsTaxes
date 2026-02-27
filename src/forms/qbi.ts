import {
  Address,
  Information,
  Property,
  ScheduleCInput
} from 'ustaxes/core/data'

export interface QbiItem {
  name?: string
  ein?: string
  qbi: number
}

const sumNumbers = (values: Array<number | undefined>): number =>
  values.reduce((total, value) => total + (value ?? 0), 0)

const addressString = (address: Address): string =>
  [
    address.address,
    address.city,
    address.state ?? address.province ?? '',
    address.zip ?? address.postalCode ?? ''
  ].join(', ')

const scheduleCExpenses = (input: ScheduleCInput): number =>
  sumNumbers(Object.values(input.expenses))

export const scheduleCNetProfit = (input: ScheduleCInput): number => {
  const cogs =
    input.beginningInventory +
    input.purchases +
    input.costOfLabor +
    input.materialsAndSupplies +
    input.otherCosts -
    input.endingInventory
  const grossIncome =
    input.grossReceipts - input.returns + input.otherIncome - cogs
  return grossIncome - scheduleCExpenses(input)
}

export const propertyUseTest = (property: Property): boolean =>
  property.personalUseDays <= Math.max(14, 0.1 * property.rentalDays)

export const rentalPropertyNetIncome = (property: Property): number => {
  const expenses = propertyUseTest(property)
    ? sumNumbers(Object.values(property.expenses))
    : 0
  return property.rentReceived - expenses
}

export const buildQbiItems = (info: Information): QbiItem[] => {
  const scheduleCItems: QbiItem[] = info.scheduleCInputs.map((input, index) => {
    const name =
      input.businessName !== ''
        ? input.businessName
        : `Schedule C ${index + 1}`
    return {
      name,
      ein: input.ein,
      qbi: scheduleCNetProfit(input)
    }
  })

  const rentalItems: QbiItem[] = info.realEstate.map((property, index) => {
    const address = addressString(property.address)
    const name = address !== '' ? `Rental: ${address}` : `Rental ${index + 1}`
    return {
      name,
      qbi: rentalPropertyNetIncome(property)
    }
  })

  const k1Items: QbiItem[] = info.scheduleK1Form1065s.map((k1) => ({
    name: k1.partnershipName,
    ein: k1.partnershipEin,
    qbi: k1.section199AQBI
  }))

  return [...scheduleCItems, ...rentalItems, ...k1Items].filter(
    (item) => item.qbi > 0
  )
}

export const totalQbi = (info: Information): number =>
  buildQbiItems(info).reduce((total, item) => total + item.qbi, 0)
