import { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, useWatch, FormProvider } from 'react-hook-form'
import { useDispatch } from 'ustaxes/redux'
import { useYearSelector } from 'ustaxes/redux/yearDispatch'
import {
  addRoyaltyIncome,
  editRoyaltyIncome,
  removeRoyaltyIncome
} from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  RoyaltyIncome as RoyaltyIncomeType,
  RoyaltyExpenseType,
  RoyaltyExpenseTypeName,
  PersonRole
} from 'ustaxes/core/data'
import { Currency, LabeledInput } from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { enumKeys, intentionallyFloat } from 'ustaxes/core/util'
import { MonetizationOn } from '@material-ui/icons'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import _ from 'lodash'

interface RoyaltyIncomeAddForm {
  payerName: string
  royaltyReceived?: number
  expenses: Partial<{ [K in RoyaltyExpenseTypeName]: number }>
  otherExpenseType?: string
}

const blankAddForm: RoyaltyIncomeAddForm = {
  payerName: '',
  expenses: {}
}

const displayExpense = (k: RoyaltyExpenseType): string => {
  const lookup = {
    [RoyaltyExpenseType.advertising]: 'Advertising',
    [RoyaltyExpenseType.auto]: 'Auto and travel',
    [RoyaltyExpenseType.cleaning]: 'Cleaning and maintenance',
    [RoyaltyExpenseType.commissions]: 'Commissions',
    [RoyaltyExpenseType.insurance]: 'Insurance',
    [RoyaltyExpenseType.legal]: 'Legal and other professional fees',
    [RoyaltyExpenseType.management]: 'Management fees',
    [RoyaltyExpenseType.interestMortgage]:
      'Mortgage interest paid to banks, etc',
    [RoyaltyExpenseType.interestOther]: 'Other interest',
    [RoyaltyExpenseType.repairs]: 'Repairs',
    [RoyaltyExpenseType.supplies]: 'Supplies',
    [RoyaltyExpenseType.taxes]: 'Taxes',
    [RoyaltyExpenseType.utilities]: 'Utilities',
    [RoyaltyExpenseType.depreciation]: 'Depreciation expense or depletion',
    [RoyaltyExpenseType.other]: 'Other'
  }
  return lookup[k]
}

const toRoyaltyIncome = (formData: RoyaltyIncomeAddForm): RoyaltyIncomeType => {
  const { payerName, royaltyReceived, expenses, otherExpenseType } = formData

  const newExpenses: Partial<{ [K in RoyaltyExpenseTypeName]: number }> =
    Object.fromEntries(
      enumKeys(RoyaltyExpenseType)
        .filter((e) => e in expenses && (expenses[e] as number) > 0)
        .map((e) => [e, Number(expenses[e])])
    )

  return {
    personRole: PersonRole.PRIMARY,
    payerName,
    royaltyReceived: Number(royaltyReceived),
    expenses: newExpenses,
    otherExpenseType
  }
}

const toUserInput = (royalty: RoyaltyIncomeType): RoyaltyIncomeAddForm => ({
  ...blankAddForm,
  payerName: royalty.payerName,
  royaltyReceived: royalty.royaltyReceived,
  expenses: royalty.expenses,
  otherExpenseType: royalty.otherExpenseType
})

export default function RoyaltyIncomeForm(): ReactElement {
  const defaultValues = blankAddForm
  const methods = useForm<RoyaltyIncomeAddForm>({ defaultValues })
  const { handleSubmit, control } = methods

  const dispatch = useDispatch()

  const { onAdvance, navButtons } = usePager()

  const royalties: RoyaltyIncomeType[] = useYearSelector(
    (state) => state.information.royaltyIncomes
  )

  const otherExpensesEntered: number | undefined = useWatch({
    control,
    name: 'expenses.other'
  })

  const deleteRoyalty = (n: number): void => {
    dispatch(removeRoyaltyIncome(n))
  }

  const onAddRoyalty = (formData: RoyaltyIncomeAddForm): void => {
    dispatch(addRoyaltyIncome(toRoyaltyIncome(formData)))
  }

  const onEditRoyalty =
    (index: number) =>
    (formData: RoyaltyIncomeAddForm): void => {
      dispatch(editRoyaltyIncome({ value: toRoyaltyIncome(formData), index }))
    }

  const expenseFields: ReactElement[] = enumKeys(RoyaltyExpenseType).map(
    (k, i) => (
      <LabeledInput
        key={i}
        label={displayExpense(RoyaltyExpenseType[k])}
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
          key={enumKeys(RoyaltyExpenseType).length}
          label="Other description"
          name="otherExpenseType"
          required={true}
        />
      )
    }
  })()

  const form = (
    <FormListContainer
      defaultValues={defaultValues}
      items={royalties.map((a) => toUserInput(a))}
      icon={() => <MonetizationOn />}
      primary={(p) => toRoyaltyIncome(p).payerName}
      secondary={(p) => <Currency value={toRoyaltyIncome(p).royaltyReceived} />}
      onSubmitAdd={onAddRoyalty}
      onSubmitEdit={onEditRoyalty}
      removeItem={(i) => deleteRoyalty(i)}
    >
      <h3>Royalty Payer Information</h3>
      <Grid container spacing={2}>
        <LabeledInput label="Payer name" name="payerName" />
      </Grid>
      <h3>Royalty Income</h3>
      <Grid container spacing={2}>
        <LabeledInput
          name="royaltyReceived"
          label="Royalties received"
          patternConfig={Patterns.currency}
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
          <title>Royalty Income | Income | UsTaxes.org</title>
        </Helmet>
        <h2>Royalty Income</h2>
        <p>
          Enter royalty income received from patents, copyrights, natural
          resources, or other royalty sources. This is reported on Schedule E,
          Part I.
        </p>
        {form}
        {navButtons}
      </form>
    </FormProvider>
  )
}
