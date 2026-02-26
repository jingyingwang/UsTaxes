import { ReactElement, ReactNode } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, FormProvider } from 'react-hook-form'
import { TaxesState, useSelector, useDispatch } from 'ustaxes/redux'
import {
  addScheduleK1Form1041,
  editScheduleK1Form1041,
  removeScheduleK1Form1041
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
import { AccountBalance } from '@material-ui/icons'
import {
  ScheduleK1Form1041,
  FilingStatus,
  Information,
  Person,
  PersonRole,
  PrimaryPerson,
  Spouse
} from 'ustaxes/core/data'
import { intentionallyFloat } from 'ustaxes/core/util'

interface ScheduleK1Form1041UserInput {
  personRole: PersonRole.PRIMARY | PersonRole.SPOUSE
  estateTrustName: string
  estateTrustEin: string
  isForeign: boolean
  isPassive: boolean
  interestIncome: string
  ordinaryDividends: string
  qualifiedDividends: string
  netShortTermCapitalGain: string
  netLongTermCapitalGain: string
  otherPortfolioAndNonbusinessIncome: string
  ordinaryBusinessIncome: string
  netRentalRealEstateIncome: string
  otherRentalIncome: string
  directlyApportionedDeductions: string
  section199AQBI: string
}

const blankUserInput: ScheduleK1Form1041UserInput = {
  personRole: PersonRole.PRIMARY,
  estateTrustName: '',
  estateTrustEin: '',
  isForeign: false,
  isPassive: false,
  interestIncome: '',
  ordinaryDividends: '',
  qualifiedDividends: '',
  netShortTermCapitalGain: '',
  netLongTermCapitalGain: '',
  otherPortfolioAndNonbusinessIncome: '',
  ordinaryBusinessIncome: '',
  netRentalRealEstateIncome: '',
  otherRentalIncome: '',
  directlyApportionedDeductions: '',
  section199AQBI: ''
}

const toUserInput = (k1: ScheduleK1Form1041): ScheduleK1Form1041UserInput => ({
  ...blankUserInput,
  personRole: k1.personRole,
  estateTrustName: k1.estateTrustName.toString(),
  estateTrustEin: k1.estateTrustEin.toString(),
  isForeign: k1.isForeign,
  isPassive: k1.isPassive,
  interestIncome: k1.interestIncome.toString(),
  ordinaryDividends: k1.ordinaryDividends.toString(),
  qualifiedDividends: k1.qualifiedDividends.toString(),
  netShortTermCapitalGain: k1.netShortTermCapitalGain.toString(),
  netLongTermCapitalGain: k1.netLongTermCapitalGain.toString(),
  otherPortfolioAndNonbusinessIncome:
    k1.otherPortfolioAndNonbusinessIncome.toString(),
  ordinaryBusinessIncome: k1.ordinaryBusinessIncome.toString(),
  netRentalRealEstateIncome: k1.netRentalRealEstateIncome.toString(),
  otherRentalIncome: k1.otherRentalIncome.toString(),
  directlyApportionedDeductions: k1.directlyApportionedDeductions.toString(),
  section199AQBI: k1.section199AQBI.toString()
})

const toScheduleK1Form1041 = (
  input: ScheduleK1Form1041UserInput
): ScheduleK1Form1041 | undefined => {
  const { estateTrustName } = input
  if (estateTrustName === '') {
    return undefined
  }
  return {
    personRole: input.personRole,
    estateTrustName: input.estateTrustName,
    estateTrustEin: input.estateTrustEin,
    isForeign: input.isForeign,
    isPassive: input.isPassive,
    interestIncome: Number(input.interestIncome),
    ordinaryDividends: Number(input.ordinaryDividends),
    qualifiedDividends: Number(input.qualifiedDividends),
    netShortTermCapitalGain: Number(input.netShortTermCapitalGain),
    netLongTermCapitalGain: Number(input.netLongTermCapitalGain),
    otherPortfolioAndNonbusinessIncome: Number(
      input.otherPortfolioAndNonbusinessIncome
    ),
    ordinaryBusinessIncome: Number(input.ordinaryBusinessIncome),
    netRentalRealEstateIncome: Number(input.netRentalRealEstateIncome),
    otherRentalIncome: Number(input.otherRentalIncome),
    directlyApportionedDeductions: Number(input.directlyApportionedDeductions),
    section199AQBI: Number(input.section199AQBI)
  }
}

export const EstateAndTrustIncome = (): ReactElement => {
  const information: Information = useSelector(
    (state: TaxesState) => state.information
  )
  const k1s = information.scheduleK1Form1041s
  const spouseK1s = k1s.filter((k1) => k1.personRole === PersonRole.SPOUSE)

  const spouse: Spouse | undefined = information.taxPayer.spouse
  const primary: PrimaryPerson | undefined = information.taxPayer.primaryPerson
  const filingStatus: FilingStatus | undefined =
    information.taxPayer.filingStatus

  const people: Person[] = [primary, spouse].flatMap((p) =>
    p !== undefined ? [p as Person] : []
  )

  const defaultValues = blankUserInput
  const methods = useForm<ScheduleK1Form1041UserInput>({ defaultValues })
  const { handleSubmit } = methods
  const dispatch = useDispatch()
  const { onAdvance, navButtons } = usePager()

  const onSubmitAdd = (formData: ScheduleK1Form1041UserInput): void => {
    const payload = toScheduleK1Form1041(formData)
    if (payload !== undefined) {
      dispatch(addScheduleK1Form1041(payload))
    }
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: ScheduleK1Form1041UserInput): void => {
      const payload = toScheduleK1Form1041(formData)
      if (payload !== undefined) {
        dispatch(editScheduleK1Form1041({ value: payload, index }))
      }
    }

  const form: ReactElement | undefined = (
    <FormListContainer<ScheduleK1Form1041UserInput>
      defaultValues={defaultValues}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      items={k1s.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(removeScheduleK1Form1041(i))}
      icon={() => <AccountBalance />}
      primary={(k1) => k1.estateTrustName}
      secondary={(k1) => {
        const parsed = toScheduleK1Form1041(k1)
        if (parsed === undefined) return ''
        return <span>{formatEIN(parsed.estateTrustEin)}</span>
      }}
    >
      {' '}
      <Grid container spacing={2}>
        <h3>Estate &amp; Trust Income from Schedule K-1 (Form 1041)</h3>
        <LabeledInput label="Estate or trust name" name="estateTrustName" />
        <LabeledInput
          label="Estate or trust EIN"
          name="estateTrustEin"
          patternConfig={Patterns.ein}
        />
        <LabeledCheckbox
          label=" If a foreign trust, check this box"
          name="isForeign"
        />
        <LabeledCheckbox
          label=" If this is passive activity, check this box"
          name="isPassive"
        />
        <LabeledInput
          label={boxLabel('1', 'Interest income')}
          patternConfig={Patterns.currency}
          name="interestIncome"
        />
        <LabeledInput
          label={boxLabel('2a', 'Ordinary dividends')}
          patternConfig={Patterns.currency}
          name="ordinaryDividends"
        />
        <LabeledInput
          label={boxLabel('2b', 'Qualified dividends')}
          patternConfig={Patterns.currency}
          name="qualifiedDividends"
        />
        <LabeledInput
          label={boxLabel('3', 'Net short-term capital gain')}
          patternConfig={Patterns.currency}
          name="netShortTermCapitalGain"
        />
        <LabeledInput
          label={boxLabel('4a', 'Net long-term capital gain')}
          patternConfig={Patterns.currency}
          name="netLongTermCapitalGain"
        />
        <LabeledInput
          label={boxLabel('5', 'Other portfolio and nonbusiness income')}
          patternConfig={Patterns.currency}
          name="otherPortfolioAndNonbusinessIncome"
        />
        <LabeledInput
          label={boxLabel('6', 'Ordinary business income')}
          patternConfig={Patterns.currency}
          name="ordinaryBusinessIncome"
        />
        <LabeledInput
          label={boxLabel('7', 'Net rental real estate income')}
          patternConfig={Patterns.currency}
          name="netRentalRealEstateIncome"
        />
        <LabeledInput
          label={boxLabel('8', 'Other rental income')}
          patternConfig={Patterns.currency}
          name="otherRentalIncome"
        />
        <LabeledInput
          label={boxLabel('9', 'Directly apportioned deductions')}
          patternConfig={Patterns.currency}
          name="directlyApportionedDeductions"
        />
        <LabeledInput
          label={boxLabel('14', 'Other information - Code I (Section 199A)')}
          patternConfig={Patterns.currency}
          name="section199AQBI"
        />
        <GenericLabeledDropdown
          dropDownData={people}
          label="Beneficiary"
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
          <title>Estate &amp; Trust Income | Income | UsTaxes.org</title>
        </Helmet>
        <h2>Estate &amp; Trust Income</h2>
        <p>
          If you received Schedule K-1 (Form 1041) from an estate or trust,
          enter the information here.
        </p>
        {form}
        {spouseMessage}
        {navButtons}
      </form>
    </FormProvider>
  )
}

export default EstateAndTrustIncome
