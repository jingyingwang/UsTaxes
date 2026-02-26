import { ReactElement } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { usePager } from 'ustaxes/components/pager'
import { EstimatedTaxPayments, TaxYear } from 'ustaxes/core/data'
import { YearsTaxesState } from 'ustaxes/redux'
import { Currency, LabeledInput } from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { Work } from '@material-ui/icons'
import {
  addEstimatedPayment,
  editEstimatedPayment,
  removeEstimatedPayment,
  setPriorYearTax
} from 'ustaxes/redux/actions'
import { useDispatch } from 'ustaxes/redux'
import { useSelector } from 'react-redux'
import { useYearSelector } from 'ustaxes/redux/yearDispatch'

interface EstimatedTaxesUserInput {
  label: string
  payment: string
}

const blankUserInput: EstimatedTaxesUserInput = {
  label: '',
  payment: ''
}

const toPayments = (
  formData: EstimatedTaxesUserInput
): EstimatedTaxPayments => ({
  ...formData,
  // Note we are not error checking here because
  // we are already in the input validated happy path
  // of handleSubmit.
  label: formData.label,
  payment: parseInt(formData.payment)
})

const toEstimatedTaxesUserInput = (
  data: EstimatedTaxPayments
): EstimatedTaxesUserInput => ({
  ...blankUserInput,
  ...data,
  label: data.label,
  payment: data.payment.toString()
})

export default function EstimatedTaxes(): ReactElement {
  const defaultValues = blankUserInput
  const activeYear: TaxYear = useSelector(
    (state: YearsTaxesState) => state.activeYear
  )

  const estimatedTaxes = useYearSelector(
    (state) => state.information.estimatedTaxes
  )

  const priorYearTax = useYearSelector(
    (state) => state.information.priorYearTax
  )

  const dispatch = useDispatch()

  const methods = useForm<EstimatedTaxesUserInput>({ defaultValues })

  const priorYearTaxMethods = useForm<{ priorYearTax: string }>({
    defaultValues: { priorYearTax: priorYearTax?.toString() ?? '' }
  })

  const onSavePriorYearTax = (formData: { priorYearTax: string }): void => {
    const value = parseInt(formData.priorYearTax)
    if (!isNaN(value) && value >= 0) {
      dispatch(setPriorYearTax(value))
    }
  }

  const { navButtons, onAdvance } = usePager()

  const onSubmitAdd = (formData: EstimatedTaxesUserInput): void => {
    dispatch(addEstimatedPayment(toPayments(formData)))
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: EstimatedTaxesUserInput): void => {
      dispatch(editEstimatedPayment({ index, value: toPayments(formData) }))
    }

  const w2sBlock = (
    <FormListContainer<EstimatedTaxesUserInput>
      defaultValues={defaultValues}
      items={estimatedTaxes.map((a) => toEstimatedTaxesUserInput(a))}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      removeItem={(i) => dispatch(removeEstimatedPayment(i))}
      icon={() => <Work />}
      primary={(estimatedTaxes: EstimatedTaxesUserInput) =>
        estimatedTaxes.label
      }
      secondary={(estimatedTaxes: EstimatedTaxesUserInput) => (
        <span>
          Payment: <Currency value={toPayments(estimatedTaxes).payment} />
        </span>
      )}
    >
      <Grid container spacing={2}>
        <LabeledInput
          name="label"
          label="label or date of this payment"
          patternConfig={Patterns.plain}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="payment"
          label="Estimated tax payment"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
      </Grid>
    </FormListContainer>
  )

  const priorYearTaxBlock = (
    <FormProvider {...priorYearTaxMethods}>
      <Grid container spacing={2}>
        <LabeledInput
          name="priorYearTax"
          label="Prior year total tax (Form 1040, line 24)"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <button
            type="button"
            onClick={() => {
              void priorYearTaxMethods.handleSubmit(onSavePriorYearTax)()
            }}
          >
            Save Prior Year Tax
          </button>
        </Grid>
      </Grid>
    </FormProvider>
  )

  const form: ReactElement = (
    <>
      {w2sBlock}
      <h3>Prior Year Tax (for Form 2210 penalty calculation)</h3>
      <p>
        Enter your prior year total tax to enable the safe harbor calculation.
        If your prior year tax was zero, no estimated tax penalty applies.
      </p>
      {priorYearTaxBlock}
    </>
  )

  return (
    <form tabIndex={-1} onSubmit={onAdvance}>
      <h2>Estimated Taxes</h2>
      <p>
        Did you already make payments towards your {activeYear} taxes this year
        or last year?
      </p>
      <FormProvider {...methods}>{form}</FormProvider>
      {navButtons}
    </form>
  )
}
