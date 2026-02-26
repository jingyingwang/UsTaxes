import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { ScheduleFInput } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { Field } from 'ustaxes/core/pdfFiller'
import F1040 from './F1040'

export default class ScheduleF extends F1040Attachment {
  tag: FormTag = 'f1040sf'
  sequenceIndex = 11

  readonly input: ScheduleFInput

  constructor(f1040: F1040, input: ScheduleFInput) {
    super(f1040)
    this.input = input
  }

  isNeeded = (): boolean => true

  // Part I: Farm Income — Cash Method

  // Line 1a: Sales of livestock and other resale items
  l1a = (): number => this.input.salesLivestock

  // Line 1b: Cost or other basis of livestock
  l1b = (): number => this.input.costBasisLivestock

  // Line 1c: Subtract line 1b from line 1a
  l1c = (): number => Math.max(0, this.l1a() - this.l1b())

  // Line 2: Sales of livestock, produce, grains, and other products you raised
  l2 = (): number => this.input.salesRaised

  // Line 3a: Cooperative distributions
  l3a = (): number => this.input.cooperativeDistributions

  // Line 3b: Cooperative distributions (taxable amount)
  l3b = (): number => this.input.cooperativeDistributionsTaxable

  // Line 4a: Agricultural program payments
  l4a = (): number => this.input.agriculturalProgramPayments

  // Line 4b: Agricultural program payments (taxable amount)
  l4b = (): number => this.input.agriculturalProgramPaymentsTaxable

  // Line 5a: CCC loans reported under election
  l5a = (): number => this.input.cccLoansReported

  // Line 5b: CCC loans forfeited
  l5b = (): number => this.input.cccLoansForfeited

  // Line 6a: Crop insurance proceeds
  l6a = (): number => this.input.cropInsuranceProceeds

  // Line 6b: Crop insurance proceeds (taxable amount)
  l6b = (): number => this.input.cropInsuranceTaxable

  // Line 7: Custom hire (machine work) income
  l7 = (): number => this.input.customHireIncome

  // Line 8: Other farm income
  l8 = (): number => this.input.otherFarmIncome

  // Line 9: Gross farm income (sum of lines 1c, 2, 3b, 4b, 5a, 5b, 6b, 7, 8)
  l9 = (): number =>
    sumFields([
      this.l1c(),
      this.l2(),
      this.l3b(),
      this.l4b(),
      this.l5a(),
      this.l5b(),
      this.l6b(),
      this.l7(),
      this.l8()
    ])

  // Part II: Farm Expenses
  // Line 10: Total expenses (sum of expense categories)
  totalExpenses = (): number => {
    const expenses = this.input.expenses
    return Object.values(expenses).reduce((sum: number, v) => sum + (v ?? 0), 0)
  }

  // Line 33: Total expenses
  l33 = (): number => this.totalExpenses()

  // Line 34: Net farm profit or (loss)
  // Gross farm income (line 9) minus total expenses (line 33)
  l34 = (): number => this.l9() - this.l33()

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.input.farmName,
    this.input.principalProduct,
    this.input.ein,
    this.input.accountingMethod === 'cash',
    this.input.accountingMethod === 'accrual',
    this.input.accountingMethod === 'other',
    this.l1a(),
    this.l1b(),
    this.l1c(),
    this.l2(),
    this.l3a(),
    this.l3b(),
    this.l4a(),
    this.l4b(),
    this.l5a(),
    this.l5b(),
    this.l6a(),
    this.l6b(),
    this.l7(),
    this.l8(),
    this.l9(),
    // Expense fields (Part II)
    this.input.expenses.carAndTruck,
    this.input.expenses.chemicals,
    this.input.expenses.conservation,
    this.input.expenses.customHire,
    this.input.expenses.depreciation,
    this.input.expenses.employeeBenefitPrograms,
    this.input.expenses.feed,
    this.input.expenses.fertilizers,
    this.input.expenses.freight,
    this.input.expenses.gasoline,
    this.input.expenses.insurance,
    this.input.expenses.interestMortgage,
    this.input.expenses.interestOther,
    this.input.expenses.labor,
    this.input.expenses.pensionAndProfitSharing,
    this.input.expenses.rentVehicles,
    this.input.expenses.rentOther,
    this.input.expenses.repairs,
    this.input.expenses.seeds,
    this.input.expenses.storage,
    this.input.expenses.supplies,
    this.input.expenses.taxes,
    this.input.expenses.utilities,
    this.input.expenses.veterinary,
    this.input.expenses.otherExpenses,
    this.l33(),
    this.l34()
  ]
}
