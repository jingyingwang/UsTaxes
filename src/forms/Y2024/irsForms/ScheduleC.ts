import {
  AccountingMethod,
  ScheduleCInput,
  ScheduleCExpenseTypeName
} from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'
import F1040Attachment from './F1040Attachment'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Field } from 'ustaxes/core/pdfFiller'
import F1040 from './F1040'

export default class ScheduleC extends F1040Attachment {
  tag: FormTag = 'f1040sc'
  sequenceIndex = 9

  index: number

  constructor(f1040: F1040, index = 0) {
    super(f1040)
    this.index = index
  }

  input = (): ScheduleCInput | undefined =>
    this.f1040.info.scheduleCInputs[this.index]

  isNeeded = (): boolean => this.f1040.info.scheduleCInputs.length > 0

  copies = (): ScheduleC[] => {
    if (this.index === 0) {
      return this.f1040.info.scheduleCInputs
        .slice(1)
        .map((_, i) => new ScheduleC(this.f1040, i + 1))
    }
    return []
  }

  // ---------- Part I: Income ----------

  // Line 1: Gross receipts or sales
  l1 = (): number | undefined => this.input()?.grossReceipts

  // Line 2: Returns and allowances
  l2 = (): number | undefined => this.input()?.returns

  // Line 3: Subtract line 2 from line 1
  l3 = (): number | undefined =>
    this.input() !== undefined ? (this.l1() ?? 0) - (this.l2() ?? 0) : undefined

  // Line 4: Cost of goods sold (from Part III, line 42)
  l4 = (): number | undefined => this.l42()

  // Line 5: Gross profit (line 3 minus line 4)
  l5 = (): number | undefined =>
    this.input() !== undefined ? (this.l3() ?? 0) - (this.l4() ?? 0) : undefined

  // Line 6: Other income
  l6 = (): number | undefined => this.input()?.otherIncome

  // Line 7: Gross income (line 5 plus line 6)
  l7 = (): number | undefined =>
    this.input() !== undefined ? sumFields([this.l5(), this.l6()]) : undefined

  // ---------- Part II: Expenses ----------

  expense = (name: ScheduleCExpenseTypeName): number | undefined =>
    this.input()?.expenses[name]

  l8 = (): number | undefined => this.expense('advertising')
  l9 = (): number | undefined => this.expense('carAndTruck')
  l10 = (): number | undefined => this.expense('commissions')
  l11 = (): number | undefined => this.expense('contractLabor')
  l12 = (): number | undefined => this.expense('depletion')
  l13 = (): number | undefined => this.expense('depreciation')
  l14 = (): number | undefined => this.expense('employeeBenefitPrograms')
  l15 = (): number | undefined => this.expense('insurance')
  l16a = (): number | undefined => this.expense('interestMortgage')
  l16b = (): number | undefined => this.expense('interestOther')
  l17 = (): number | undefined => this.expense('legalAndProfessional')
  l18 = (): number | undefined => this.expense('officeExpense')
  l19 = (): number | undefined => this.expense('pensionAndProfitSharing')
  l20a = (): number | undefined => this.expense('rentVehicles')
  l20b = (): number | undefined => this.expense('rentOther')
  l21 = (): number | undefined => this.expense('repairs')
  l22 = (): number | undefined => this.expense('supplies')
  l23 = (): number | undefined => this.expense('taxesAndLicenses')
  l24a = (): number | undefined => this.expense('travel')
  l24b = (): number | undefined => this.expense('deductibleMeals')
  l25 = (): number | undefined => this.expense('utilities')
  l26 = (): number | undefined => this.expense('wages')
  l27a = (): number | undefined => this.expense('otherExpenses')

  // Line 28: Total expenses before expenses for business use of home
  l28 = (): number =>
    sumFields([
      this.l8(),
      this.l9(),
      this.l10(),
      this.l11(),
      this.l12(),
      this.l13(),
      this.l14(),
      this.l15(),
      this.l16a(),
      this.l16b(),
      this.l17(),
      this.l18(),
      this.l19(),
      this.l20a(),
      this.l20b(),
      this.l21(),
      this.l22(),
      this.l23(),
      this.l24a(),
      this.l24b(),
      this.l25(),
      this.l26(),
      this.l27a()
    ])

  // Line 29: Tentative profit or (loss) = line 7 minus line 28
  l29 = (): number | undefined =>
    this.input() !== undefined ? (this.l7() ?? 0) - this.l28() : undefined

  // Line 30: Expenses for business use of your home (Form 8829)
  l30 = (): number | undefined => undefined

  // Line 31: Net profit or (loss) = line 29 minus line 30
  l31 = (): number | undefined =>
    this.input() !== undefined
      ? (this.l29() ?? 0) - (this.l30() ?? 0)
      : undefined

  // Total net profit/loss across all Schedule C forms
  totalL31 = (): number =>
    [this, ...this.copies()].reduce((acc, sc) => acc + (sc.l31() ?? 0), 0)

  // ---------- Part III: Cost of Goods Sold ----------

  // Line 35: Inventory at beginning of year
  l35 = (): number | undefined => this.input()?.beginningInventory

  // Line 36: Purchases less cost of items withdrawn for personal use
  l36 = (): number | undefined => this.input()?.purchases

  // Line 37: Cost of labor
  l37 = (): number | undefined => this.input()?.costOfLabor

  // Line 38: Materials and supplies
  l38 = (): number | undefined => this.input()?.materialsAndSupplies

  // Line 39: Other costs
  l39 = (): number | undefined => this.input()?.otherCosts

  // Line 40: Add lines 35 through 39
  l40 = (): number =>
    sumFields([this.l35(), this.l36(), this.l37(), this.l38(), this.l39()])

  // Line 41: Inventory at end of year
  l41 = (): number | undefined => this.input()?.endingInventory

  // Line 42: Cost of goods sold = line 40 minus line 41
  l42 = (): number | undefined =>
    this.input() !== undefined ? this.l40() - (this.l41() ?? 0) : undefined

  addressString = (): string | undefined => {
    const addr = this.input()?.businessAddress
    if (addr === undefined) return undefined
    return [addr.city, addr.state, addr.zip].filter(Boolean).join(', ')
  }

  fields = (): Field[] => {
    const input = this.input()

    return [
      // Page 1 header
      this.f1040.namesString(), // 0: Name of proprietor
      this.f1040.info.taxPayer.primaryPerson.ssid, // 1: SSN
      input?.businessDescription, // 2: A. Principal business
      input?.businessActivityCode, // 3: B. Business code
      input?.businessName, // 4: C. Business name
      input?.ein, // 5: D. EIN
      input?.businessAddress?.address, // 6: E. Business address
      this.addressString(), // 7: City, state, ZIP

      // F. Accounting method checkboxes
      input?.accountingMethod === AccountingMethod.cash, // 8: Cash
      input?.accountingMethod === AccountingMethod.accrual, // 9: Accrual
      input?.accountingMethod === AccountingMethod.other, // 10: Other
      input?.accountingMethod === AccountingMethod.other ? 'Other' : undefined, // 11: Other specify

      // G. Material participation
      true, // 12: Yes
      false, // 13: No

      // H. Started or acquired this business during 2024
      false, // 14

      // I. Payments requiring Form(s) 1099
      undefined, // 15: Yes
      undefined, // 16: No

      // J. Filed required Forms 1099
      undefined, // 17: Yes
      undefined, // 18: No

      // Statutory employee checkbox
      false, // 19

      // Part I: Income
      this.l1(), // 20: Line 1
      this.l2(), // 21: Line 2
      this.l3(), // 22: Line 3
      this.l4(), // 23: Line 4
      this.l5(), // 24: Line 5
      this.l6(), // 25: Line 6
      this.l7(), // 26: Line 7

      // Part II: Expenses (Lines 8-17)
      this.l8(), // 27: Line 8 - Advertising
      this.l9(), // 28: Line 9 - Car and truck
      this.l10(), // 29: Line 10 - Commissions
      this.l11(), // 30: Line 11 - Contract labor
      this.l12(), // 31: Line 12 - Depletion
      this.l13(), // 32: Line 13 - Depreciation
      this.l14(), // 33: Line 14 - Employee benefits
      this.l15(), // 34: Line 15 - Insurance
      this.l16a(), // 35: Line 16a - Mortgage interest
      this.l16b(), // 36: Line 16b - Other interest
      this.l17(), // 37: Line 17 - Legal and professional

      // Part II: Expenses (Lines 18-27)
      this.l18(), // 38: Line 18 - Office expense
      this.l19(), // 39: Line 19 - Pension/profit-sharing
      this.l20a(), // 40: Line 20a - Rent (vehicles)
      this.l20b(), // 41: Line 20b - Rent (other)
      this.l21(), // 42: Line 21 - Repairs
      this.l22(), // 43: Line 22 - Supplies
      this.l23(), // 44: Line 23 - Taxes and licenses
      this.l24a(), // 45: Line 24a - Travel
      this.l24b(), // 46: Line 24b - Deductible meals
      this.l25(), // 47: Line 25 - Utilities
      this.l26(), // 48: Line 26 - Wages
      this.l27a(), // 49: Line 27a - Other expenses (f1_40)
      undefined, // 50: Line 27b - Reserved (f1_39)

      this.l28(), // 51: Line 28 - Total expenses
      this.l29(), // 52: Line 29 - Tentative profit

      // Line 30: Expenses for business use of home
      undefined, // 53: Line 30 (form reference)
      this.l30(), // 54: Line 30 amount

      this.l31(), // 55: Line 31 - Net profit or (loss)
      undefined, // 56: (padding)

      // Line 32: Loss checkboxes
      (this.l31() ?? 0) < 0, // 57: 32a - All investment at risk
      false, // 58: 32b - Some investment NOT at risk

      // Page 2: Part III - Cost of Goods Sold
      // Line 33: Method to value closing inventory
      false, // 59: a. Cost
      false, // 60: b. Lower of cost or market
      false, // 61: c. Other

      // Line 34: Was there any change in determining quantities, costs, or valuations?
      false, // 62: Yes
      false, // 63: No

      this.l35(), // 64: Line 35
      this.l36(), // 65: Line 36
      this.l37(), // 66: Line 37
      this.l38(), // 67: Line 38
      this.l39(), // 68: Line 39
      this.l40(), // 69: Line 40
      this.l41(), // 70: Line 41
      this.l42(), // 71: Line 42

      // Part IV: Information on Your Vehicle (not implemented)
      undefined, // 72: Line 43 - Date placed in service
      undefined, // 73: Line 44a - Business miles
      undefined, // 74: Line 44b - Commuting miles
      undefined, // 75: Line 44c - Other miles
      undefined, // 76
      undefined, // 77

      // Lines 45-47 checkboxes
      undefined, // 78: Line 45 Yes
      undefined, // 79: Line 45 No
      undefined, // 80: Line 46 Yes
      undefined, // 81: Line 46 No
      undefined, // 82: Line 47a Yes
      undefined, // 83: Line 47a No
      undefined, // 84: Line 47b Yes
      undefined, // 85: Line 47b No

      // Part V: Other Expenses (9 rows, description + amount each)
      input?.otherExpenseType, // 86: Item 1 description
      this.expense('otherExpenses'), // 87: Item 1 amount
      ...Array<undefined>(16).fill(undefined), // 88-103: Items 2-9

      // Line 48: Total other expenses
      this.expense('otherExpenses') // 104: Total
    ]
  }
}
