import {
  ChangeEvent,
  ReactElement,
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  Button,
  createStyles,
  FormControl,
  Grid,
  InputLabel,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Theme,
  Typography
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { addAssets, add1099 } from 'ustaxes/redux/actions'
import { useYearDispatch } from 'ustaxes/redux/yearDispatch'
import { loadFile } from 'ustaxes/redux/fs/Load'
import { csvParsers, detectParsers, getParserById } from 'ustaxes/import'
import { getHeaderAndRows, parseCsvRows } from 'ustaxes/import/utils'
import { isRight } from 'ustaxes/core/util'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dropZone: {
      border: `2px dashed ${theme.palette.primary.main}`,
      borderRadius: theme.spacing(1),
      padding: theme.spacing(3),
      textAlign: 'center',
      color: theme.palette.text.secondary,
      backgroundColor: theme.palette.background.paper,
      transition: 'background-color 0.2s ease'
    },
    dropZoneActive: {
      backgroundColor: theme.palette.action.hover
    },
    previewTable: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    previewCell: {
      borderBottom: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(0.5)
    },
    fileInput: {
      display: 'none'
    }
  })
)

export default function CSVImport(): ReactElement {
  const classes = useStyles()
  const dispatch = useYearDispatch()

  const [fileName, setFileName] = useState<string | null>(null)
  const [contents, setContents] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parserId, setParserId] = useState<string>('')
  const [detectedParserIds, setDetectedParserIds] = useState<Set<string>>(
    new Set()
  )
  const [parserResult, setParserResult] =
    useState<ReturnType<(typeof csvParsers)[number]['parse']> | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const parserOptions = useMemo(() => csvParsers, [])

  const handleContents = (csvContents: string, name: string): void => {
    setContents(csvContents)
    setFileName(name)

    const parsed = parseCsvRows(csvContents)
    if (parsed._tag === 'left') {
      setParseErrors(parsed.left)
      setHeaders([])
      setPreviewRows([])
      setDetectedParserIds(new Set())
      setParserId('')
      return
    }

    const headerAndRows = getHeaderAndRows(parsed.right)
    if (headerAndRows === undefined) {
      setParseErrors(['CSV file contained no usable rows'])
      setHeaders([])
      setPreviewRows([])
      setDetectedParserIds(new Set())
      setParserId('')
      return
    }

    setParseErrors([])
    setHeaders(headerAndRows.headers)
    setPreviewRows(headerAndRows.dataRows.slice(0, 5))

    const detected = detectParsers(headerAndRows.headers)
    const detectedIds = new Set(detected.map((p) => p.id))
    setDetectedParserIds(detectedIds)
    const fallbackParser = getParserById('generic-columns') ?? parserOptions[0]
    setParserId(detected[0]?.id ?? fallbackParser?.id ?? '')
  }

  const onDrop = async (
    event: React.DragEvent<HTMLDivElement>
  ): Promise<void> => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }
    handleContents(await loadFile(file), file.name)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (): void => {
    setIsDragging(false)
  }

  const onFileSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    handleContents(await loadFile(file), file.name)
  }

  useEffect(() => {
    if (!contents || parserId.length === 0) {
      setParserResult(null)
      return
    }
    const parser = getParserById(parserId)
    if (!parser) {
      setParserResult(null)
      return
    }
    setParserResult(parser.parse(contents))
  }, [contents, parserId])

  const importData = (): void => {
    if (!parserResult || !isRight(parserResult)) {
      return
    }
    const { f1099s, assets } = parserResult.right
    f1099s.forEach((form) => dispatch(add1099(form)))
    if (assets.length > 0) {
      dispatch(addAssets(assets))
    }
  }

  const parserSummary = (() => {
    if (!parserResult || !isRight(parserResult)) {
      return undefined
    }
    const { f1099s, assets, warnings } = parserResult.right
    return {
      f1099s,
      assets,
      warnings
    }
  })()

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h4">CSV Import</Typography>
        <Typography variant="body1">
          Drag and drop a CSV export from your broker or exchange to import
          1099s and crypto transactions.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Paper
          className={`${classes.dropZone} ${
            isDragging ? classes.dropZoneActive : ''
          }`}
          onDrop={(e) => void onDrop(e)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <Typography variant="h6">Drop CSV file here</Typography>
          <Typography variant="body2">
            {fileName ? `Loaded: ${fileName}` : 'No file loaded'}
          </Typography>
          <input
            accept=".csv,text/csv"
            className={classes.fileInput}
            id="csv-import-file"
            type="file"
            onChange={(e) => void onFileSelected(e)}
          />
          <label htmlFor="csv-import-file">
            <Button variant="contained" color="primary" component="span">
              Select File
            </Button>
          </label>
        </Paper>
      </Grid>

      {parseErrors.length > 0 && (
        <Grid item xs={12}>
          <Alert severity="error">
            {parseErrors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </Alert>
        </Grid>
      )}

      {headers.length > 0 && (
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="csv-parser-select-label">Parser</InputLabel>
            <Select
              labelId="csv-parser-select-label"
              value={parserId}
              onChange={(event) => setParserId(event.target.value as string)}
            >
              {parserOptions.map((parser) => (
                <MenuItem key={parser.id} value={parser.id}>
                  {parser.name}
                  {detectedParserIds.has(parser.id) ? ' (detected)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}

      {parserResult && parserResult._tag === 'left' && (
        <Grid item xs={12}>
          <Alert severity="error">
            {parserResult.left.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </Alert>
        </Grid>
      )}

      {parserSummary && (
        <>
          <Grid item xs={12}>
            <Alert severity="info">
              Parsed {parserSummary.f1099s.length} 1099 forms and{' '}
              {parserSummary.assets.length} assets.
            </Alert>
          </Grid>
          {parserSummary.warnings.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                {parserSummary.warnings.map((warning, idx) => (
                  <div key={idx}>
                    {warning.row ? `Row ${warning.row}: ` : ''}
                    {warning.message}
                  </div>
                ))}
              </Alert>
            </Grid>
          )}
        </>
      )}

      {previewRows.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="h6">Preview</Typography>
          <table className={classes.previewTable}>
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className={classes.previewCell}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {headers.map((_, colIdx) => (
                    <td key={colIdx} className={classes.previewCell}>
                      {row[colIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Grid>
      )}

      <Grid item xs={12}>
        <Button
          variant="contained"
          color="primary"
          disabled={!parserSummary}
          onClick={importData}
        >
          Import Into Return
        </Button>
      </Grid>
    </Grid>
  )
}
