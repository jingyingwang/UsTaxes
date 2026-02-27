import { ChangeEvent, ReactElement, useState } from 'react'
import {
  Button,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { useDispatch } from 'ustaxes/redux'
import * as actions from 'ustaxes/redux/actions'
import {
  extractFromPdf,
  ExtractionResult,
  PdfFieldInfo
} from 'ustaxes/import/pdfExtract'
import { intentionallyFloat } from 'ustaxes/core/util'
import { IncomeW2, Supported1099 } from 'ustaxes/core/data'

type ImportStatus =
  | { state: 'idle' }
  | { state: 'preview'; result: ExtractionResult }
  | { state: 'imported'; summary: string }
  | { state: 'error'; message: string }

const formatCurrency = (v: number): string =>
  v === 0 ? '$0' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const W2Preview = ({ data }: { data: IncomeW2 }): ReactElement => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Field</TableCell>
          <TableCell align="right">Value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Employer</TableCell>
          <TableCell align="right">
            {data.employer?.employerName ?? '(not found)'}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Wages, tips, compensation (Box 1)</TableCell>
          <TableCell align="right">{formatCurrency(data.income)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Federal income tax withheld (Box 2)</TableCell>
          <TableCell align="right">
            {formatCurrency(data.fedWithholding)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Social security wages (Box 3)</TableCell>
          <TableCell align="right">{formatCurrency(data.ssWages)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Social security tax withheld (Box 4)</TableCell>
          <TableCell align="right">
            {formatCurrency(data.ssWithholding)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Medicare wages (Box 5)</TableCell>
          <TableCell align="right">
            {formatCurrency(data.medicareIncome)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Medicare tax withheld (Box 6)</TableCell>
          <TableCell align="right">
            {formatCurrency(data.medicareWithholding)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
)

const Form1099Preview = ({ data }: { data: Supported1099 }): ReactElement => {
  const entries: Array<[string, string]> = [['Payer', data.payer]]

  switch (data.type) {
    case 'INT':
      entries.push(
        ['Interest income (Box 1)', formatCurrency(data.form.income)],
        [
          'Early withdrawal penalty (Box 2)',
          formatCurrency(data.form.earlyWithdrawalPenalty ?? 0)
        ],
        [
          'Tax-exempt interest (Box 8)',
          formatCurrency(data.form.taxExemptInterest ?? 0)
        ]
      )
      break
    case 'DIV':
      entries.push(
        [
          'Total ordinary dividends (Box 1a)',
          formatCurrency(data.form.dividends)
        ],
        [
          'Qualified dividends (Box 1b)',
          formatCurrency(data.form.qualifiedDividends)
        ],
        [
          'Capital gain distributions (Box 2a)',
          formatCurrency(data.form.totalCapitalGainsDistributions)
        ],
        [
          'Foreign tax paid (Box 7)',
          formatCurrency(data.form.foreignTaxPaid ?? 0)
        ]
      )
      break
    case 'R':
      entries.push(
        [
          'Gross distribution (Box 1)',
          formatCurrency(data.form.grossDistribution)
        ],
        ['Taxable amount (Box 2a)', formatCurrency(data.form.taxableAmount)],
        [
          'Federal tax withheld (Box 4)',
          formatCurrency(data.form.federalIncomeTaxWithheld)
        ],
        ['Plan type', data.form.planType]
      )
      break
    case 'SSA':
      entries.push(
        ['Net benefits (Box 5)', formatCurrency(data.form.netBenefits)],
        [
          'Federal tax withheld (Box 6)',
          formatCurrency(data.form.federalIncomeTaxWithheld)
        ]
      )
      break
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Field</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(([label, value]) => (
            <TableRow key={label}>
              <TableCell>{label}</TableCell>
              <TableCell align="right">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const K1Preview = ({
  data,
  formType
}: {
  data: Record<string, unknown>
  formType: string
}): ReactElement => {
  const entries = Object.entries(data)
    .filter(([, v]) => v !== false && v !== 0 && v !== '')
    .map(([k, v]) => [
      k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      typeof v === 'number' ? formatCurrency(v) : String(v)
    ])

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{formType} Field</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(([label, value]) => (
            <TableRow key={label}>
              <TableCell>{label}</TableCell>
              <TableCell align="right">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const UnknownFieldsPreview = ({
  fields
}: {
  fields: PdfFieldInfo[]
}): ReactElement => {
  const nonEmpty = fields.filter((f) => f.value || f.checked)
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Field Name</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nonEmpty.slice(0, 50).map((f) => (
            <TableRow key={f.name}>
              <TableCell>{f.name}</TableCell>
              <TableCell align="right">
                {f.checked ? 'checked' : f.value}
              </TableCell>
            </TableRow>
          ))}
          {nonEmpty.length > 50 && (
            <TableRow>
              <TableCell colSpan={2}>
                ...and {nonEmpty.length - 50} more fields
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const resultLabel = (result: ExtractionResult): string => {
  switch (result.type) {
    case 'W-2':
      return 'W-2'
    case '1099':
      return `1099-${result.data.type}`
    case 'K-1 (1065)':
      return 'Schedule K-1 (Form 1065)'
    case 'K-1 (1120-S)':
      return 'Schedule K-1 (Form 1120-S)'
    default:
      return 'Unknown Form'
  }
}

const PDFUpload = (): ReactElement => {
  const dispatch = useDispatch()
  const [status, setStatus] = useState<ImportStatus>({ state: 'idle' })

  const handleFile = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    e.preventDefault()
    const files = e.target.files
    if (!files || files.length < 1) return

    const file = files[0]
    try {
      const buffer = await file.arrayBuffer()
      const result = await extractFromPdf(buffer)
      setStatus({ state: 'preview', result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read PDF'
      setStatus({ state: 'error', message })
    }
  }

  const handleImport = (): void => {
    if (status.state !== 'preview') return
    const { result } = status

    switch (result.type) {
      case 'W-2':
        dispatch(actions.addW2(result.data))
        setStatus({
          state: 'imported',
          summary: `W-2 imported: ${
            result.data.employer?.employerName ?? 'Unknown employer'
          }`
        })
        break
      case '1099':
        dispatch(actions.add1099(result.data))
        setStatus({
          state: 'imported',
          summary: `1099-${result.data.type} imported: ${result.data.payer}`
        })
        break
      case 'K-1 (1065)':
        dispatch(actions.addScheduleK1Form1065(result.data))
        setStatus({
          state: 'imported',
          summary: `K-1 (1065) imported: ${result.data.partnershipName}`
        })
        break
      case 'K-1 (1120-S)':
        dispatch(actions.addScheduleK1Form1120S(result.data))
        setStatus({
          state: 'imported',
          summary: `K-1 (1120-S) imported: ${result.data.corporationName}`
        })
        break
      default:
        setStatus({
          state: 'error',
          message:
            'Could not identify the form type. Please enter data manually.'
        })
    }
  }

  const reset = (): void => setStatus({ state: 'idle' })

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">Import from PDF</Typography>
        <Typography variant="body2" color="textSecondary">
          Upload a fillable IRS PDF form (W-2, 1099-INT, 1099-DIV, 1099-R,
          SSA-1099, Schedule K-1) to extract data automatically.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Button variant="contained" color="primary" component="label">
          Upload PDF
          <input
            type="file"
            hidden
            accept=".pdf,application/pdf"
            onChange={intentionallyFloat(handleFile)}
          />
        </Button>
      </Grid>

      {status.state === 'error' && (
        <Grid item xs={12}>
          <Alert severity="error" onClose={reset}>
            {status.message}
          </Alert>
        </Grid>
      )}

      {status.state === 'imported' && (
        <Grid item xs={12}>
          <Alert severity="success" onClose={reset}>
            {status.summary}
          </Alert>
          <Button variant="outlined" onClick={reset} style={{ marginTop: 8 }}>
            Import Another
          </Button>
        </Grid>
      )}

      {status.state === 'preview' && (
        <>
          <Grid item xs={12}>
            <Alert severity="info">
              Detected: <strong>{resultLabel(status.result)}</strong> — Review
              the extracted data below before importing.
            </Alert>
          </Grid>

          <Grid item xs={12}>
            {status.result.type === 'W-2' && (
              <W2Preview data={status.result.data} />
            )}
            {status.result.type === '1099' && (
              <Form1099Preview data={status.result.data} />
            )}
            {(status.result.type === 'K-1 (1065)' ||
              status.result.type === 'K-1 (1120-S)') && (
              <K1Preview
                data={status.result.data as unknown as Record<string, unknown>}
                formType={status.result.type}
              />
            )}
            {status.result.type === 'unknown' && (
              <>
                <Alert severity="warning" style={{ marginBottom: 8 }}>
                  Could not automatically identify this form. Fields found in
                  the PDF are shown below.
                </Alert>
                <UnknownFieldsPreview fields={status.result.fields} />
              </>
            )}
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={status.result.type === 'unknown'}
              style={{ marginRight: 8 }}
            >
              Import Data
            </Button>
            <Button variant="outlined" onClick={reset}>
              Cancel
            </Button>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default PDFUpload
