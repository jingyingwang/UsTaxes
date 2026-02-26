import { FormTag } from 'ustaxes/core/irsForms/Form'
import { Asset, isSold, SoldAsset } from 'ustaxes/core/data'
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
 * Convert a sold asset to a form line, including wash sale adjustment
 * codes and amounts when applicable.
 *
 * Column (f) adjustment code: 'W' for wash sales
 * Column (g) adjustment amount: the wash sale disallowed loss
 */
const toLine = (position: SoldAsset<Date>): Line => {
  const proceeds = position.closePrice * position.quantity
  const cost = position.openPrice * position.quantity
  const washAdj = position.washSaleAdjustment ?? 0
  const adjCode = washAdj !== 0 ? 'W' : undefined
  const adjAmount = washAdj !== 0 ? washAdj : undefined
  const gain = proceeds - cost + washAdj

  return [
    position.name,
    showDate(position.openDate),
    showDate(position.closeDate),
    proceeds,
    cost,
    adjCode,
    adjAmount,
    gain
  ]
}

const NUM_SHORT_LINES = 14
const NUM_LONG_LINES = 14

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
export type F8949BoxType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export default class F8949 extends F1040Attachment {
  tag: FormTag = 'f8949'
  sequenceIndex = 12.1

  index = 0
  boxType: F8949BoxType

  constructor(f1040: F1040, index = 0, boxType: F8949BoxType = 'C') {
    super(f1040)
    this.index = index
    this.boxType = boxType
  }

  isNeeded = (): boolean => this.thisYearSales().length > 0

  /**
   * Generate additional copies of F8949 for each box type that has
   * transactions, and for overflow beyond 14 lines per section.
   */
  copies = (): F8949[] => {
    if (this.index !== 0 || this.boxType !== 'C') {
      return []
    }

    const result: F8949[] = []
    const boxTypes: F8949BoxType[] = ['A', 'B', 'C', 'D', 'E', 'F']

    for (const bt of boxTypes) {
      const sales = this.salesForBox(bt)
      if (sales.length === 0) continue

      const linesPerPage = bt <= 'C' ? NUM_SHORT_LINES : NUM_LONG_LINES
      const pagesNeeded = Math.ceil(sales.length / linesPerPage)

      for (let page = 0; page < pagesNeeded; page++) {
        // Skip the primary form instance (index=0, boxType='C')
        if (page === 0 && bt === 'C') continue
        result.push(new F8949(this.f1040, page, bt))
      }
    }

    return result
  }

  // Box selection based on transaction characteristics
  part1BoxA = (): boolean => this.boxType === 'A'
  part1BoxB = (): boolean => this.boxType === 'B'
  part1BoxC = (): boolean => this.boxType === 'C'
  part2BoxD = (): boolean => this.boxType === 'D'
  part2BoxE = (): boolean => this.boxType === 'E'
  part2BoxF = (): boolean => this.boxType === 'F'

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

  /**
   * Determine which F8949 box a transaction belongs to:
   * - basisReportedToIRS === true: Box A (short) or D (long)
   * - basisReportedToIRS === false: Box B (short) or E (long)
   * - basisReportedToIRS undefined (no 1099-B): Box C (short) or F (long)
   */
  getBoxForAsset = (p: SoldAsset<Date>): F8949BoxType => {
    const longTerm = this.isLongTerm(p)
    if (p.basisReportedToIRS === true) {
      return longTerm ? 'D' : 'A'
    } else if (p.basisReportedToIRS === false) {
      return longTerm ? 'E' : 'B'
    }
    return longTerm ? 'F' : 'C'
  }

  /**
   * Get all sales for a specific box type
   */
  salesForBox = (bt: F8949BoxType): SoldAsset<Date>[] =>
    this.thisYearSales().filter((p) => this.getBoxForAsset(p) === bt)

  /**
   * Take the short term transactions that fit on this copy of the 8949
   */
  shortTermSales = (): SoldAsset<Date>[] => {
    if (this.boxType > 'C') return [] // Part 2 boxes don't have short-term
    return this.salesForBox(this.boxType).slice(
      this.index * NUM_SHORT_LINES,
      (this.index + 1) * NUM_SHORT_LINES
    )
  }

  /**
   * Take the long term transactions that fit on this copy of the 8949
   */
  longTermSales = (): SoldAsset<Date>[] => {
    if (this.boxType <= 'C') return [] // Part 1 boxes don't have long-term
    return this.salesForBox(this.boxType).slice(
      this.index * NUM_LONG_LINES,
      (this.index + 1) * NUM_LONG_LINES
    )
  }

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
    this.shortTermSales().reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )

  shortTermTotalCost = (): number =>
    this.shortTermSales().reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )

  shortTermTotalGain = (): number =>
    this.shortTermTotalProceeds() -
    this.shortTermTotalCost() +
    (this.shortTermTotalAdjustments() ?? 0)

  shortTermTotalAdjustments = (): number | undefined => {
    const total = this.shortTermSales().reduce(
      (acc, p) => acc + (p.washSaleAdjustment ?? 0),
      0
    )
    return total !== 0 ? total : undefined
  }

  longTermTotalProceeds = (): number =>
    this.longTermSales().reduce(
      (acc, p) => acc + p.closePrice * p.quantity - (p.closeFee ?? 0),
      0
    )

  longTermTotalCost = (): number =>
    this.longTermSales().reduce(
      (acc, p) => acc + p.openPrice * p.quantity + p.openFee,
      0
    )

  longTermTotalGain = (): number =>
    this.longTermTotalProceeds() -
    this.longTermTotalCost() +
    (this.longTermTotalAdjustments() ?? 0)

  longTermTotalAdjustments = (): number | undefined => {
    const total = this.longTermSales().reduce(
      (acc, p) => acc + (p.washSaleAdjustment ?? 0),
      0
    )
    return total !== 0 ? total : undefined
  }

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
