import { ReactElement } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { usePager } from 'ustaxes/components/pager'
import {
  AmendedReturnData,
  FilingStatus,
  FilingStatusTexts,
  TaxYear
} from 'ustaxes/core/data'
import { YearsTaxesState } from 'ustaxes/redux'
import { LabeledInput } from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { Description } from '@material-ui/icons'
import {
  addAmendedReturn,
  editAmendedReturn,
  removeAmendedReturn
} from 'ustaxes/redux/actions'
import { useDispatch } from 'ustaxes/redux'
import { useSelector } from 'react-redux'
import { useYearSelector } from 'ustaxes/redux/yearDispatch'
import { enumKeys } from 'ustaxes/core/util'
import { GenericLabeledDropdown } from 'ustaxes/components/input'

interface AmendedReturnUserInput {
  taxYearAmended: string
  filingStatus: FilingStatus | ''
  agiOriginal: string
  agiChange: string
  deductionsOriginal: string
  deductionsChange: string
  taxOriginal: string
  taxChange: string
  creditsOriginal: string
  creditsChange: string
  otherTaxesOriginal: string
  otherTaxesChange: string
  paymentsOriginal: string
  paymentsChange: string
  partIIIExplanation: string
}

const blankUserInput: AmendedReturnUserInput = {
  taxYearAmended: '',
  filingStatus: '',
  agiOriginal: '',
  agiChange: '',
  deductionsOriginal: '',
  deductionsChange: '',
  taxOriginal: '',
  taxChange: '',
  creditsOriginal: '',
  creditsChange: '',
  otherTaxesOriginal: '',
  otherTaxesChange: '',
  paymentsOriginal: '',
  paymentsChange: '',
  partIIIExplanation: ''
}

const toAmendedReturnData = (
  formData: AmendedReturnUserInput
): AmendedReturnData => ({
  taxYearAmended: formData.taxYearAmended,
  filingStatus: formData.filingStatus || FilingStatus.S,
  partIIIExplanation: formData.partIIIExplanation,
  lines: [
    {
      lineDescription: '1',
      columnA: parseFloat(formData.agiOriginal) || 0,
      columnB: parseFloat(formData.agiChange) || 0,
      explanation: ''
    },
    {
      lineDescription: '2',
      columnA: parseFloat(formData.deductionsOriginal) || 0,
      columnB: parseFloat(formData.deductionsChange) || 0,
      explanation: ''
    },
    {
      lineDescription: '6',
      columnA: parseFloat(formData.taxOriginal) || 0,
      columnB: parseFloat(formData.taxChange) || 0,
      explanation: ''
    },
    {
      lineDescription: '7',
      columnA: parseFloat(formData.creditsOriginal) || 0,
      columnB: parseFloat(formData.creditsChange) || 0,
      explanation: ''
    },
    {
      lineDescription: '9',
      columnA: parseFloat(formData.otherTaxesOriginal) || 0,
      columnB: parseFloat(formData.otherTaxesChange) || 0,
      explanation: ''
    },
    {
      lineDescription: '11',
      columnA: parseFloat(formData.paymentsOriginal) || 0,
      columnB: parseFloat(formData.paymentsChange) || 0,
      explanation: ''
    }
  ]
})

const findLineAmount = (
  data: AmendedReturnData,
  desc: string,
  col: 'columnA' | 'columnB'
): string => {
  const line = data.lines.find((l) => l.lineDescription === desc)
  return line ? line[col].toString() : ''
}

const toUserInput = (data: AmendedReturnData): AmendedReturnUserInput => ({
  taxYearAmended: data.taxYearAmended,
  filingStatus: data.filingStatus,
  agiOriginal: findLineAmount(data, '1', 'columnA'),
  agiChange: findLineAmount(data, '1', 'columnB'),
  deductionsOriginal: findLineAmount(data, '2', 'columnA'),
  deductionsChange: findLineAmount(data, '2', 'columnB'),
  taxOriginal: findLineAmount(data, '6', 'columnA'),
  taxChange: findLineAmount(data, '6', 'columnB'),
  creditsOriginal: findLineAmount(data, '7', 'columnA'),
  creditsChange: findLineAmount(data, '7', 'columnB'),
  otherTaxesOriginal: findLineAmount(data, '9', 'columnA'),
  otherTaxesChange: findLineAmount(data, '9', 'columnB'),
  paymentsOriginal: findLineAmount(data, '11', 'columnA'),
  paymentsChange: findLineAmount(data, '11', 'columnB'),
  partIIIExplanation: data.partIIIExplanation
})

export default function AmendedReturn(): ReactElement {
  const defaultValues = blankUserInput
  const activeYear: TaxYear = useSelector(
    (state: YearsTaxesState) => state.activeYear
  )

  const amendedReturns = useYearSelector(
    (state) => state.information.amendedReturns
  )

  const dispatch = useDispatch()
  const methods = useForm<AmendedReturnUserInput>({ defaultValues })
  const { navButtons, onAdvance } = usePager()

  const onSubmitAdd = (formData: AmendedReturnUserInput): void => {
    dispatch(addAmendedReturn(toAmendedReturnData(formData)))
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: AmendedReturnUserInput): void => {
      dispatch(
        editAmendedReturn({
          index,
          value: toAmendedReturnData(formData)
        })
      )
    }

  const filingStatusDropdown = (
    <GenericLabeledDropdown<FilingStatus, AmendedReturnUserInput>
      label="Filing status on amended return"
      dropDownData={enumKeys(FilingStatus).map((k) => FilingStatus[k])}
      valueMapping={(fs: FilingStatus) => fs}
      keyMapping={(_, i) => i}
      textMapping={(fs: FilingStatus) => FilingStatusTexts[fs]}
      name="filingStatus"
      sizes={{ xs: 12, lg: 6 }}
    />
  )

  const form = (
    <FormListContainer<AmendedReturnUserInput>
      defaultValues={defaultValues}
      items={amendedReturns.map((a) => toUserInput(a))}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      removeItem={(i) => dispatch(removeAmendedReturn(i))}
      icon={() => <Description />}
      primary={(item: AmendedReturnUserInput) =>
        `Amended Return - Tax Year ${item.taxYearAmended}`
      }
      secondary={(item: AmendedReturnUserInput) => (
        <span>
          Filing Status:{' '}
          {item.filingStatus ? FilingStatusTexts[item.filingStatus] : 'Not set'}
        </span>
      )}
    >
      <Grid container spacing={2}>
        <LabeledInput
          name="taxYearAmended"
          label="Tax year being amended"
          patternConfig={Patterns.year}
          sizes={{ xs: 12, lg: 6 }}
        />
        {filingStatusDropdown}

        <Grid item xs={12}>
          <h4>Line 1: Adjusted Gross Income</h4>
        </Grid>
        <LabeledInput
          name="agiOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="agiChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Line 2: Deductions (Itemized or Standard)</h4>
        </Grid>
        <LabeledInput
          name="deductionsOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="deductionsChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Line 6: Tax</h4>
        </Grid>
        <LabeledInput
          name="taxOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="taxChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Line 7: Nonrefundable Credits</h4>
        </Grid>
        <LabeledInput
          name="creditsOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="creditsChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Line 9: Other Taxes</h4>
        </Grid>
        <LabeledInput
          name="otherTaxesOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="otherTaxesChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Line 11: Total Payments</h4>
        </Grid>
        <LabeledInput
          name="paymentsOriginal"
          label="Column A: Original amount"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="paymentsChange"
          label="Column B: Net change"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />

        <Grid item xs={12}>
          <h4>Part III: Explanation of Changes</h4>
        </Grid>
        <LabeledInput
          name="partIIIExplanation"
          label="Explain each change (required)"
          patternConfig={Patterns.plain}
          sizes={{ xs: 12 }}
        />
      </Grid>
    </FormListContainer>
  )

  return (
    <form tabIndex={-1} onSubmit={onAdvance}>
      <h2>Amended Return (Form 1040-X)</h2>
      <p>
        Use this form to correct your {activeYear} tax return. Enter the
        original amounts from your filed return (Column A) and the net change
        for each line (Column B). The corrected amounts (Column C) will be
        calculated automatically.
      </p>
      <FormProvider {...methods}>{form}</FormProvider>
      {navButtons}
    </form>
  )
}
