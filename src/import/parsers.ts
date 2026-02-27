import {
  Asset,
  Income1099Type,
  PersonRole,
  Supported1099
} from 'ustaxes/core/data'
import { left, right } from 'ustaxes/core/util'
import { CSVParser, ImportParseResult, ImportResult } from './types'
import {
  findHeaderIndex,
  normalizeHeader,
  parseCsvOrError,
  parseDate,
  parseNumber
} from './utils'

interface SummaryAliases {
  payer: string[]
  interest: string[]
  dividends: string[]
  qualifiedDividends: string[]
  capitalGainDistributions: string[]
  term: string[]
  proceeds: string[]
  costBasis: string[]
  shortTermProceeds: string[]
  shortTermCostBasis: string[]
  longTermProceeds: string[]
  longTermCostBasis: string[]
}

interface CryptoAliases {
  asset: string[]
  quantity: string[]
  acquired: string[]
  sold: string[]
  proceeds: string[]
  costBasis: string[]
}

const genericSummaryAliases: SummaryAliases = {
  payer: ['payer', 'payer name', 'broker', 'broker name', 'institution'],
  interest: ['interest income', 'interest', '1099-int', 'int income'],
  dividends: [
    'ordinary dividends',
    'total ordinary dividends',
    'dividends',
    'total dividends'
  ],
  qualifiedDividends: ['qualified dividends', 'qualified'],
  capitalGainDistributions: [
    'capital gain distributions',
    'capital gains distributions',
    'total capital gain distributions',
    'capital gain dist'
  ],
  term: ['term', 'holding period', 'term (short/long)', 'short/long'],
  proceeds: ['proceeds', 'gross proceeds', 'sales proceeds', 'sale proceeds'],
  costBasis: ['cost basis', 'basis', 'cost or other basis'],
  shortTermProceeds: [
    'short term proceeds',
    'short-term proceeds',
    'short-term gross proceeds'
  ],
  shortTermCostBasis: [
    'short term cost basis',
    'short-term cost basis',
    'short-term basis'
  ],
  longTermProceeds: [
    'long term proceeds',
    'long-term proceeds',
    'long-term gross proceeds'
  ],
  longTermCostBasis: [
    'long term cost basis',
    'long-term cost basis',
    'long-term basis'
  ]
}

const genericCryptoAliases: CryptoAliases = {
  asset: ['asset', 'digital asset', 'currency', 'symbol', 'coin'],
  quantity: ['quantity', 'units', 'amount', 'quantity (units)'],
  acquired: ['date acquired', 'acquired date', 'date of acquisition'],
  sold: ['date sold', 'date disposed', 'date of sale', 'date sold/disposed'],
  proceeds: ['proceeds', 'gross proceeds', 'sales proceeds'],
  costBasis: ['cost basis', 'basis', 'cost or other basis']
}

const withProviderAliases = (
  provider: string,
  base: SummaryAliases
): SummaryAliases => ({
  ...base,
  interest: [...base.interest, `${provider} Interest Income`],
  dividends: [...base.dividends, `${provider} Ordinary Dividends`],
  qualifiedDividends: [...base.qualifiedDividends, `${provider} Qualified Dividends`],
  capitalGainDistributions: [
    ...base.capitalGainDistributions,
    `${provider} Capital Gain Distributions`
  ],
  shortTermProceeds: [
    ...base.shortTermProceeds,
    `${provider} Short Term Proceeds`
  ],
  shortTermCostBasis: [
    ...base.shortTermCostBasis,
    `${provider} Short Term Cost Basis`
  ],
  longTermProceeds: [
    ...base.longTermProceeds,
    `${provider} Long Term Proceeds`
  ],
  longTermCostBasis: [
    ...base.longTermCostBasis,
    `${provider} Long Term Cost Basis`
  ]
})

const withProviderCryptoAliases = (
  provider: string,
  base: CryptoAliases
): CryptoAliases => ({
  ...base,
  asset: [...base.asset, `${provider} Asset`]
})

const headerIncludes = (headers: string[], term: string): boolean => {
  const needle = normalizeHeader(term)
  return headers.some((h) => normalizeHeader(h).includes(needle))
}

const hasAnyHeader = (headers: string[], candidates: string[]): boolean =>
  findHeaderIndex(headers, candidates) !== undefined

const hasSummaryColumns = (headers: string[], aliases: SummaryAliases): boolean => {
  const hasInterest = hasAnyHeader(headers, aliases.interest)
  const hasDividends =
    hasAnyHeader(headers, aliases.dividends) ||
    hasAnyHeader(headers, aliases.qualifiedDividends) ||
    hasAnyHeader(headers, aliases.capitalGainDistributions)
  const hasSplit1099B =
    hasAnyHeader(headers, aliases.shortTermProceeds) &&
    hasAnyHeader(headers, aliases.shortTermCostBasis) &&
    hasAnyHeader(headers, aliases.longTermProceeds) &&
    hasAnyHeader(headers, aliases.longTermCostBasis)
  const hasTerm1099B =
    hasAnyHeader(headers, aliases.term) &&
    hasAnyHeader(headers, aliases.proceeds) &&
    hasAnyHeader(headers, aliases.costBasis)
  return hasInterest || hasDividends || hasSplit1099B || hasTerm1099B
}

const hasCryptoColumns = (headers: string[], aliases: CryptoAliases): boolean =>
  hasAnyHeader(headers, aliases.sold) &&
  hasAnyHeader(headers, aliases.proceeds) &&
  hasAnyHeader(headers, aliases.costBasis)

const parse1099Summary = (
  headers: string[],
  dataRows: string[][],
  aliases: SummaryAliases,
  defaultPayer: string
): { f1099s: Supported1099[]; warnings: { message: string; row?: number }[] } => {
  const warnings: { message: string; row?: number }[] = []
  const payerIdx = findHeaderIndex(headers, aliases.payer)
  const interestIdx = findHeaderIndex(headers, aliases.interest)
  const dividendsIdx = findHeaderIndex(headers, aliases.dividends)
  const qualifiedIdx = findHeaderIndex(headers, aliases.qualifiedDividends)
  const capGainIdx = findHeaderIndex(headers, aliases.capitalGainDistributions)

  const shortProceedsIdx = findHeaderIndex(headers, aliases.shortTermProceeds)
  const shortBasisIdx = findHeaderIndex(headers, aliases.shortTermCostBasis)
  const longProceedsIdx = findHeaderIndex(headers, aliases.longTermProceeds)
  const longBasisIdx = findHeaderIndex(headers, aliases.longTermCostBasis)

  const termIdx = findHeaderIndex(headers, aliases.term)
  const proceedsIdx = findHeaderIndex(headers, aliases.proceeds)
  const costIdx = findHeaderIndex(headers, aliases.costBasis)

  const intTotals = new Map<string, number>()
  const divTotals = new Map<
    string,
    {
      dividends: number
      qualifiedDividends: number
      totalCapitalGainsDistributions: number
    }
  >()
  const bTotals = new Map<
    string,
    {
      shortTermProceeds: number
      shortTermCostBasis: number
      longTermProceeds: number
      longTermCostBasis: number
    }
  >()

  const payerForRow = (row: string[]): string => {
    const candidate = payerIdx === undefined ? '' : row[payerIdx]?.trim()
    return candidate && candidate.length > 0 ? candidate : defaultPayer
  }

  const getDivTotals = (payer: string) => {
    const existing = divTotals.get(payer)
    if (existing) {
      return existing
    }
    const fresh = {
      dividends: 0,
      qualifiedDividends: 0,
      totalCapitalGainsDistributions: 0
    }
    divTotals.set(payer, fresh)
    return fresh
  }

  const getBTotals = (payer: string) => {
    const existing = bTotals.get(payer)
    if (existing) {
      return existing
    }
    const fresh = {
      shortTermProceeds: 0,
      shortTermCostBasis: 0,
      longTermProceeds: 0,
      longTermCostBasis: 0
    }
    bTotals.set(payer, fresh)
    return fresh
  }

  const useSplit1099B =
    shortProceedsIdx !== undefined &&
    shortBasisIdx !== undefined &&
    longProceedsIdx !== undefined &&
    longBasisIdx !== undefined
  const useTerm1099B =
    !useSplit1099B &&
    termIdx !== undefined &&
    proceedsIdx !== undefined &&
    costIdx !== undefined

  const shortProceedsIndex = shortProceedsIdx ?? -1
  const shortBasisIndex = shortBasisIdx ?? -1
  const longProceedsIndex = longProceedsIdx ?? -1
  const longBasisIndex = longBasisIdx ?? -1
  const termIndex = termIdx ?? -1
  const proceedsIndex = proceedsIdx ?? -1
  const costIndex = costIdx ?? -1

  dataRows.forEach((row, rowIndex) => {
    const payer = payerForRow(row)
    const csvRowNumber = rowIndex + 2

    if (interestIdx !== undefined) {
      const amount = parseNumber(row[interestIdx])
      if (amount !== undefined) {
        intTotals.set(payer, (intTotals.get(payer) ?? 0) + amount)
      }
    }

    if (
      dividendsIdx !== undefined ||
      qualifiedIdx !== undefined ||
      capGainIdx !== undefined
    ) {
      const totals = getDivTotals(payer)
      const dividends = dividendsIdx !== undefined ? parseNumber(row[dividendsIdx]) : undefined
      const qualified = qualifiedIdx !== undefined ? parseNumber(row[qualifiedIdx]) : undefined
      const capGain = capGainIdx !== undefined ? parseNumber(row[capGainIdx]) : undefined

      if (dividends !== undefined) {
        totals.dividends += dividends
      }
      if (qualified !== undefined) {
        totals.qualifiedDividends += qualified
      }
      if (capGain !== undefined) {
        totals.totalCapitalGainsDistributions += capGain
      }
    }

    if (useSplit1099B) {
      const shortProceeds = parseNumber(row[shortProceedsIndex])
      const shortBasis = parseNumber(row[shortBasisIndex])
      const longProceeds = parseNumber(row[longProceedsIndex])
      const longBasis = parseNumber(row[longBasisIndex])

      if (
        shortProceeds === undefined &&
        shortBasis === undefined &&
        longProceeds === undefined &&
        longBasis === undefined
      ) {
        return
      }

      const totals = getBTotals(payer)
      totals.shortTermProceeds += shortProceeds ?? 0
      totals.shortTermCostBasis += shortBasis ?? 0
      totals.longTermProceeds += longProceeds ?? 0
      totals.longTermCostBasis += longBasis ?? 0
    } else if (useTerm1099B) {
      const termRaw = row[termIndex]?.toLowerCase() ?? ''
      const proceeds = parseNumber(row[proceedsIndex])
      const cost = parseNumber(row[costIndex])

      if (proceeds === undefined || cost === undefined) {
        warnings.push({
          message: 'Skipping row with missing proceeds or cost basis',
          row: csvRowNumber
        })
        return
      }

      const totals = getBTotals(payer)
      if (termRaw.includes('short') || termRaw.includes('st')) {
        totals.shortTermProceeds += proceeds
        totals.shortTermCostBasis += cost
      } else if (termRaw.includes('long') || termRaw.includes('lt')) {
        totals.longTermProceeds += proceeds
        totals.longTermCostBasis += cost
      } else {
        warnings.push({
          message: `Unknown holding period "${row[termIndex]}"`,
          row: csvRowNumber
        })
      }
    }
  })

  const f1099s: Supported1099[] = []

  intTotals.forEach((income, payer) => {
    if (income !== 0) {
      f1099s.push({
        payer,
        type: Income1099Type.INT,
        personRole: PersonRole.PRIMARY,
        form: { income }
      })
    }
  })

  divTotals.forEach((totals, payer) => {
    const hasValues =
      totals.dividends !== 0 ||
      totals.qualifiedDividends !== 0 ||
      totals.totalCapitalGainsDistributions !== 0
    if (hasValues) {
      f1099s.push({
        payer,
        type: Income1099Type.DIV,
        personRole: PersonRole.PRIMARY,
        form: totals
      })
    }
  })

  bTotals.forEach((totals, payer) => {
    const hasValues =
      totals.shortTermProceeds !== 0 ||
      totals.shortTermCostBasis !== 0 ||
      totals.longTermProceeds !== 0 ||
      totals.longTermCostBasis !== 0
    if (hasValues) {
      f1099s.push({
        payer,
        type: Income1099Type.B,
        personRole: PersonRole.PRIMARY,
        form: totals
      })
    }
  })

  return { f1099s, warnings }
}

const parseCryptoAssets = (
  headers: string[],
  dataRows: string[][],
  aliases: CryptoAliases,
  defaultName: string
): { assets: Asset<Date>[]; warnings: { message: string; row?: number }[] } => {
  const warnings: { message: string; row?: number }[] = []
  const assetIdx = findHeaderIndex(headers, aliases.asset)
  const quantityIdx = findHeaderIndex(headers, aliases.quantity)
  const acquiredIdx = findHeaderIndex(headers, aliases.acquired)
  const soldIdx = findHeaderIndex(headers, aliases.sold)
  const proceedsIdx = findHeaderIndex(headers, aliases.proceeds)
  const costIdx = findHeaderIndex(headers, aliases.costBasis)

  if (
    soldIdx === undefined ||
    proceedsIdx === undefined ||
    costIdx === undefined
  ) {
    return { assets: [], warnings }
  }

  const assetIndex = assetIdx ?? -1
  const quantityIndex = quantityIdx ?? -1
  const acquiredIndex = acquiredIdx ?? -1
  const soldIndex = soldIdx
  const proceedsIndex = proceedsIdx
  const costIndex = costIdx

  const assets: Asset<Date>[] = []

  dataRows.forEach((row, rowIndex) => {
    const csvRowNumber = rowIndex + 2
    const rawName =
      assetIdx === undefined ? '' : (row[assetIndex] ?? '').trim()
    const name = rawName.length === 0 ? defaultName : rawName

    const quantity =
      parseNumber(
        quantityIdx === undefined ? undefined : row[quantityIndex]
      ) ?? 1
    if (quantity <= 0) {
      warnings.push({
        message: 'Skipping row with non-positive quantity',
        row: csvRowNumber
      })
      return
    }

    const proceeds = parseNumber(row[proceedsIndex])
    const costBasis = parseNumber(row[costIndex])
    if (proceeds === undefined || costBasis === undefined) {
      warnings.push({
        message: 'Skipping row with missing proceeds or cost basis',
        row: csvRowNumber
      })
      return
    }

    const closeDate = parseDate(row[soldIndex])
    if (closeDate === undefined) {
      warnings.push({
        message: `Skipping row with invalid sold date "${row[soldIdx]}"`,
        row: csvRowNumber
      })
      return
    }

    const openDate = parseDate(
      acquiredIdx === undefined ? undefined : row[acquiredIndex]
    )
    if (openDate === undefined) {
      warnings.push({
        message: 'Missing acquisition date, defaulting to sold date',
        row: csvRowNumber
      })
    }

    assets.push({
      name,
      positionType: 'Security',
      openDate: openDate ?? closeDate,
      closeDate,
      openPrice: costBasis / quantity,
      closePrice: proceeds / quantity,
      openFee: 0,
      closeFee: 0,
      quantity
    })
  })

  return { assets, warnings }
}

const createParser = (config: {
  id: string
  name: string
  description: string
  defaultPayer: string
  summaryAliases?: SummaryAliases
  cryptoAliases?: CryptoAliases
  requireProviderMatch?: string
}): CSVParser => {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    accepts: (headers: string[]) => {
      if (config.requireProviderMatch) {
        if (!headerIncludes(headers, config.requireProviderMatch)) {
          return false
        }
      }
      const summaryOk = config.summaryAliases
        ? hasSummaryColumns(headers, config.summaryAliases)
        : false
      const cryptoOk = config.cryptoAliases
        ? hasCryptoColumns(headers, config.cryptoAliases)
        : false
      return summaryOk || cryptoOk
    },
    parse: (contents: string): ImportParseResult => {
      const parsed = parseCsvOrError(contents)
      if ('_tag' in parsed) {
        return parsed
      }

      const { headers, dataRows } = parsed
      const warnings: { message: string; row?: number }[] = []

      const summary = config.summaryAliases
        ? parse1099Summary(
            headers,
            dataRows,
            config.summaryAliases,
            config.defaultPayer
          )
        : { f1099s: [], warnings: [] }
      warnings.push(...summary.warnings)

      const crypto = config.cryptoAliases
        ? parseCryptoAssets(
            headers,
            dataRows,
            config.cryptoAliases,
            config.defaultPayer
          )
        : { assets: [], warnings: [] }
      warnings.push(...crypto.warnings)

      if (summary.f1099s.length === 0 && crypto.assets.length === 0) {
        return left([`No supported columns found for ${config.name}`])
      }

      const result: ImportResult = {
        parserId: config.id,
        parserName: config.name,
        f1099s: summary.f1099s,
        assets: crypto.assets,
        warnings
      }

      return right(result)
    }
  }
}

export const fidelityParser = createParser({
  id: 'fidelity-1099',
  name: 'Fidelity 1099',
  description: 'Fidelity 1099-B/INT/DIV export',
  defaultPayer: 'Fidelity',
  summaryAliases: withProviderAliases('Fidelity', genericSummaryAliases),
  requireProviderMatch: 'Fidelity'
})

export const schwabParser = createParser({
  id: 'schwab-1099',
  name: 'Schwab 1099',
  description: 'Charles Schwab 1099-B/INT/DIV export',
  defaultPayer: 'Charles Schwab',
  summaryAliases: withProviderAliases('Schwab', genericSummaryAliases),
  requireProviderMatch: 'Schwab'
})

export const vanguardParser = createParser({
  id: 'vanguard-1099',
  name: 'Vanguard 1099',
  description: 'Vanguard 1099-B/INT/DIV export',
  defaultPayer: 'Vanguard',
  summaryAliases: withProviderAliases('Vanguard', genericSummaryAliases),
  requireProviderMatch: 'Vanguard'
})

export const coinbaseParser = createParser({
  id: 'coinbase-1099da',
  name: 'Coinbase 1099-DA',
  description: 'Coinbase digital asset export',
  defaultPayer: 'Coinbase',
  cryptoAliases: withProviderCryptoAliases('Coinbase', genericCryptoAliases),
  requireProviderMatch: 'Coinbase'
})

export const robinhoodParser = createParser({
  id: 'robinhood-1099da',
  name: 'Robinhood 1099-DA',
  description: 'Robinhood crypto export',
  defaultPayer: 'Robinhood',
  cryptoAliases: withProviderCryptoAliases('Robinhood', genericCryptoAliases),
  requireProviderMatch: 'Robinhood'
})

export const genericColumnMappingParser = createParser({
  id: 'generic-columns',
  name: 'Generic Column Mapping',
  description: 'CSV with standard column headers for 1099 or crypto',
  defaultPayer: 'Imported CSV',
  summaryAliases: genericSummaryAliases,
  cryptoAliases: genericCryptoAliases
})

export const csvParsers: CSVParser[] = [
  fidelityParser,
  schwabParser,
  vanguardParser,
  coinbaseParser,
  robinhoodParser,
  genericColumnMappingParser
]

export const detectParsers = (headers: string[]): CSVParser[] =>
  csvParsers.filter((parser) => parser.accepts(headers))

export const getParserById = (id: string): CSVParser | undefined =>
  csvParsers.find((parser) => parser.id === id)
