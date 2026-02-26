import { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { FormProvider, useForm } from 'react-hook-form'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import {
  addCasualtyTheftLoss,
  editCasualtyTheftLoss,
  removeCasualtyTheftLoss
} from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  Currency,
  LabeledCheckbox,
  LabeledDropdown,
  LabeledInput
} from 'ustaxes/components/input'
import { CasualtyTheftLoss, CasualtyLossUse } from 'ustaxes/core/data'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { intentionallyFloat } from 'ustaxes/core/util'

interface CasualtyLossUserInput {
  description: string
  date: string
  use: CasualtyLossUse
  isFederallyDeclaredDisaster: boolean
  costOrBasis: string | number
  fmvBefore: string | number
  fmvAfter: string | number
  reimbursement: string | number
}

const blankUserInput: CasualtyLossUserInput = {
  description: '',
  date: '',
  use: 'Personal',
  isFederallyDeclaredDisaster: false,
  costOrBasis: '',
  fmvBefore: '',
  fmvAfter: '',
  reimbursement: ''
}

const useOptions: CasualtyLossUse[] = ['Personal', 'Business', 'Income']

const toUserInput = (loss: CasualtyTheftLoss): CasualtyLossUserInput => ({
  ...blankUserInput,
  description: loss.description,
  date: loss.date,
  use: loss.use,
  isFederallyDeclaredDisaster: loss.isFederallyDeclaredDisaster,
  costOrBasis: loss.costOrBasis,
  fmvBefore: loss.fmvBefore,
  fmvAfter: loss.fmvAfter,
  reimbursement: loss.reimbursement
})

const toCasualtyLoss = (loss: CasualtyLossUserInput): CasualtyTheftLoss => ({
  description: loss.description,
  date: loss.date,
  use: loss.use,
  isFederallyDeclaredDisaster: loss.isFederallyDeclaredDisaster,
  costOrBasis: Number(loss.costOrBasis),
  fmvBefore: Number(loss.fmvBefore),
  fmvAfter: Number(loss.fmvAfter),
  reimbursement: Number(loss.reimbursement)
})

const netGainLoss = (loss: CasualtyTheftLoss): number => {
  const fmvLoss = Math.max(0, loss.fmvBefore - loss.fmvAfter)
  const baseLoss = Math.min(loss.costOrBasis, fmvLoss)
  const lossAfterReimbursement = Math.max(0, baseLoss - loss.reimbursement)
  const gainFromReimbursement = Math.max(0, loss.reimbursement - loss.costOrBasis)
  return gainFromReimbursement - lossAfterReimbursement
}

const showSummary = (loss: CasualtyTheftLoss): ReactElement => (
  <div>
    <div>Use: {loss.use}</div>
    <div>
      Net gain/loss: <Currency value={netGainLoss(loss)} />
    </div>
  </div>
)

export default function CasualtyTheftLosses(): ReactElement {
  const losses = useSelector(
    (state: TaxesState) => state.information.casualtyTheftLosses ?? []
  )

  const defaultValues: CasualtyLossUserInput = blankUserInput

  const { onAdvance, navButtons } = usePager()
  const methods = useForm<CasualtyLossUserInput>({ defaultValues })
  const { handleSubmit } = methods
  const dispatch = useDispatch()

  const onAdd = (formData: CasualtyLossUserInput): void => {
    dispatch(addCasualtyTheftLoss(toCasualtyLoss(formData)))
  }

  const onEdit =
    (index: number) =>
    (formData: CasualtyLossUserInput): void => {
      dispatch(editCasualtyTheftLoss({ value: toCasualtyLoss(formData), index }))
    }

  const form: ReactElement | undefined = (
    <FormListContainer
      defaultValues={defaultValues}
      onSubmitAdd={onAdd}
      onSubmitEdit={onEdit}
      items={losses.map((loss) => toUserInput(loss))}
      removeItem={(i) => dispatch(removeCasualtyTheftLoss(i))}
      primary={(loss) => loss.description}
      secondary={(loss) => showSummary(toCasualtyLoss(loss))}
    >
      <p>
        Enter each casualty or theft event separately. Personal-use losses are
        only deductible for federally declared disasters.
      </p>
      <Grid container spacing={2}>
        <LabeledInput
          autofocus={true}
          label="Description of property"
          required={true}
          name="description"
        />
        <LabeledInput
          label="Date of loss (YYYY-MM-DD)"
          name="date"
          patternConfig={Patterns.plain}
          required={false}
        />
        <LabeledDropdown
          label="Property use"
          name="use"
          required={true}
          dropDownData={useOptions}
        />
        <LabeledCheckbox
          label="Federally declared disaster (personal-use only)"
          name="isFederallyDeclaredDisaster"
        />
        <LabeledInput
          label="Cost or other basis"
          patternConfig={Patterns.currency}
          name="costOrBasis"
          required={false}
        />
        <LabeledInput
          label="FMV before"
          patternConfig={Patterns.currency}
          name="fmvBefore"
          required={false}
        />
        <LabeledInput
          label="FMV after"
          patternConfig={Patterns.currency}
          name="fmvAfter"
          required={false}
        />
        <LabeledInput
          label="Insurance or other reimbursement"
          patternConfig={Patterns.currency}
          name="reimbursement"
          required={false}
        />
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
          <title>
            Casualty and Theft Losses | Deductions | UsTaxes.org
          </title>
        </Helmet>
        <h2>Casualty and Theft Losses</h2>
        {form}
        {navButtons}
      </form>
    </FormProvider>
  )
}
