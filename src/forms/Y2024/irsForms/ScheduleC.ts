import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { ScheduleCInput } from 'ustaxes/core/data'
import { sumFields } from 'ustaxes/core/irsForms/util'

export default class ScheduleC extends F1040Attachment {
  tag: FormTag = 'f1040sc'
  sequenceIndex = 9

  inputs = (): ScheduleCInput[] => this.f1040.info.scheduleCInputs

  isNeeded = (): boolean => this.inputs().length > 0

  // Cost of goods sold for a single business
  cogs = (input: ScheduleCInput): number =>
    Math.max(
      0,
      input.beginningInventory +
        input.purchases +
        input.costOfLabor +
        input.materialsAndSupplies +
        input.otherCosts -
        input.endingInventory
    )

  // Total expenses for a single business (Part II)
  totalExpenses = (input: ScheduleCInput): number =>
    Object.values(input.expenses).reduce<number>((sum, v) => sum + (v ?? 0), 0)

  // Gross income for a single business (line 7)
  grossIncome = (input: ScheduleCInput): number =>
    input.grossReceipts - input.returns - this.cogs(input) + input.otherIncome

  // Net profit/loss for a single business (line 31)
  netProfit = (input: ScheduleCInput): number =>
    this.grossIncome(input) - this.totalExpenses(input)

  // TODO: statutory employee income
  // shown on Schedule 8812, earned income
  l1 = (): number | undefined => undefined

  // Net profit or loss (sum across all Schedule C businesses)
  l31 = (): number | undefined => {
    const inputs = this.inputs()
    if (inputs.length === 0) return undefined
    return inputs.reduce((sum, input) => sum + this.netProfit(input), 0)
  }

  fields = (): Field[] => []
}
