import { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { FormProvider, useForm } from 'react-hook-form'
import SchoolIcon from '@material-ui/icons/School'
import { Grid } from '@material-ui/core'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import { add1098t, edit1098t, remove1098t } from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  Currency,
  GenericLabeledDropdown,
  LabeledCheckbox,
  LabeledInput,
  LabeledRadio
} from 'ustaxes/components/input'
import {
  EducationCreditType,
  EducationStudent,
  F1098t,
  Person,
  PersonRole
} from 'ustaxes/core/data'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { intentionallyFloat } from 'ustaxes/core/util'

interface StudentOption {
  id: string
  label: string
  role: PersonRole
  dependentIndex?: number
}

interface F1098TUserInput {
  studentId: string
  creditType: EducationCreditType
  institution: string
  institutionEin: string
  paymentsReceived: string | number
  adjustmentsToQualifiedExpenses: string | number
  scholarshipsOrGrants: string | number
  adjustmentsToScholarships: string | number
  additionalQualifiedExpenses: string | number
  otherTaxFreeAssistance: string | number
  atLeastHalfTime: boolean
  graduateStudent: boolean
  aotcClaimedYears: string | number
  felonyDrugConviction: boolean
}

const blankUserInput: F1098TUserInput = {
  studentId: '',
  creditType: EducationCreditType.AOTC,
  institution: '',
  institutionEin: '',
  paymentsReceived: '',
  adjustmentsToQualifiedExpenses: '',
  scholarshipsOrGrants: '',
  adjustmentsToScholarships: '',
  additionalQualifiedExpenses: '',
  otherTaxFreeAssistance: '',
  atLeastHalfTime: false,
  graduateStudent: false,
  aotcClaimedYears: 0,
  felonyDrugConviction: false
}

const toStudentId = (student: EducationStudent): string => {
  if (student.role === PersonRole.DEPENDENT) {
    return `DEPENDENT-${student.dependentIndex ?? 0}`
  }
  return student.role
}

const parseStudentId = (studentId: string): EducationStudent => {
  if (studentId.startsWith('DEPENDENT-')) {
    const index = Number(studentId.split('-')[1] ?? 0)
    return { role: PersonRole.DEPENDENT, dependentIndex: index }
  }
  if (studentId === PersonRole.SPOUSE) {
    return { role: PersonRole.SPOUSE }
  }
  return { role: PersonRole.PRIMARY }
}

const toUserInput = (f: F1098t): F1098TUserInput => ({
  ...blankUserInput,
  studentId: toStudentId(f.student),
  creditType: f.creditType,
  institution: f.institution,
  institutionEin: f.institutionEin ?? '',
  paymentsReceived: f.paymentsReceived,
  adjustmentsToQualifiedExpenses: f.adjustmentsToQualifiedExpenses,
  scholarshipsOrGrants: f.scholarshipsOrGrants,
  adjustmentsToScholarships: f.adjustmentsToScholarships,
  additionalQualifiedExpenses: f.additionalQualifiedExpenses,
  otherTaxFreeAssistance: f.otherTaxFreeAssistance,
  atLeastHalfTime: f.atLeastHalfTime,
  graduateStudent: f.graduateStudent,
  aotcClaimedYears: f.aotcClaimedYears,
  felonyDrugConviction: f.felonyDrugConviction
})

const toNumber = (value: string | number): number =>
  value === '' ? 0 : Number(value)

const toF1098t = (f: F1098TUserInput): F1098t => ({
  student: parseStudentId(f.studentId),
  creditType: f.creditType,
  institution: f.institution,
  institutionEin: f.institutionEin.length > 0 ? f.institutionEin : undefined,
  paymentsReceived: toNumber(f.paymentsReceived),
  adjustmentsToQualifiedExpenses: toNumber(f.adjustmentsToQualifiedExpenses),
  scholarshipsOrGrants: toNumber(f.scholarshipsOrGrants),
  adjustmentsToScholarships: toNumber(f.adjustmentsToScholarships),
  additionalQualifiedExpenses: toNumber(f.additionalQualifiedExpenses),
  otherTaxFreeAssistance: toNumber(f.otherTaxFreeAssistance),
  atLeastHalfTime: f.atLeastHalfTime,
  graduateStudent: f.graduateStudent,
  aotcClaimedYears: Math.min(
    4,
    Math.max(0, Math.round(toNumber(f.aotcClaimedYears)))
  ),
  felonyDrugConviction: f.felonyDrugConviction
})

const studentName = (studentId: string, options: StudentOption[]): string =>
  options.find((o) => o.id === studentId)?.label ?? 'Student'

export default function F1098tInfo(): ReactElement {
  const f1098ts = useSelector((state: TaxesState) => state.information.f1098ts)
  const taxPayer = useSelector((state: TaxesState) => state.information.taxPayer)

  const people: Person[] = [
    taxPayer.primaryPerson,
    taxPayer.spouse,
    ...taxPayer.dependents
  ].flatMap((p) => (p !== undefined ? [p as Person] : []))

  const studentOptions: StudentOption[] = people.map((p, idx) => {
    if (p.role === PersonRole.DEPENDENT) {
      const depIndex = taxPayer.dependents.findIndex(
        (d) => d.ssid === p.ssid
      )
      return {
        id: `DEPENDENT-${depIndex >= 0 ? depIndex : idx}`,
        label: `${p.firstName} ${p.lastName} (Dependent)`,
        role: PersonRole.DEPENDENT,
        dependentIndex: depIndex >= 0 ? depIndex : idx
      }
    }
    return {
      id: p.role,
      label: `${p.firstName} ${p.lastName} (${p.role.toLowerCase()})`,
      role: p.role
    }
  })

  const defaultValues: F1098TUserInput = blankUserInput
  const { onAdvance, navButtons } = usePager()

  const methods = useForm<F1098TUserInput>({ defaultValues })
  const { handleSubmit } = methods

  const dispatch = useDispatch()

  const onAdd = (formData: F1098TUserInput): void => {
    dispatch(add1098t(toF1098t(formData)))
  }

  const onEdit =
    (index: number) =>
    (formData: F1098TUserInput): void => {
      dispatch(edit1098t({ value: toF1098t(formData), index }))
    }

  const form: ReactElement | undefined = (
    <FormListContainer
      defaultValues={defaultValues}
      onSubmitAdd={onAdd}
      onSubmitEdit={onEdit}
      items={f1098ts.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(remove1098t(i))}
      primary={(f) => studentName(f.studentId, studentOptions)}
      secondary={(f) => <Currency value={toNumber(f.paymentsReceived)} />}
      icon={() => <SchoolIcon />}
    >
      <p>Enter information from each student&apos;s Form 1098-T.</p>
      <Grid container spacing={2}>
        <GenericLabeledDropdown
          label="Student"
          name="studentId"
          dropDownData={studentOptions}
          valueMapping={(s) => s.id}
          keyMapping={(s) => s.id}
          textMapping={(s) => s.label}
          required={true}
        />
        <LabeledRadio
          label="Credit Type"
          name="creditType"
          values={[
            ['American Opportunity (AOTC)', EducationCreditType.AOTC],
            ['Lifetime Learning (LLC)', EducationCreditType.LLC]
          ]}
        />
        <LabeledInput
          label="Institution name"
          name="institution"
          required={true}
        />
        <LabeledInput
          label="Institution EIN"
          name="institutionEin"
          patternConfig={Patterns.ein}
        />
        <LabeledInput
          label="Payments received (Box 1)"
          name="paymentsReceived"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Adjustments to qualified expenses (Box 4)"
          name="adjustmentsToQualifiedExpenses"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Scholarships or grants (Box 5)"
          name="scholarshipsOrGrants"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Adjustments to scholarships (Box 6)"
          name="adjustmentsToScholarships"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Additional qualified expenses (e.g., books)"
          name="additionalQualifiedExpenses"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="Other tax-free assistance"
          name="otherTaxFreeAssistance"
          patternConfig={Patterns.currency}
        />
        <LabeledInput
          label="AOTC claimed in prior years (0-4)"
          name="aotcClaimedYears"
          patternConfig={Patterns.number}
        />
        <LabeledCheckbox
          label="At least half-time student (Box 8)"
          name="atLeastHalfTime"
        />
        <LabeledCheckbox
          label="Graduate student (Box 9)"
          name="graduateStudent"
        />
        <LabeledCheckbox
          label="Felony drug conviction"
          name="felonyDrugConviction"
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
          <title>1098-T Information | Credits | UsTaxes.org</title>
        </Helmet>
        <h2>Education Credits (Form 1098-T)</h2>
        {form}
        {navButtons}
      </form>
    </FormProvider>
  )
}
