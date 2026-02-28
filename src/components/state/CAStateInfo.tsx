import { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { Grid } from '@material-ui/core'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import { CAStateInput } from 'ustaxes/core/data'
import { LabeledCheckbox, LabeledInput } from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { setCAStateInput } from 'ustaxes/redux/actions'
import { FormProvider, useForm } from 'react-hook-form'
import { usePager } from 'ustaxes/components/pager'
import { intentionallyFloat, parseFormNumber } from 'ustaxes/core/util'

interface CAStateUserInput {
  isRenter: boolean
  qualifyingCareExpenses: string
}

const toCAStateInput = (formData: CAStateUserInput): CAStateInput => ({
  isRenter: formData.isRenter,
  qualifyingCareExpenses: parseFormNumber(formData.qualifyingCareExpenses)
})

const toUserInput = (data?: CAStateInput): CAStateUserInput => ({
  isRenter: data?.isRenter ?? false,
  qualifyingCareExpenses: data?.qualifyingCareExpenses?.toString() ?? ''
})

export default function CAStateInfo(): ReactElement {
  const dispatch = useDispatch()
  const information = useSelector((state: TaxesState) => state.information)

  const defaultValues = toUserInput(information.caStateInput)
  const methods = useForm<CAStateUserInput>({ defaultValues })
  const { handleSubmit } = methods

  const { navButtons, onAdvance } = usePager()

  const onSubmit = (formData: CAStateUserInput): void => {
    dispatch(setCAStateInput(toCAStateInput(formData)))
    onAdvance()
  }

  return (
    <FormProvider {...methods}>
      <form tabIndex={-1} onSubmit={intentionallyFloat(handleSubmit(onSubmit))}>
        <Helmet>
          <title>California State Information | UsTaxes.org</title>
        </Helmet>
        <h2>California State Information</h2>

        <h3>Renter&apos;s Credit</h3>
        <p>
          California offers a nonrefundable renter&apos;s credit if you rented a
          dwelling in California as your principal residence for at least half
          the year. Income limits apply.
        </p>
        <Grid container spacing={2}>
          <LabeledCheckbox
            label="I rented a CA dwelling as my principal residence for 6+ months"
            name="isRenter"
          />
        </Grid>

        <h3>Child and Dependent Care Expenses</h3>
        <p>
          If you paid for child or dependent care so you (and your spouse) could
          work or look for work, enter your qualifying expenses below. This is
          used for the California Child and Dependent Care Expenses Credit.
        </p>
        <Grid container spacing={2}>
          <LabeledInput
            label="Qualifying care expenses paid"
            name="qualifyingCareExpenses"
            patternConfig={Patterns.currency}
            required={false}
            sizes={{ xs: 12, lg: 6 }}
          />
        </Grid>

        {navButtons}
      </form>
    </FormProvider>
  )
}
