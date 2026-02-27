import { ReactElement, useState, useCallback, DragEvent } from 'react'
import {
  Button,
  Grid,
  Typography,
  Paper,
  Box,
  useMediaQuery
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles'
import DataTable, { TableColumn } from 'react-data-table-component'
import { useDispatch } from 'ustaxes/redux'
import * as actions from 'ustaxes/redux/actions'
import { LoadRaw } from 'ustaxes/redux/fs/Load'
import { preflightCsvAll, preflightCsv } from 'ustaxes/data/csvImport'
import { run, isLeft } from 'ustaxes/core/util'
import {
  Income1099Type,
  PersonRole,
  Income1099B,
  F1099BData
} from 'ustaxes/core/data'
import {
  CSVParser,
  ParsedTransaction,
  detectParser,
  aggregateTransactions,
  ParseError
} from 'ustaxes/import'
import ConfigurableDataTable, {
  ColumnDef
} from 'ustaxes/components/income/assets/ConfigurableDataTable'
import {
  genericFields,
  buildMappingFromAssignments,
  parseWithMapping
} from 'ustaxes/import/parsers/generic'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dropZone: {
      border: `2px dashed ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(4),
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'border-color 0.2s, background-color 0.2s',
      '&:hover': {
        borderColor: theme.palette.primary.main
      }
    },
    dropZoneActive: {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover
    },
    summaryCard: {
      padding: theme.spacing(2),
      marginBottom: theme.spacing(1)
    },
    summaryValue: {
      fontWeight: 'bold'
    }
  })
)

interface TransactionTableProps {
  transactions: ParsedTransaction[]
}

const TransactionPreview = ({
  transactions
}: TransactionTableProps): ReactElement => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  const columns: TableColumn<ParsedTransaction>[] = [
    { name: 'Description', selector: (r) => r.description, sortable: true },
    { name: 'Date Sold', selector: (r) => r.dateSold, sortable: true },
    {
      name: 'Proceeds',
      selector: (r) => `$${r.proceeds.toFixed(2)}`,
      sortable: true,
      right: true
    },
    {
      name: 'Cost Basis',
      selector: (r) => `$${r.costBasis.toFixed(2)}`,
      sortable: true,
      right: true
    },
    {
      name: 'Gain/Loss',
      selector: (r) =>
        `$${(r.proceeds - r.costBasis + r.washSaleLossDisallowed).toFixed(2)}`,
      sortable: true,
      right: true
    },
    { name: 'Term', selector: (r) => r.termType, sortable: true },
    {
      name: 'Basis Reported',
      selector: (r) => (r.basisReportedToIRS ? 'Yes' : 'No'),
      sortable: true
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={transactions}
      pagination
      paginationPerPage={10}
      theme={prefersDarkMode ? 'dark' : 'normal'}
      dense
    />
  )
}

interface F1099BSummaryProps {
  data: F1099BData
}

const F1099BSummary = ({ data }: F1099BSummaryProps): ReactElement => {
  const classes = useStyles()
  const fmt = (n: number) => `$${n.toFixed(2)}`

  const sections = [
    {
      label: 'Short-Term, Basis Reported',
      proceeds: data.shortTermBasisReportedProceeds,
      cost: data.shortTermBasisReportedCostBasis,
      wash: data.shortTermBasisReportedWashSale
    },
    {
      label: 'Short-Term, Basis NOT Reported',
      proceeds: data.shortTermBasisNotReportedProceeds,
      cost: data.shortTermBasisNotReportedCostBasis,
      wash: data.shortTermBasisNotReportedWashSale
    },
    {
      label: 'Long-Term, Basis Reported',
      proceeds: data.longTermBasisReportedProceeds,
      cost: data.longTermBasisReportedCostBasis,
      wash: data.longTermBasisReportedWashSale
    },
    {
      label: 'Long-Term, Basis NOT Reported',
      proceeds: data.longTermBasisNotReportedProceeds,
      cost: data.longTermBasisNotReportedCostBasis,
      wash: data.longTermBasisNotReportedWashSale
    }
  ]

  // Only show sections that have data
  const activeSections = sections.filter(
    (s) => s.proceeds !== 0 || s.cost !== 0
  )

  return (
    <Grid container spacing={2}>
      {activeSections.map((s) => (
        <Grid item xs={12} sm={6} key={s.label}>
          <Paper className={classes.summaryCard} variant="outlined">
            <Typography variant="subtitle2" gutterBottom>
              {s.label}
            </Typography>
            <Typography variant="body2">
              Proceeds:{' '}
              <span className={classes.summaryValue}>{fmt(s.proceeds)}</span>
            </Typography>
            <Typography variant="body2">
              Cost Basis:{' '}
              <span className={classes.summaryValue}>{fmt(s.cost)}</span>
            </Typography>
            <Typography variant="body2">
              Gain/Loss:{' '}
              <span className={classes.summaryValue}>
                {fmt(s.proceeds - s.cost + s.wash)}
              </span>
            </Typography>
            {s.wash > 0 && (
              <Typography variant="body2">
                Wash Sale Adj:{' '}
                <span className={classes.summaryValue}>{fmt(s.wash)}</span>
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

export const CSVImport = (): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()

  const [isDragActive, setIsDragActive] = useState(false)
  const [rawContents, setRawContents] = useState<string>('')
  const [detectedParser, setDetectedParser] = useState<CSVParser | null>(null)
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [aggregated, setAggregated] = useState<F1099BData | null>(null)
  const [parseErrors, setParseErrors] = useState<ParseError[]>([])
  const [payer, setPayer] = useState<string>('')

  // For generic parser manual column mapping
  const [preflightRows, setPreflightRows] = useState<string[][]>([])
  const [fieldAssignments, setFieldAssignments] = useState<
    (string | undefined)[]
  >([])
  const [dropFirstNRows, setDropFirstNRows] = useState<number>(0)
  const [needsManualMapping, setNeedsManualMapping] = useState(false)

  const resetState = useCallback(() => {
    setRawContents('')
    setDetectedParser(null)
    setTransactions([])
    setAggregated(null)
    setParseErrors([])
    setPayer('')
    setPreflightRows([])
    setFieldAssignments([])
    setDropFirstNRows(0)
    setNeedsManualMapping(false)
  }, [])

  const processCSV = useCallback((contents: string) => {
    setRawContents(contents)
    setParseErrors([])

    const parsed = run(preflightCsvAll(contents))
    parsed.fold(
      (errors) => {
        setParseErrors(
          errors.map((e) => ({ row: e.row ?? 0, messages: [e.message] }))
        )
      },
      (allRows) => {
        if (allRows.length === 0) {
          setParseErrors([{ row: 0, messages: ['CSV file is empty'] }])
          return
        }

        const headers = allRows[0]
        const dataRows = allRows.slice(1)
        const parser = detectParser(headers)
        setDetectedParser(parser)

        if (parser.name.includes('Generic')) {
          // Show manual mapping UI
          setNeedsManualMapping(true)
          run(preflightCsv(contents)).fold(
            (e) =>
              setParseErrors(
                e.map((err) => ({ row: err.row ?? 0, messages: [err.message] }))
              ),
            setPreflightRows
          )
          return
        }

        // Auto-detected broker parser
        setPayer(parser.name)
        const result = parser.parse(headers, dataRows)
        if (isLeft(result)) {
          setParseErrors(result.left)
        } else {
          setTransactions(result.right)
          setAggregated(aggregateTransactions(result.right))
        }
      }
    )
  }, [])

  const handleManualParse = useCallback(() => {
    const mapping = buildMappingFromAssignments(fieldAssignments)
    if (!mapping) {
      setParseErrors([
        {
          row: 0,
          messages: ['Please assign at least Proceeds and Cost Basis columns']
        }
      ])
      return
    }

    const parsed = run(preflightCsvAll(rawContents))
    parsed.fold(
      (e) =>
        setParseErrors(
          e.map((err) => ({ row: err.row ?? 0, messages: [err.message] }))
        ),
      (allRows) => {
        const dataRows = allRows.slice(1 + dropFirstNRows)
        const result = parseWithMapping(dataRows, mapping)
        if (isLeft(result)) {
          setParseErrors(result.left)
        } else {
          setTransactions(result.right)
          setAggregated(aggregateTransactions(result.right))
          setNeedsManualMapping(false)
        }
      }
    )
  }, [rawContents, fieldAssignments, dropFirstNRows])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragActive(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const contents = event.target?.result as string
          if (contents) {
            processCSV(contents)
          }
        }
        reader.readAsText(files[0])
      }
    },
    [processCSV]
  )

  const handleImport = useCallback(() => {
    if (!aggregated) return

    const f1099b: Income1099B = {
      payer: payer || detectedParser?.name || 'CSV Import',
      type: Income1099Type.B,
      form: aggregated,
      personRole: PersonRole.PRIMARY
    }

    dispatch(actions.add1099(f1099b))
    resetState()
  }, [aggregated, payer, detectedParser, dispatch, resetState])

  const assignField = (colIndex: number, field: string | undefined) => {
    const newAssignments = [...fieldAssignments]
    while (newAssignments.length <= colIndex) {
      newAssignments.push(undefined)
    }
    newAssignments[colIndex] = field
    setFieldAssignments(newAssignments)
  }

  const fields: ColumnDef[] = genericFields.map((f) => ({
    name: f.name,
    required: f.required
  }))

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6">Import 1099-B from CSV</Typography>
        <Typography variant="body2" color="textSecondary">
          Upload a CSV file from your broker (Fidelity, Charles Schwab,
          Vanguard) or any other 1099-B format. The format will be auto-detected
          when possible.
        </Typography>
      </Grid>

      {transactions.length === 0 && !needsManualMapping && (
        <Grid item xs={12}>
          <div
            className={`${classes.dropZone} ${
              isDragActive ? classes.dropZoneActive : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Typography variant="body1" gutterBottom>
              Drag and drop a CSV file here
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              or
            </Typography>
            <LoadRaw
              variant="contained"
              color="primary"
              accept=".csv,text/csv"
              handleData={processCSV}
            >
              Browse Files
            </LoadRaw>
          </div>
        </Grid>
      )}

      {parseErrors.length > 0 && (
        <Grid item xs={12}>
          <Alert severity="error">
            <Typography variant="subtitle2">Import Errors</Typography>
            {parseErrors.map((err, i) => (
              <div key={i}>
                {err.row > 0 && <strong>Row {err.row}: </strong>}
                {err.messages.join('; ')}
              </div>
            ))}
          </Alert>
        </Grid>
      )}

      {needsManualMapping && preflightRows.length > 0 && (
        <>
          <Grid item xs={12}>
            <Alert severity="info">
              Could not auto-detect broker format. Please map the columns below.
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <ConfigurableDataTable
              fieldAssignments={fieldAssignments}
              assignField={assignField}
              fields={fields}
              rows={preflightRows}
              updateDropFirstNRows={setDropFirstNRows}
              dropFirstNRows={dropFirstNRows}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={handleManualParse}
            >
              Parse CSV
            </Button>
          </Grid>
        </>
      )}

      {detectedParser && transactions.length > 0 && (
        <Grid item xs={12}>
          <Alert severity="success">
            Detected format: <strong>{detectedParser.name}</strong> —{' '}
            {transactions.length} transactions parsed
          </Alert>
        </Grid>
      )}

      {transactions.length > 0 && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1">Transaction Preview</Typography>
            <TransactionPreview transactions={transactions} />
          </Grid>

          {aggregated && (
            <Grid item xs={12}>
              <Typography variant="subtitle1">
                1099-B Summary (will be imported)
              </Typography>
              <F1099BSummary data={aggregated} />
            </Grid>
          )}

          <Grid item xs={12}>
            <Box display="flex" style={{ gap: 8 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleImport}
              >
                Import as 1099-B
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={resetState}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default CSVImport
