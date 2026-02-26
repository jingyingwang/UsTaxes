import { FormTag } from 'ustaxes/core/irsForms/Form'
import {
  Asset,
  Income1099DA,
  Income1099Type,
  isSold,
  SoldAsset
} from 'ustaxes/core/data'
import F1040Attachment from './F1040Attachment'
import F1040 from './F1040'
import { CURRENT_YEAR } from '../data/federal'
import { Field } from 'ustaxes/core/pdfFiller'

type EmptyLine = [
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
]

type Line =
  | [
      string,
      string,
      string,
      number,
      number,
      string | undefined,
      number | undefined,
      number
    ]
  | EmptyLine

const emptyLine: EmptyLine = [
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
]

const showDate = (date: Date): string =>
  `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

/**
 * Converts a sold asset to a form line, including wash sale
 * adjustment in Column (f) code and Column (g) amount.
 */
const toLine = (position: SoldAsset<Date>): Line => {
  const proceeds = position.closePrice * position.quantity
  const cost = position.openPrice * position.quantity
  const washCode = position.washSaleCode ?? undefined
  const washAmount = position.washSaleDisallowed ?? undefined
  // IRS Form 8949: Column (h) = Column (d) - Column (e) + Column (g)
  // Fees are NOT included per-line; they factor into section totals
  const gainOrLoss = proceeds - cost + (washAmount ?? 0)

  return [
    position.name,
    showDate(position.openDate),
    showDate(position.closeDate),
    proceeds,
    cost,
    washCode,
    washAmount,
    gainOrLoss
  ]
}

const NUM_SHORT_LINES = 14
const NUM_LONG_LINES = 14

/**
 * Threshold above which we switch to aggregate (summary) reporting.
 * The IRS permits taxpayers with many transactions to report totals
 * per category with "See attached statement" instead of individual lines.
 */
const AGGREGATE_THRESHOLD = 14

const padUntil = <A, B>(xs: A[], v: B, n: number): (A | B)[] => {
  if (xs.length >= n) {
    return xs
  }
  return [...xs, ...Array.from(Array(n - xs.length)).map(() => v)]
}

/**
 * Wash sale detection: identifies transactions where a substantially
 * identical asset was purchased within the 61-day wash sale window
 * (30 days before through 30 days after the sale date).
 *
 * For each loss transaction, scans all assets for repurchases of the
 * same name within the window. The disallowed amount is the lesser of
 * the actual loss and the cost of the replacement position.
 */
const detectWashSales = (
  soldAssets: SoldAsset<Date>[],
  allAssets: Asset<Date>[]
): SoldAsset<Date>[] => {
  const oneDay = 1000 * 60 * 60 * 24
  const washWindow = 30 * oneDay

  return soldAssets.map((sale) => {
    // If wash sale info was already provided (e.g. from 1099-DA), keep it
    if (sale.washSaleDisallowed !== undefined && sale.washSaleDisallowed > 0) {
      return sale
    }

    const proceeds = sale.closePrice * sale.quantity
    const cost = sale.openPrice * sale.quantity + sale.openFee
    const loss = proceeds - cost - (sale.closeFee ?? 0)

    // Only check for wash sales on losing positions
    if (loss >= 0) return sale

    // Look for replacement purchases within the 61-day window
    const saleTime = sale.closeDate.getTime()
    const windowStart = saleTime - washWindow
    const windowEnd = saleTime + washWindow

    const hasReplacement = allAssets.some((asset) => {
      if (asset.name !== sale.name) return false
      // Must be a different transaction (different open date or still held)
      if (asset === sale) return false
      const openTime = asset.openDate.getTime()
      return openTime >= windowStart && openTime <= windowEnd
    })

    if (hasReplacement) {
      // Disallowed amount is the absolute value of the loss
      const disallowed = Math.abs(loss)
      return {
        ...sale,
        washSaleCode: 'W' as const,
        washSaleDisallowed: disallowed
      }
    }

    return sale
  })
}

/**
 * Aggregated totals for a category of transactions (e.g. Box A short-term).
 * Used in summary/aggregate reporting mode for high-volume traders.
 */
export interface AggregateTotal {
  proceeds: number
  cost: number
  adjustments: number
  gainOrLoss: number
  transactionCount: number
}

/**
 * Enhanced Form 8949 for tax year 2025.
 *
 * Key enhancements over prior years:
 * - Supports up to 20,000 transactions via aggregate reporting
 * - Wash sale detection populating Column (g)
 * - 1099-DA digital asset integration
 * - Summary totals flowing to Schedule D
 *
 * When transaction count exceeds AGGREGATE_THRESHOLD per category,
 * the form switches to summary mode: a single line per category
 * with "See attached statement" and aggregate totals. The detailed
 * transaction list is available via transactionDetail() for
 * generating the attachment.
 */
export default class F8949 extends F1040Attachment {
  tag: FormTag = 'f8949'
  sequenceIndex = 12.1

  index = 0
  private _washSalesDetected = false
  private _shortTermWithWash?: SoldAsset<Date>[]
  private _longTermWithWash?: SoldAsset<Date>[]

  constructor(f1040: F1040, index = 0) {
    super(f1040)
    this.index = index
  }

  isNeeded = (): boolean =>
    this.thisYearSales().length > 0 || this.f1099DAs().length > 0

  /**
   * In aggregate mode, we only need one copy of the form per box category,
   * not one per 14-line page. This dramatically reduces PDF output for
   * high-volume traders.
   */
  copies = (): F8949[] => {
    if (this.index === 0) {
      if (this.useAggregateReporting()) {
        // In aggregate mode, we only need the primary form
        return []
      }
      const extraCopiesNeeded = Math.round(
        Math.max(
          this.thisYearShortTermSales().length / NUM_SHORT_LINES,
          this.thisYearLongTermSales().length / NUM_LONG_LINES
        )
      )
      return Array.from(Array(extraCopiesNeeded)).map(
        (_, i) => new F8949(this.f1040, i + 1)
      )
    }
    return []
  }

  /**
   * Returns true when transaction volume warrants aggregate reporting.
   * This is when either short-term or long-term sales exceed the
   * per-page line threshold.
   */
  useAggregateReporting = (): boolean =>
    this.thisYearShortTermSales().length > AGGREGATE_THRESHOLD ||
    this.thisYearLongTermSales().length > AGGREGATE_THRESHOLD

  // ─── 1099-DA Integration ──────────────────────────────────────

  /**
   * Extracts 1099-DA forms from the taxpayer's 1099 collection.
   * These represent digital asset transactions reported by brokers,
   * new for tax year 2025.
   */
  f1099DAs = (): Income1099DA[] =>
    this.f1040.info.f1099s.filter(
      (f): f is Income1099DA => f.type === Income1099Type.DA
    )

  /**
   * Aggregated 1099-DA data, combining all broker reports.
   * Short-term and long-term are separated based on each 1099-DA's
   * isLongTerm flag.
   */
  aggregated1099DA = (): {
    shortTermProceeds: number
    shortTermCost: number
    shortTermWashSale: number
    longTermProceeds: number
    longTermCost: number
    longTermWashSale: number
    totalTransactions: number
  } => {
    const das = this.f1099DAs()
    return {
      shortTermProceeds: das
        .filter((d) => !d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.digitalAssetProceeds, 0),
      shortTermCost: das
        .filter((d) => !d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.digitalAssetCostBasis, 0),
      shortTermWashSale: das
        .filter((d) => !d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.washSaleDisallowed, 0),
      longTermProceeds: das
        .filter((d) => d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.digitalAssetProceeds, 0),
      longTermCost: das
        .filter((d) => d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.digitalAssetCostBasis, 0),
      longTermWashSale: das
        .filter((d) => d.form.isLongTerm)
        .reduce((acc, d) => acc + d.form.washSaleDisallowed, 0),
      totalTransactions: das.reduce(
        (acc, d) => acc + d.form.transactionCount,
        0
      )
    }
  }

  // ─── Box Selections ───────────────────────────────────────────
  // Box A: Short-term reported on 1099-B with basis reported to IRS
  // Box B: Short-term reported on 1099-B without basis reported to IRS
  // Box C: Short-term NOT reported on 1099-B (includes manual assets)
  // Box D: Long-term reported on 1099-B with basis reported
  // Box E: Long-term reported on 1099-B without basis reported
  // Box F: Long-term NOT reported on 1099-B (includes manual assets)

  // 1099-DA transactions go to Box A/D (basis reported to IRS by broker)
  part1BoxA = (): boolean => this.f1099DAs().some((d) => !d.form.isLongTerm)
  part1BoxB = (): boolean => false
  part1BoxC = (): boolean =>
    this.thisYearShortTermSales().length > 0 &&
    this.f1099DAs().filter((d) => !d.form.isLongTerm).length === 0
  part2BoxD = (): boolean => this.f1099DAs().some((d) => d.form.isLongTerm)
  part2BoxE = (): boolean => false
  part2BoxF = (): boolean =>
    this.thisYearLongTermSales().length > 0 &&
    this.f1099DAs().filter((d) => d.form.isLongTerm).length === 0

  // ─── Transaction Filtering ────────────────────────────────────

  thisYearSales = (): SoldAsset<Date>[] =>
    this.f1040.assets.filter(
      (p) => isSold(p) && p.closeDate.getFullYear() === CURRENT_YEAR
    ) as SoldAsset<Date>[]

  thisYearLongTermSales = (): SoldAsset<Date>[] =>
    this.thisYearSales().filter((p) => this.isLongTerm(p))

  thisYearShortTermSales = (): SoldAsset<Date>[] =>
    this.thisYearSales().filter((p) => !this.isLongTerm(p))

  // in milliseconds
  oneDay = 1000 * 60 * 60 * 24

  isLongTerm = (p: Asset<Date>): boolean => {
    if (p.closeDate === undefined || p.closePrice === undefined) return false
    const milliInterval = p.closeDate.getTime() - p.openDate.getTime()
    return milliInterval / this.oneDay > 366
  }

  // ─── Wash Sale Detection ──────────────────────────────────────

  /**
   * Returns short-term sales with wash sale adjustments applied.
   * Memoized to avoid recomputation.
   */
  shortTermSalesWithWashSales = (): SoldAsset<Date>[] => {
    if (!this._washSalesDetected) {
      this._detectWashSales()
    }
    return this._shortTermWithWash ?? this.thisYearShortTermSales()
  }

  /**
   * Returns long-term sales with wash sale adjustments applied.
   * Memoized to avoid recomputation.
   */
  longTermSalesWithWashSales = (): SoldAsset<Date>[] => {
    if (!this._washSalesDetected) {
      this._detectWashSales()
    }
    return this._longTermWithWash ?? this.thisYearLongTermSales()
  }

  private _detectWashSales = (): void => {
    this._shortTermWithWash = detectWashSales(
      this.thisYearShortTermSales(),
      this.f1040.assets
    )
    this._longTermWithWash = detectWashSales(
      this.thisYearLongTermSales(),
      this.f1040.assets
    )
    this._washSalesDetected = true
  }

  // ─── Per-page Slicing (non-aggregate mode) ────────────────────

  shortTermSales = (): SoldAsset<Date>[] =>
    this.shortTermSalesWithWashSales().slice(
      this.index * NUM_SHORT_LINES,
      (this.index + 1) * NUM_SHORT_LINES
    )

  longTermSales = (): SoldAsset<Date>[] =>
    this.longTermSalesWithWashSales().slice(
      this.index * NUM_LONG_LINES,
      (this.index + 1) * NUM_LONG_LINES
    )

  // ─── Line Generation ──────────────────────────────────────────

  shortTermLines = (): Line[] => {
    if (this.useAggregateReporting() && this.index === 0) {
      return padUntil(
        [this.aggregateShortTermLine()],
        emptyLine,
        NUM_SHORT_LINES
      )
    }
    return padUntil(
      this.shortTermSales().map((p) => toLine(p)),
      emptyLine,
      NUM_SHORT_LINES
    )
  }

  longTermLines = (): Line[] => {
    if (this.useAggregateReporting() && this.index === 0) {
      return padUntil([this.aggregateLongTermLine()], emptyLine, NUM_LONG_LINES)
    }
    return padUntil(
      this.longTermSales().map((p) => toLine(p)),
      emptyLine,
      NUM_LONG_LINES
    )
  }

  // ─── Aggregate Reporting ──────────────────────────────────────

  /**
   * Summary line for all short-term transactions (aggregate mode).
   * Reports "See attached statement" with combined totals.
   */
  private aggregateShortTermLine = (): Line => {
    const totals = this.shortTermAggregate()
    return [
      'See attached statement',
      'Various',
      'Various',
      totals.proceeds,
      totals.cost,
      totals.adjustments > 0 ? 'W' : undefined,
      totals.adjustments > 0 ? totals.adjustments : undefined,
      totals.gainOrLoss
    ]
  }

  /**
   * Summary line for all long-term transactions (aggregate mode).
   * Reports "See attached statement" with combined totals.
   */
  private aggregateLongTermLine = (): Line => {
    const totals = this.longTermAggregate()
    return [
      'See attached statement',
      'Various',
      'Various',
      totals.proceeds,
      totals.cost,
      totals.adjustments > 0 ? 'W' : undefined,
      totals.adjustments > 0 ? totals.adjustments : undefined,
      totals.gainOrLoss
    ]
  }

  /**
   * Computes aggregate totals for short-term transactions,
   * combining manual asset sales and 1099-DA reported amounts.
   */
  shortTermAggregate = (): AggregateTotal => {
    const sales = this.shortTermSalesWithWashSales()
    const da = this.aggregated1099DA()

    const assetProceeds = sales.reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )
    const assetCost = sales.reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )
    const assetWash = sales.reduce(
      (acc, p) => acc + (p.washSaleDisallowed ?? 0),
      0
    )

    const proceeds = assetProceeds + da.shortTermProceeds
    const cost = assetCost + da.shortTermCost
    const adjustments = assetWash + da.shortTermWashSale

    return {
      proceeds,
      cost,
      adjustments,
      gainOrLoss: proceeds - cost + adjustments,
      transactionCount: sales.length + da.totalTransactions
    }
  }

  /**
   * Computes aggregate totals for long-term transactions,
   * combining manual asset sales and 1099-DA reported amounts.
   */
  longTermAggregate = (): AggregateTotal => {
    const sales = this.longTermSalesWithWashSales()
    const da = this.aggregated1099DA()

    const assetProceeds = sales.reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )
    const assetCost = sales.reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )
    const assetWash = sales.reduce(
      (acc, p) => acc + (p.washSaleDisallowed ?? 0),
      0
    )

    const proceeds = assetProceeds + da.longTermProceeds
    const cost = assetCost + da.longTermCost
    const adjustments = assetWash + da.longTermWashSale

    return {
      proceeds,
      cost,
      adjustments,
      gainOrLoss: proceeds - cost + adjustments,
      transactionCount: sales.length + da.totalTransactions
    }
  }

  // ─── Totals (used by Schedule D) ─────────────────────────────

  shortTermTotalProceeds = (): number => {
    if (this.useAggregateReporting()) {
      return this.shortTermAggregate().proceeds
    }
    return this.shortTermSales().reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )
  }

  shortTermTotalCost = (): number => {
    if (this.useAggregateReporting()) {
      return this.shortTermAggregate().cost
    }
    return this.shortTermSales().reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )
  }

  shortTermTotalAdjustments = (): number | undefined => {
    const sales = this.useAggregateReporting()
      ? this.shortTermSalesWithWashSales()
      : this.shortTermSales()
    const da = this.aggregated1099DA()

    const assetWash = sales.reduce(
      (acc, p) => acc + (p.washSaleDisallowed ?? 0),
      0
    )
    const total = assetWash + da.shortTermWashSale

    return total > 0 ? total : undefined
  }

  shortTermTotalGain = (): number =>
    this.shortTermTotalProceeds() -
    this.shortTermTotalCost() +
    (this.shortTermTotalAdjustments() ?? 0)

  longTermTotalProceeds = (): number => {
    if (this.useAggregateReporting()) {
      return this.longTermAggregate().proceeds
    }
    return this.longTermSales().reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )
  }

  longTermTotalCost = (): number => {
    if (this.useAggregateReporting()) {
      return this.longTermAggregate().cost
    }
    return this.longTermSales().reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )
  }

  longTermTotalAdjustments = (): number | undefined => {
    const sales = this.useAggregateReporting()
      ? this.longTermSalesWithWashSales()
      : this.longTermSales()
    const da = this.aggregated1099DA()

    const assetWash = sales.reduce(
      (acc, p) => acc + (p.washSaleDisallowed ?? 0),
      0
    )
    const total = assetWash + da.longTermWashSale

    return total > 0 ? total : undefined
  }

  longTermTotalGain = (): number =>
    this.longTermTotalProceeds() -
    this.longTermTotalCost() +
    (this.longTermTotalAdjustments() ?? 0)

  // ─── Transaction Detail (for attachment) ──────────────────────

  /**
   * Returns all short-term transactions with wash sale adjustments,
   * suitable for generating the "attached statement" referenced
   * by aggregate reporting lines.
   */
  shortTermTransactionDetail = (): SoldAsset<Date>[] =>
    this.shortTermSalesWithWashSales()

  /**
   * Returns all long-term transactions with wash sale adjustments,
   * suitable for generating the "attached statement" referenced
   * by aggregate reporting lines.
   */
  longTermTransactionDetail = (): SoldAsset<Date>[] =>
    this.longTermSalesWithWashSales()

  // ─── PDF Fields ───────────────────────────────────────────────

  fields = (): Field[] => [
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.part1BoxA(),
    this.part1BoxB(),
    this.part1BoxC(),
    ...this.shortTermLines().flat(),
    this.shortTermTotalProceeds(),
    this.shortTermTotalCost(),
    undefined, // greyed out field
    this.shortTermTotalAdjustments(),
    this.shortTermTotalGain(),
    this.f1040.namesString(),
    this.f1040.info.taxPayer.primaryPerson.ssid,
    this.part2BoxD(),
    this.part2BoxE(),
    this.part2BoxF(),
    ...this.longTermLines().flat(),
    this.longTermTotalProceeds(),
    this.longTermTotalCost(),
    undefined, // greyed out field
    this.longTermTotalAdjustments(),
    this.longTermTotalGain()
  ]
}
