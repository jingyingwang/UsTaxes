import { FormTag } from 'ustaxes/core/irsForms/Form'
import {
  Asset,
  isSold,
  normalizeF1099BData,
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

type F8949Category = 'reported' | 'not_reported' | 'unreported'

type LineData = {
  description: string
  dateAcquired: string
  dateSold: string
  proceeds: number
  costBasis: number
  code?: string
  adjustment?: number
}

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

const toLine = (line: LineData): Line => [
  line.description,
  line.dateAcquired,
  line.dateSold,
  line.proceeds,
  line.costBasis,
  line.code,
  line.adjustment,
  line.proceeds - line.costBasis + (line.adjustment ?? 0)
]

const NUM_SHORT_LINES = 14
const NUM_LONG_LINES = 14
const CATEGORY_ORDER: F8949Category[] = [
  'reported',
  'not_reported',
  'unreported'
]

const padUntil = <A, B>(xs: A[], v: B, n: number): (A | B)[] => {
  if (xs.length >= n) {
    return xs
  }
  return [...xs, ...Array.from(Array(n - xs.length)).map(() => v)]
}

/**
 * Form 8949 box types determine how transactions are categorized:
 * - BoxA/BoxD: Basis reported to IRS (1099-B with basis)
 * - BoxB/BoxE: Basis NOT reported to IRS (1099-B without basis)
 * - BoxC/BoxF: No 1099-B received (individual asset transactions)
 *
 * Part 1 (A/B/C) = short-term, Part 2 (D/E/F) = long-term
 */
export default class F8949 extends F1040Attachment {
  tag: FormTag = 'f8949'
  sequenceIndex = 12.1

  index = 0
  category?: F8949Category

  constructor(
    f1040: F1040,
    options?: { category?: F8949Category; index?: number }
  ) {
    super(f1040)
    this.index = options?.index ?? 0
    this.category = options?.category
  }

  isNeeded = (): boolean => {
    if (this.category === undefined) {
      return this.categoriesWithData().length > 0
    }
    return (
      this.shortTermLineDataForCategory(this.category).length > 0 ||
      this.longTermLineDataForCategory(this.category).length > 0
    )
  }

  /**
   * Generate additional copies of F8949 for each box type that has
   * transactions, and for overflow beyond 14 lines per section.
   */
  copies = (): F8949[] => {
    const categories = this.categoriesWithData()
    if (categories.length === 0) {
      return []
    }

    const primaryCategory = this.effectiveCategory() ?? categories[0]
    const forms: F8949[] = []

    for (const category of categories) {
      const shortCount = this.shortTermLineDataForCategory(category).length
      const longCount = this.longTermLineDataForCategory(category).length
      const pages = Math.max(
        Math.ceil(shortCount / NUM_SHORT_LINES),
        Math.ceil(longCount / NUM_LONG_LINES),
        1
      )

      for (let i = 0; i < pages; i += 1) {
        if (category === primaryCategory && i === this.index) continue
        forms.push(new F8949(this.f1040, { category, index: i }))
      }
    }

    return forms
  }

  part1BoxA = (): boolean =>
    this.effectiveCategory() === 'reported' && this.shortTermSales().length > 0
  part1BoxB = (): boolean =>
    this.effectiveCategory() === 'not_reported' &&
    this.shortTermSales().length > 0
  part1BoxC = (): boolean =>
    this.effectiveCategory() === 'unreported' &&
    this.shortTermSales().length > 0
  part2BoxD = (): boolean =>
    this.effectiveCategory() === 'reported' && this.longTermSales().length > 0
  part2BoxE = (): boolean =>
    this.effectiveCategory() === 'not_reported' &&
    this.longTermSales().length > 0
  part2BoxF = (): boolean =>
    this.effectiveCategory() === 'unreported' && this.longTermSales().length > 0

  thisYearSales = (): SoldAsset<Date>[] =>
    this.f1040.assets.filter(
      (p) => isSold(p) && p.closeDate.getFullYear() === CURRENT_YEAR
    ) as SoldAsset<Date>[]

  thisYearLongTermSales = (): SoldAsset<Date>[] =>
    this.thisYearSales().filter((p) => this.isLongTerm(p))

  thisYearShortTermSales = (): SoldAsset<Date>[] =>
    this.thisYearSales().filter((p) => !this.isLongTerm(p))

  oneDay = 1000 * 60 * 60 * 24

  isLongTerm = (p: Asset<Date>): boolean => {
    if (p.closeDate === undefined || p.closePrice === undefined) return false
    const milliInterval = p.closeDate.getTime() - p.openDate.getTime()
    return milliInterval / this.oneDay > 366
  }

  getBoxForAsset = (p: Asset<Date>): string => {
    const longTerm = this.isLongTerm(p)
    if (p.basisReportedToIRS === true) return longTerm ? 'D' : 'A'
    if (p.basisReportedToIRS === false) return longTerm ? 'E' : 'B'
    return longTerm ? 'F' : 'C'
  }

  shortTermSales = (): LineData[] =>
    this.shortTermLineData().slice(
      this.index * NUM_SHORT_LINES,
      (this.index + 1) * NUM_SHORT_LINES
    )

  longTermSales = (): LineData[] =>
    this.longTermLineData().slice(
      this.index * NUM_LONG_LINES,
      (this.index + 1) * NUM_LONG_LINES
    )

  shortTermLines = (): Line[] =>
    padUntil(
      this.shortTermSales().map((p) => toLine(p)),
      emptyLine,
      NUM_SHORT_LINES
    )

  longTermLines = (): Line[] =>
    padUntil(
      this.longTermSales().map((p) => toLine(p)),
      emptyLine,
      NUM_LONG_LINES
    )

  shortTermTotalProceeds = (): number =>
    this.shortTermSales().reduce((acc, p) => acc + p.proceeds, 0)

  shortTermTotalCost = (): number =>
    this.shortTermSales().reduce((acc, p) => acc + p.costBasis, 0)

  shortTermTotalAdjustments = (): number | undefined => {
    const total = this.shortTermSales().reduce(
      (acc, p) => acc + (p.adjustment ?? 0),
      0
    )
    return total === 0 ? undefined : total
  }

  shortTermTotalGain = (): number =>
    this.shortTermSales().reduce(
      (acc, p) => acc + p.proceeds - p.costBasis + (p.adjustment ?? 0),
      0
    )

  longTermTotalProceeds = (): number =>
    this.longTermSales().reduce((acc, p) => acc + p.proceeds, 0)

  longTermTotalCost = (): number =>
    this.longTermSales().reduce((acc, p) => acc + p.costBasis, 0)

  longTermTotalAdjustments = (): number | undefined => {
    const total = this.longTermSales().reduce(
      (acc, p) => acc + (p.adjustment ?? 0),
      0
    )
    return total === 0 ? undefined : total
  }

  longTermTotalGain = (): number =>
    this.longTermSales().reduce(
      (acc, p) => acc + p.proceeds - p.costBasis + (p.adjustment ?? 0),
      0
    )

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

  private effectiveCategory = (): F8949Category | undefined =>
    this.category ?? this.categoriesWithData()[0]

  private categoriesWithData = (): F8949Category[] =>
    CATEGORY_ORDER.filter(
      (category) =>
        this.shortTermLineDataForCategory(category).length > 0 ||
        this.longTermLineDataForCategory(category).length > 0
    )

  private hasAmounts = (
    proceeds: number,
    costBasis: number,
    adjustment: number
  ): boolean =>
    Math.abs(proceeds) > 0 ||
    Math.abs(costBasis) > 0 ||
    Math.abs(adjustment) > 0

  private buildSummaryLine = (
    label: string,
    proceeds: number,
    costBasis: number,
    adjustment: number
  ): LineData[] => {
    if (!this.hasAmounts(proceeds, costBasis, adjustment)) return []
    return [
      {
        description: label,
        dateAcquired: 'Various',
        dateSold: 'Various',
        proceeds,
        costBasis,
        code: adjustment !== 0 ? 'W' : undefined,
        adjustment: adjustment !== 0 ? adjustment : undefined
      }
    ]
  }

  private reportedShortTermLines = (): LineData[] =>
    this.f1040.f1099Bs().flatMap((b) => {
      const form = normalizeF1099BData(b.form)
      const proceeds = form.shortTermBasisReportedProceeds
      const costBasis = form.shortTermBasisReportedCostBasis
      const washSale = form.shortTermBasisReportedWashSale
      if (washSale === 0) return []
      return this.buildSummaryLine(
        `${b.payer} (short-term basis reported)`,
        proceeds,
        costBasis,
        washSale
      )
    })

  private notReportedShortTermLines = (): LineData[] =>
    this.f1040.f1099Bs().flatMap((b) => {
      const form = normalizeF1099BData(b.form)
      const proceeds = form.shortTermBasisNotReportedProceeds
      const costBasis = form.shortTermBasisNotReportedCostBasis
      const washSale = form.shortTermBasisNotReportedWashSale
      return this.buildSummaryLine(
        `${b.payer} (short-term basis not reported)`,
        proceeds,
        costBasis,
        washSale
      )
    })

  private unreportedShortTermLines = (): LineData[] =>
    this.thisYearShortTermSales().map((p) => ({
      description: p.name,
      dateAcquired: showDate(p.openDate),
      dateSold: showDate(p.closeDate),
      proceeds: p.closePrice * p.quantity - (p.closeFee ?? 0),
      costBasis: p.openPrice * p.quantity + p.openFee,
      code: p.washSaleAdjustment ? 'W' : undefined,
      adjustment: p.washSaleAdjustment
    }))

  private reportedLongTermLines = (): LineData[] =>
    this.f1040.f1099Bs().flatMap((b) => {
      const form = normalizeF1099BData(b.form)
      const proceeds = form.longTermBasisReportedProceeds
      const costBasis = form.longTermBasisReportedCostBasis
      const washSale = form.longTermBasisReportedWashSale
      if (washSale === 0) return []
      return this.buildSummaryLine(
        `${b.payer} (long-term basis reported)`,
        proceeds,
        costBasis,
        washSale
      )
    })

  private notReportedLongTermLines = (): LineData[] =>
    this.f1040.f1099Bs().flatMap((b) => {
      const form = normalizeF1099BData(b.form)
      const proceeds = form.longTermBasisNotReportedProceeds
      const costBasis = form.longTermBasisNotReportedCostBasis
      const washSale = form.longTermBasisNotReportedWashSale
      return this.buildSummaryLine(
        `${b.payer} (long-term basis not reported)`,
        proceeds,
        costBasis,
        washSale
      )
    })

  private unreportedLongTermLines = (): LineData[] =>
    this.thisYearLongTermSales().map((p) => ({
      description: p.name,
      dateAcquired: showDate(p.openDate),
      dateSold: showDate(p.closeDate),
      proceeds: p.closePrice * p.quantity - (p.closeFee ?? 0),
      costBasis: p.openPrice * p.quantity + p.openFee,
      code: p.washSaleAdjustment ? 'W' : undefined,
      adjustment: p.washSaleAdjustment
    }))

  private shortTermLineData = (): LineData[] => {
    const category = this.effectiveCategory()
    if (category === undefined) return []
    return this.shortTermLineDataForCategory(category)
  }

  private longTermLineData = (): LineData[] => {
    const category = this.effectiveCategory()
    if (category === undefined) return []
    return this.longTermLineDataForCategory(category)
  }

  private shortTermLineDataForCategory = (
    category: F8949Category
  ): LineData[] => {
    switch (category) {
      case 'reported':
        return this.reportedShortTermLines()
      case 'not_reported':
        return this.notReportedShortTermLines()
      case 'unreported':
        return this.unreportedShortTermLines()
    }
  }

  private longTermLineDataForCategory = (
    category: F8949Category
  ): LineData[] => {
    switch (category) {
      case 'reported':
        return this.reportedLongTermLines()
      case 'not_reported':
        return this.notReportedLongTermLines()
      case 'unreported':
        return this.unreportedLongTermLines()
    }
  }
}
