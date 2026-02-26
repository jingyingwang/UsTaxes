import { ReactElement, ReactNode } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, FormProvider } from 'react-hook-form'
import { TaxesState, useSelector, useDispatch } from 'ustaxes/redux'
import {
  addScheduleK1Form1120S,
  editScheduleK1Form1120S,
  removeScheduleK1Form1120S
} from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  boxLabel,
  LabeledInput,
  GenericLabeledDropdown,
  formatSSID,
  LabeledCheckbox,
  formatEIN
} from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid, Box } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { Business } from '@material-ui/icons'
import {
  ScheduleK1Form1120S,
  FilingStatus,
  Information,
  Person,
  PersonRole,
  PrimaryPerson,
  Spouse
} from 'ustaxes/core/data'
import { intentionallyFloat } from 'ustaxes/core/util'

interface ScheduleK1Form1120SUserInput {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  corporationName: string
  corporationEin: string
  isForeign: boolean
  isPassive: boolean
  ordinaryBusinessIncome: string
  netRentalRealEstateIncome: string
  otherNetRentalIncome: string
  interestIncome: string
  ordinaryDividends: string
  qualifiedDividends: string
  royalties: string
  netShortTermCapitalGain: string
  netLongTermCapitalGain: string
  section199AQBI: string
}

const blankUserInput: ScheduleK1Form1120SUserInput = {
  personRole: PersonRole.PRIMARY,
  corporationName: '',
  corporationEin: '',
  isForeign: false,
  isPassive: false,
  ordinaryBusinessIncome: '',
  netRentalRealEstateIncome: '',
  otherNetRentalIncome: '',
  interestIncome: '',
  ordinaryDividends: '',
  qualifiedDividends: '',
  royalties: '',
  netShortTermCapitalGain: '',
  netLongTermCapitalGain: '',
  section199AQBI: ''
}

const toUserInput = (
  k1: ScheduleK1Form1120S
): ScheduleK1Form1120SUserInput => ({
  ...blankUserInput,
  personRole: k1.personRole,
  corporationName: k1.corporationName.toString(),
  corporationEin: k1.corporationEin.toString(),
  isForeign: k1.isForeign,
  isPassive: k1.isPassive,
  ordinaryBusinessIncome: k1.ordinaryBusinessIncome.toString(),
  netRentalRealEstateIncome: k1.netRentalRealEstateIncome.toString(),
  otherNetRentalIncome: k1.otherNetRentalIncome.toString(),
  interestIncome: k1.interestIncome.toString(),
  ordinaryDividends: k1.ordinaryDividends.toString(),
  qualifiedDividends: k1.qualifiedDividends.toString(),
  royalties: k1.royalties.toString(),
  netShortTermCapitalGain: k1.netShortTermCapitalGain.toString(),
  netLongTermCapitalGain: k1.netLongTermCapitalGain.toString(),
  section199AQBI: k1.section199AQBI.toString()
})

const toScheduleK1Form1120S = (
  input: ScheduleK1Form1120SUserInput
): ScheduleK1Form1120S | undefined => {
  const { corporationName } = input
  if (corporationName === '') {
    return undefined
  }
  return {
    personRole: input.personRole,
    corporationName: input.corporationName,
    corporationEin: input.corporationEin,
    isForeign: input.isForeign,
    isPassive: input.isPassive,
    ordinaryBusinessIncome: Number(input.ordinaryBusinessIncome),
    netRentalRealEstateIncome: Number(input.netRentalRealEstateIncome),
    otherNetRentalIncome: Number(input.otherNetRentalIncome),
    interestIncome: Number(input.interestIncome),
    ordinaryDividends: Number(input.ordinaryDividends),
    qualifiedDividends: Number(input.qualifiedDividends),
    royalties: Number(input.royalties),
    netShortTermCapitalGain: Number(input.netShortTermCapitalGain),
    netLongTermCapitalGain: Number(input.netLongTermCapitalGain),
    section199AQBI: Number(input.section199AQBI)
  }
}

export const SCorpIncome = (): ReactElement => {
  const information: Information = useSelector(
    (state: TaxesState) => state.information
  )
  const k1s = information.scheduleK1Form1120Ss
  const spouseK1s = k1s.filter((k1) => k1.personRole === PersonRole.SPOUSE)

  const spouse: Spouse | undefined = information.taxPayer.spouse
  const primary: PrimaryPerson | undefined = information.taxPayer.primaryPerson
  const filingStatus: FilingStatus | undefined =
    information.taxPayer.filingStatus

  const people: Person[] = [primary, spouse].flatMap((p) =>
    p !== undefined ? [p as Person] : []
  )

  const defaultValues = blankUserInput
  const methods = useForm<ScheduleK1Form1120SUserInput>({ defaultValues })
  const { handleSubmit } = methods
  const dispatch = useDispatch()
  const { onAdvance, navButtons } = usePager()

  const onSubmitAdd = (formData: ScheduleK1Form1120SUserInput): void => {
    const payload = toScheduleK1Form1120S(formData)
    if (payload !== undefined) {
      dispatch(addScheduleK1Form1120S(payload))
    }
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: ScheduleK1Form1120SUserInput): void => {
      const payload = toScheduleK1Form1120S(formData)
      if (payload !== undefined) {
        dispatch(editScheduleK1Form1120S({ value: payload, index }))
      }
    }

  const form: ReactElement | undefined = (
    <FormListContainer<ScheduleK1Form1120SUserInput>
      defaultValues={defaultValues}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      items={k1s.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(removeScheduleK1Form1120S(i))}
      icon={() => <Business />}
      primary={(k1) => k1.corporationName}
      secondary={(k1) => {
        const parsed = toScheduleK1Form1120S(k1)
        if (parsed === undefined) return ''
        return <span>{formatEIN(parsed.corporationEin)}</span>
      }}
    >
      {' '}
      <Grid container spacing={2}>
        <h3>S-Corporation Income from Schedule K-1 (Form 1120-S)</h3>
        <LabeledInput label="Corporation name" name="corporationName" />
        <LabeledInput
          label="Corporation EIN"
          name="corporationEin"
          patternConfig={Patterns.ein}
        />
        <LabeledCheckbox
          label=" If a foreign corporation, check this box"
          name="isForeign"
        />
        <LabeledCheckbox
          label=" If this is passive activity, check this box"
          name="isPassive"
        />
        <LabeledInput
          label={boxLabel('1', 'Ordinary business income (loss)')}
          patternConfig={Patterns.currency}
          name="ordinaryBusinessIncome"
        />
        <LabeledInput
          label={boxLabel('2', 'Net rental real estate income (loss)')}
          patternConfig={Patterns.currency}
          name="netRentalRealEstateIncome"
        />
        <LabeledInput
          label={boxLabel('3', 'Other net rental income (loss)')}
          patternConfig={Patterns.currency}
          name="otherNetRentalIncome"
        />
        <LabeledInput
          label={boxLabel('4', 'Interest income')}
          patternConfig={Patterns.currency}
          name="interestIncome"
        />
        <LabeledInput
          label={boxLabel('5a', 'Ordinary dividends')}
          patternConfig={Patterns.currency}
          name="ordinaryDividends"
        />
        <LabeledInput
          label={boxLabel('5b', 'Qualified dividends')}
          patternConfig={Patterns.currency}
          name="qualifiedDividends"
        />
        <LabeledInput
          label={boxLabel('6', 'Royalties')}
          patternConfig={Patterns.currency}
          name="royalties"
        />
        <LabeledInput
          label={boxLabel('7', 'Net short-term capital gain (loss)')}
          patternConfig={Patterns.currency}
          name="netShortTermCapitalGain"
        />
        <LabeledInput
          label={boxLabel('8a', 'Net long-term capital gain (loss)')}
          patternConfig={Patterns.currency}
          name="netLongTermCapitalGain"
        />
        <LabeledInput
          label={boxLabel('17', 'Other information - Code V (Section 199A)')}
          patternConfig={Patterns.currency}
          name="section199AQBI"
        />
        <GenericLabeledDropdown
          dropDownData={people}
          label="Shareholder"
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

  const spouseMessage: ReactNode = (() => {
    if (
      spouse !== undefined &&
      spouseK1s.length > 0 &&
      filingStatus === FilingStatus.MFS
    ) {
      return (
        <div>
          <Box marginBottom={3}>
            <Alert className="inner" severity="warning">
              Filing status is set to Married Filing Separately.{' '}
              <strong>{spouse.firstName}</strong>
              &apos;s K-1s will not be added to the return.
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
          <title>S-Corporation Income | Income | UsTaxes.org</title>
        </Helmet>
        <h2>S-Corporation Income</h2>
        <p>
          If you received Schedule K-1 (Form 1120-S) from an S-Corporation,
          enter the information here.
        </p>
        {form}
        {spouseMessage}
        {navButtons}
      </form>
    </FormProvider>
  )
}

export default SCorpIncome
