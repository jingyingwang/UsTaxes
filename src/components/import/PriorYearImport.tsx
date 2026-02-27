import { ReactElement, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  TextField,
  Typography
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { useSelector } from 'react-redux'
import { useDispatch } from 'ustaxes/redux'
import { setInfo } from 'ustaxes/redux/actions'
import { YearsTaxesState } from 'ustaxes/redux'
import { TaxYear } from 'ustaxes/core/data'
import { LoadRaw } from 'ustaxes/redux/fs/Load'
import {
  ImportCategory,
  PriorYearData,
  ImportSummary,
  importCategoryLabels,
  parsePriorYearFile,
  getImportSummary,
  availableCategories,
  buildImportedInfo
} from 'ustaxes/import/priorYear'

type ImportStep = 'upload' | 'configure' | 'done'

const PriorYearImport = (): ReactElement => {
  const dispatch = useDispatch()
  const activeYear: TaxYear = useSelector(
    (state: YearsTaxesState) => state.activeYear
  )
  const currentInfo = useSelector((state: YearsTaxesState) => state[activeYear])

  const [step, setStep] = useState<ImportStep>('upload')
  const [error, setError] = useState<string | undefined>()
  const [priorData, setPriorData] = useState<PriorYearData | undefined>()
  const [selectedYear, setSelectedYear] = useState<TaxYear | undefined>()
  const [summary, setSummary] = useState<ImportSummary | undefined>()
  const [selected, setSelected] = useState<Set<ImportCategory>>(new Set())

  const handleFileLoad = (rawJson: string) => {
    try {
      const data = parsePriorYearFile(rawJson)
      if (data.availableYears.length === 0) {
        setError(
          'No tax years with taxpayer data found in this file. ' +
            'Make sure this is a USTaxes save file.'
        )
        return
      }

      setPriorData(data)
      const year = data.availableYears[data.availableYears.length - 1]
      setSelectedYear(year)

      const info = data.state[year]
      const importSummary = getImportSummary(info, year)
      setSummary(importSummary)

      const available = availableCategories(importSummary)
      setSelected(new Set(available))
      setError(undefined)
      setStep('configure')
    } catch {
      setError(
        'Failed to parse the file. Make sure it is a valid USTaxes save file (.json).'
      )
    }
  }

  const handleYearChange = (year: TaxYear) => {
    if (priorData === undefined) return
    setSelectedYear(year)
    const info = priorData.state[year]
    const importSummary = getImportSummary(info, year)
    setSummary(importSummary)
    const available = availableCategories(importSummary)
    setSelected(new Set(available))
  }

  const handleToggle = (category: ImportCategory) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleImport = () => {
    if (
      priorData === undefined ||
      selectedYear === undefined ||
      selected.size === 0
    ) {
      return
    }
    const priorInfo = priorData.state[selectedYear]
    const merged = buildImportedInfo(currentInfo, priorInfo, selected)
    dispatch(setInfo(merged))
    setStep('done')
  }

  const handleReset = () => {
    setStep('upload')
    setError(undefined)
    setPriorData(undefined)
    setSelectedYear(undefined)
    setSummary(undefined)
    setSelected(new Set())
  }

  if (step === 'done') {
    return (
      <>
        <h2>Import Prior Year Data</h2>
        <Alert severity="success">
          Prior year data has been imported into your {activeYear} return.
        </Alert>
        <Box mt={2}>
          <Button onClick={handleReset} variant="outlined" color="primary">
            Import another file
          </Button>
        </Box>
      </>
    )
  }

  if (step === 'configure' && priorData && summary && selectedYear) {
    const available = availableCategories(summary)

    return (
      <>
        <h2>Import Prior Year Data</h2>
        <Alert severity="info">
          Found data for <strong>{summary.taxpayerName}</strong> in{' '}
          <strong>{selectedYear}</strong>.
        </Alert>

        {priorData.availableYears.length > 1 && (
          <Box mt={2}>
            <TextField
              select
              label="Import from year"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value as TaxYear)}
              variant="filled"
              fullWidth
            >
              {priorData.availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        <Box mt={2}>
          <Typography variant="subtitle1">
            Select data to import into {activeYear}:
          </Typography>
          <FormGroup>
            {available.map((category) => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={selected.has(category)}
                    onChange={() => handleToggle(category)}
                    color="primary"
                  />
                }
                label={importCategoryLabels[category]}
              />
            ))}
          </FormGroup>
        </Box>

        {currentInfo.taxPayer.primaryPerson?.firstName !== undefined && (
          <Box mt={1}>
            <Alert severity="warning">
              You already have data for {activeYear}. Imported data will
              overwrite the selected categories.
            </Alert>
          </Box>
        )}

        <Box mt={2} display="flex" style={{ gap: 8 }}>
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            disabled={selected.size === 0}
          >
            Import Selected Data
          </Button>
          <Button onClick={handleReset} variant="outlined">
            Cancel
          </Button>
        </Box>
      </>
    )
  }

  // Upload step
  return (
    <>
      <h2>Import Prior Year Data</h2>
      <p>
        Import data from a previous year&apos;s USTaxes save file to pre-fill
        your {activeYear} return. Your taxpayer info, dependents, employer
        details, and basis tracking data can be carried forward.
      </p>
      <p>
        To get a save file from a previous year, go to User Settings and click
        &quot;Save data to file&quot;.
      </p>

      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <LoadRaw
        accept=".json"
        handleData={handleFileLoad}
        variant="contained"
        color="primary"
      >
        Choose prior year file
      </LoadRaw>
    </>
  )
}

export default PriorYearImport
