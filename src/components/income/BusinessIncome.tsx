import { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, useWatch, FormProvider } from 'react-hook-form'
import { TaxesState, useSelector, useDispatch } from 'ustaxes/redux'
import {
  addScheduleC,
  editScheduleC,
  removeScheduleC
} from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  LabeledInput,
  GenericLabeledDropdown,
  Currency,
  formatSSID
} from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { Business } from '@material-ui/icons'
import {
  ScheduleCInput,
  ScheduleCExpenseType,
  ScheduleCExpenseTypeName,
  AccountingMethod,
  Information,
  Person,
  PersonRole,
  PrimaryPerson,
  Spouse
} from 'ustaxes/core/data'
import { enumKeys, intentionallyFloat } from 'ustaxes/core/util'
import _ from 'lodash'

interface ScheduleCUserInput {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  businessName: string
  businessActivityCode: string
  businessDescription: string
  ein: string
  accountingMethod: AccountingMethod

  // Income
  grossReceipts: string
  returns: string
  otherIncome: string

  // Cost of Goods Sold
  beginningInventory: string
  purchases: string
  costOfLabor: string
  materialsAndSupplies: string
  otherCosts: string
  endingInventory: string

  // Expenses
  expenses: Partial<{ [K in ScheduleCExpenseTypeName]: number }>
  otherExpenseType: string
}

const blankUserInput: ScheduleCUserInput = {
  personRole: PersonRole.PRIMARY,
  businessName: '',
  businessActivityCode: '',
  businessDescription: '',
  ein: '',
  accountingMethod: AccountingMethod.cash,
  grossReceipts: '',
  returns: '',
  otherIncome: '',
  beginningInventory: '',
  purchases: '',
  costOfLabor: '',
  materialsAndSupplies: '',
  otherCosts: '',
  endingInventory: '',
  expenses: {},
  otherExpenseType: ''
}

const displayExpense = (k: ScheduleCExpenseType): string => {
  const lookup: { [key in ScheduleCExpenseType]: string } = {
    [ScheduleCExpenseType.advertising]: 'Advertising',
    [ScheduleCExpenseType.carAndTruck]: 'Car and truck expenses',
    [ScheduleCExpenseType.commissions]: 'Commissions and fees',
    [ScheduleCExpenseType.contractLabor]: 'Contract labor',
    [ScheduleCExpenseType.depletion]: 'Depletion',
    [ScheduleCExpenseType.depreciation]: 'Depreciation',
    [ScheduleCExpenseType.employeeBenefitPrograms]: 'Employee benefit programs',
    [ScheduleCExpenseType.insurance]: 'Insurance (other than health)',
    [ScheduleCExpenseType.interestMortgage]: 'Interest on business debt (mortgage)',
    [ScheduleCExpenseType.interestOther]: 'Interest (other)',
    [ScheduleCExpenseType.legalAndProfessional]: 'Legal and professional services',
    [ScheduleCExpenseType.officeExpense]: 'Office expense',
    [ScheduleCExpenseType.pensionAndProfitSharing]: 'Pension and profit-sharing plans',
    [ScheduleCExpenseType.rentVehicles]: 'Rent or lease (vehicles, machinery)',
    [ScheduleCExpenseType.rentOther]: 'Rent or lease (other business property)',
    [ScheduleCExpenseType.repairs]: 'Repairs and maintenance',
    [ScheduleCExpenseType.supplies]: 'Supplies',
    [ScheduleCExpenseType.taxesAndLicenses]: 'Taxes and licenses',
    [ScheduleCExpenseType.travel]: 'Travel',
    [ScheduleCExpenseType.deductibleMeals]: 'Deductible meals',
    [ScheduleCExpenseType.utilities]: 'Utilities',
    [ScheduleCExpenseType.wages]: 'Wages',
    [ScheduleCExpenseType.otherExpenses]: 'Other expenses'
  }
  return lookup[k]
}

const toScheduleCInput = (
  input: ScheduleCUserInput
): ScheduleCInput | undefined => {
  const { businessName, expenses } = input

  if (businessName === '') {
    return undefined
  }

  const newExpenses: Partial<{ [K in ScheduleCExpenseTypeName]: number }> =
    Object.fromEntries(
      enumKeys(ScheduleCExpenseType)
        .filter((e) => e in expenses && (expenses[e] as number) > 0)
        .map((e) => [e, Number(expenses[e])])
    )

  return {
    personRole: input.personRole,
    businessName: input.businessName,
    businessActivityCode: input.businessActivityCode,
    businessDescription: input.businessDescription,
    ein: input.ein || undefined,
    accountingMethod: input.accountingMethod,
    grossReceipts: Number(input.grossReceipts),
    returns: Number(input.returns),
    otherIncome: Number(input.otherIncome),
    beginningInventory: Number(input.beginningInventory),
    purchases: Number(input.purchases),
    costOfLabor: Number(input.costOfLabor),
    materialsAndSupplies: Number(input.materialsAndSupplies),
    otherCosts: Number(input.otherCosts),
    endingInventory: Number(input.endingInventory),
    expenses: newExpenses,
    otherExpenseType: input.otherExpenseType || undefined
  }
}

const toUserInput = (sc: ScheduleCInput): ScheduleCUserInput => ({
  ...blankUserInput,
  personRole: sc.personRole,
  businessName: sc.businessName,
  businessActivityCode: sc.businessActivityCode,
  businessDescription: sc.businessDescription,
  ein: sc.ein ?? '',
  accountingMethod: sc.accountingMethod,
  grossReceipts: sc.grossReceipts.toString(),
  returns: sc.returns.toString(),
  otherIncome: sc.otherIncome.toString(),
  beginningInventory: sc.beginningInventory.toString(),
  purchases: sc.purchases.toString(),
  costOfLabor: sc.costOfLabor.toString(),
  materialsAndSupplies: sc.materialsAndSupplies.toString(),
  otherCosts: sc.otherCosts.toString(),
  endingInventory: sc.endingInventory.toString(),
  expenses: sc.expenses,
  otherExpenseType: sc.otherExpenseType ?? ''
})

export const BusinessIncome = (): ReactElement => {
  const information: Information = useSelector(
    (state: TaxesState) => state.information
  )
  const scheduleCInputs = information.scheduleCInputs

  const spouse: Spouse | undefined = information.taxPayer.spouse
  const primary: PrimaryPerson | undefined =
    information.taxPayer.primaryPerson

  const people: Person[] = [primary, spouse].flatMap((p) =>
    p !== undefined ? [p as Person] : []
  )

  const defaultValues = blankUserInput
  const methods = useForm<ScheduleCUserInput>({ defaultValues })
  const { handleSubmit, control } = methods

  const dispatch = useDispatch()
  const { onAdvance, navButtons } = usePager()

  const otherExpensesEntered: number | undefined = useWatch({
    control,
    name: 'expenses.otherExpenses'
  })

  const onSubmitAdd = (formData: ScheduleCUserInput): void => {
    const payload = toScheduleCInput(formData)
    if (payload !== undefined) {
      dispatch(addScheduleC(payload))
    }
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: ScheduleCUserInput): void => {
      const payload = toScheduleCInput(formData)
      if (payload !== undefined) {
        dispatch(editScheduleC({ value: payload, index }))
      }
    }

  const expenseFields: ReactElement[] = enumKeys(ScheduleCExpenseType).map(
    (k, i) => (
      <LabeledInput
        key={i}
        label={displayExpense(ScheduleCExpenseType[k])}
        name={`expenses.${k.toString()}`}
        patternConfig={Patterns.currency}
        required={false}
      />
    )
  )

  const otherExpenseDescription = (() => {
    if ((otherExpensesEntered ?? 0) !== 0) {
      return (
        <LabeledInput
          key={enumKeys(ScheduleCExpenseType).length}
          label="Other expense description"
          name="otherExpenseType"
          required={true}
        />
      )
    }
  })()

  const form = (
    <FormListContainer<ScheduleCUserInput>
      defaultValues={defaultValues}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      items={scheduleCInputs.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(removeScheduleC(i))}
      icon={() => <Business />}
      primary={(sc) => sc.businessName}
      secondary={(sc) => {
        const input = toScheduleCInput(sc)
        if (input === undefined) return ''
        return <Currency value={input.grossReceipts} />
      }}
    >
      <h3>Business Information</h3>
      <Grid container spacing={2}>
        <LabeledInput
          label="Business name"
          name="businessName"
          required={true}
        />
        <LabeledInput
          label="Business activity code"
          name="businessActivityCode"
          required={true}
        />
        <LabeledInput
          label="Business description"
          name="businessDescription"
          required={true}
        />
        <LabeledInput
          label="Employer ID Number (EIN)"
          name="ein"
          patternConfig={Patterns.ein}
          required={false}
        />
        <GenericLabeledDropdown
          dropDownData={enumKeys(AccountingMethod)}
          label="Accounting method"
          textMapping={(m) => {
            const labels: { [k in AccountingMethod]: string } = {
              [AccountingMethod.cash]: 'Cash',
              [AccountingMethod.accrual]: 'Accrual',
              [AccountingMethod.other]: 'Other'
            }
            return labels[AccountingMethod[m]]
          }}
          keyMapping={(_, n) => n}
          name="accountingMethod"
          valueMapping={(n) => AccountingMethod[n]}
        />
        <GenericLabeledDropdown
          dropDownData={people}
          label="Business owner"
          required={true}
          valueMapping={(p: Person, i: number) =>
            [PersonRole.PRIMARY, PersonRole.SPOUSE][i]
          }
          name="personRole"
          keyMapping={(p: Person, i: number) => i}
          textMapping={(p) =>
            `${p.firstName} ${p.lastName} (${formatSSID(p.ssid)})`
          }
        />
      </Grid>
      <h3>Income</h3>
      <Grid container spacing={2}>
        <LabeledInput
          label="Gross receipts or sales"
          name="grossReceipts"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Returns and allowances"
          name="returns"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Other income"
          name="otherIncome"
          patternConfig={Patterns.currency}
          required={false}
        />
      </Grid>
      <h3>Cost of Goods Sold</h3>
      <Grid container spacing={2}>
        <LabeledInput
          label="Inventory at beginning of year"
          name="beginningInventory"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Purchases less cost of items withdrawn for personal use"
          name="purchases"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Cost of labor"
          name="costOfLabor"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Materials and supplies"
          name="materialsAndSupplies"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Other costs"
          name="otherCosts"
          patternConfig={Patterns.currency}
          required={false}
        />
        <LabeledInput
          label="Inventory at end of year"
          name="endingInventory"
          patternConfig={Patterns.currency}
          required={false}
        />
      </Grid>
      <h3>Expenses</h3>
      <Grid container spacing={2}>
        {_.chain([...expenseFields, otherExpenseDescription])
          .chunk(2)
          .map((segment, i) =>
            segment.map((item, k) => (
              <Grid item key={`${i}-${k}`} xs={12} sm={6}>
                {item}
              </Grid>
            ))
          )
          .value()}
      </Grid>
    </FormListContainer>
  )

  return (
    <FormProvider {...methods}>
      <form
        tabIndex={-1}
        onSubmit={intentionallyFloat(handleSubmit(onAdvance))}
      >
        <Helmet>
          <title>Business Income | Income | UsTaxes.org</title>
        </Helmet>
        <h2>Business Income (Schedule C)</h2>
        <p>
          If you are a sole proprietor or single-member LLC, enter your business
          income and expenses here.
        </p>
        {form}
        {navButtons}
      </form>
    </FormProvider>
  )
}

export default BusinessIncome
