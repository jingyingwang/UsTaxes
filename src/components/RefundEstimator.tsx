import { ReactElement, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Information, Asset, TaxYear } from 'ustaxes/core/data'
import { YearsTaxesState } from 'ustaxes/redux'
import { isRight } from 'ustaxes/core/util'
import yearFormBuilder from 'ustaxes/forms/YearForms'
import { Currency } from './input'
import {
  createStyles,
  makeStyles,
  Box,
  Typography,
  Divider
} from '@material-ui/core'

interface F1040Lines {
  l24(): number
  l21(): number
  l25d(): number
  l33(): number
  l34(): number
  l37(): number
}

interface EstimatorData {
  totalTax: number
  totalCredits: number
  totalWithholding: number
  refund: number
  amountOwed: number
}

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      padding: theme.spacing(1.5, 2),
      borderRadius: 4,
      backgroundColor:
        theme.palette.type === 'dark'
          ? theme.palette.grey[800]
          : theme.palette.grey[100]
    },
    title: {
      fontWeight: 600,
      marginBottom: theme.spacing(0.5)
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing(0.25, 0)
    },
    resultRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing(0.5, 0)
    },
    divider: {
      margin: theme.spacing(0.5, 0)
    }
  })
)

const RefundEstimator = (): ReactElement | null => {
  const classes = useStyles()

  const year: TaxYear = useSelector(
    (state: YearsTaxesState) => state.activeYear
  )
  const info: Information = useSelector(
    (state: YearsTaxesState) => state[state.activeYear]
  )
  const assets: Asset<Date>[] = useSelector(
    (state: YearsTaxesState) => state.assets
  )

  const estimatorData = useMemo((): EstimatorData | undefined => {
    const builder = yearFormBuilder(year, info, assets)
    if (builder.errors().length > 0) return undefined

    const result = builder.f1040()
    if (!isRight(result)) return undefined

    const forms = result.right
    const f1040 = forms.find((f) => f.tag === 'f1040') as
      | (F1040Lines & { tag: string })
      | undefined
    if (f1040 === undefined) return undefined

    return {
      totalTax: f1040.l24(),
      totalCredits: f1040.l21(),
      totalWithholding: f1040.l25d(),
      refund: f1040.l34(),
      amountOwed: f1040.l37()
    }
  }, [year, info, assets])

  if (estimatorData === undefined) return null

  const { totalTax, totalCredits, totalWithholding, refund, amountOwed } =
    estimatorData
  const isRefund = refund > 0

  return (
    <Box className={classes.root} data-testid="refund-estimator">
      <Typography variant="subtitle2" className={classes.title}>
        Refund Estimator
      </Typography>
      <div className={classes.row}>
        <Typography variant="body2" color="textSecondary">
          Federal Tax
        </Typography>
        <Typography variant="body2">
          <Currency value={-totalTax} />
        </Typography>
      </div>
      <div className={classes.row}>
        <Typography variant="body2" color="textSecondary">
          Credits
        </Typography>
        <Typography variant="body2">
          <Currency value={totalCredits} />
        </Typography>
      </div>
      <div className={classes.row}>
        <Typography variant="body2" color="textSecondary">
          Withholding
        </Typography>
        <Typography variant="body2">
          <Currency value={totalWithholding} />
        </Typography>
      </div>
      <Divider className={classes.divider} />
      <div className={classes.resultRow}>
        <Typography variant="body2" style={{ fontWeight: 600 }}>
          {isRefund ? 'Refund' : 'Amount Owed'}
        </Typography>
        <Typography variant="body2" style={{ fontWeight: 600 }}>
          <Currency value={isRefund ? refund : -amountOwed} />
        </Typography>
      </div>
    </Box>
  )
}

export default RefundEstimator
