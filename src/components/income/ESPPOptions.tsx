import { ReactElement, ReactNode } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, FormProvider } from 'react-hook-form'
import { TaxesState, useSelector, useDispatch } from 'ustaxes/redux'
import { addF3922, editF3922, removeF3922 } from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  LabeledInput,
  GenericLabeledDropdown,
  formatSSID
} from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Currency } from 'ustaxes/components/input'
import { Grid, Box } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { ShowChartOutlined as StockIcon } from '@material-ui/icons'
import {
  F3922,
  FilingStatus,
  Information,
  Person,
  PersonRole,
  PrimaryPerson,
  Spouse
} from 'ustaxes/core/data'
import { intentionallyFloat } from 'ustaxes/core/util'

interface F3922UserInput {
  name: string
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  fmvPerShareOnGrant?: string
  fmvPerShareOnExercise?: string
  exercisePricePerShare?: string
  numShares?: string
}

const blankUserInput: F3922UserInput = {
  name: '',
  personRole: PersonRole.PRIMARY,
  fmvPerShareOnGrant: '',
  fmvPerShareOnExercise: '',
  exercisePricePerShare: '',
  numShares: ''
}

const toUserInput = (f: F3922): F3922UserInput => ({
  ...blankUserInput,
  name: f.name,
  personRole: f.personRole,
  fmvPerShareOnGrant: f.fmvPerShareOnGrant.toString(),
  fmvPerShareOnExercise: f.fmvPerShareOnExercise.toString(),
  exercisePricePerShare: f.exercisePricePerShare.toString(),
  numShares: f.numShares.toString()
})

const toF3922 = (input: F3922UserInput): F3922 | undefined => {
  const {
    name,
    personRole,
    fmvPerShareOnGrant,
    fmvPerShareOnExercise,
    exercisePricePerShare,
    numShares
  } = input
  if (name === '') {
    return undefined
  }
  return {
    name,
    personRole,
    fmvPerShareOnGrant: Number(fmvPerShareOnGrant),
    fmvPerShareOnExercise: Number(fmvPerShareOnExercise),
    exercisePricePerShare: Number(exercisePricePerShare),
    numShares: Number(numShares)
  }
}

export const ESPPOptions = (): ReactElement => {
  const defaultValues = blankUserInput
  const information: Information = useSelector(
    (state: TaxesState) => state.information
  )
  const f3922s = information.f3922s
  const spouseF3922s = f3922s.filter(
    (f3922) => f3922.personRole === PersonRole.SPOUSE
  )

  const spouse: Spouse | undefined = information.taxPayer.spouse

  const primary: PrimaryPerson | undefined = information.taxPayer.primaryPerson

  const filingStatus: FilingStatus | undefined =
    information.taxPayer.filingStatus

  const people: Person[] = [primary, spouse].flatMap((p) =>
    p !== undefined ? [p as Person] : []
  )

  const methods = useForm<F3922UserInput>({ defaultValues })
  const { handleSubmit } = methods
  const dispatch = useDispatch()

  const { onAdvance, navButtons } = usePager()

  const onSubmitAdd = (formData: F3922UserInput): void => {
    const payload = toF3922(formData)
    if (payload !== undefined) {
      dispatch(addF3922(payload))
    }
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: F3922UserInput): void => {
      const payload = toF3922(formData)
      if (payload !== undefined) {
        dispatch(editF3922({ value: payload, index }))
      }
    }

  const form: ReactElement | undefined = (
    <FormListContainer<F3922UserInput>
      defaultValues={defaultValues}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      items={f3922s.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(removeF3922(i))}
      icon={() => <StockIcon />}
      primary={(f) => f.name}
      secondary={(f) => {
        const f3922 = toF3922(f)
        if (f3922 === undefined) return ''
        return (
          <span>
            {f3922.numShares} shares @{' '}
            <Currency plain={true} value={f3922.exercisePricePerShare} />;{' '}
            <Currency plain={true} value={f3922.fmvPerShareOnExercise} /> FMV
          </span>
        )
      }}
    >
      {' '}
      <Grid container spacing={2}>
        <h3>Manage ESPP Stock Transfers</h3>
        <LabeledInput label="Company name" name="name" />
        <LabeledInput
          label="FMV per share on grant date"
          patternConfig={Patterns.currency}
          name="fmvPerShareOnGrant"
        />
        <LabeledInput
          label="FMV per share on exercise date"
          patternConfig={Patterns.currency}
          name="fmvPerShareOnExercise"
        />
        <LabeledInput
          label="Exercise price per share"
          patternConfig={Patterns.currency}
          name="exercisePricePerShare"
        />
        <LabeledInput
          label="Number of shares transferred"
          patternConfig={Patterns.number}
          name="numShares"
        />
        <GenericLabeledDropdown
          dropDownData={people}
          label="Employee"
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
    </FormListContainer>
  )

  const spouseF3922Message: ReactNode = (() => {
    if (
      spouse !== undefined &&
      spouseF3922s.length > 0 &&
      filingStatus === FilingStatus.MFS
    ) {
      return (
        <div>
          <Box marginBottom={3}>
            <Alert className="inner" severity="warning">
              Filing status is set to Married Filing Separately.{' '}
              <strong>{spouse.firstName}</strong>
              &apos;s F3922s will not be added to the return.
            </Alert>
          </Box>
        </div>
      )
    }
  })()

  return (
    <FormProvider {...methods}>
      <form
        tabIndex={-1}
        onSubmit={intentionallyFloat(handleSubmit(onAdvance))}
      >
        <Helmet>
          <title>ESPP Stock Transfers | Income | UsTaxes.org</title>
        </Helmet>
        <h2>ESPP Stock Transfers</h2>
        <p>
          If you received Form 3922 for an Employee Stock Purchase Plan (ESPP)
          transfer, enter the information here.
        </p>
        {form}
        {spouseF3922Message}
        {navButtons}
      </form>
    </FormProvider>
  )
}

export default ESPPOptions
