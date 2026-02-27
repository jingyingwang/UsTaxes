import fs from 'fs'
import path from 'path'
import { getParserById } from 'ustaxes/import'
import { isRight } from 'ustaxes/core/util'
import {
  Income1099B,
  Income1099Div,
  Income1099Int,
  Income1099Type
} from 'ustaxes/core/data'

const loadCsv = (name: string): string =>
  fs.readFileSync(
    path.join(__dirname, '..', 'testdata', 'import', name),
    'utf8'
  )

describe('CSV import parsers', () => {
  test('Fidelity parser extracts 1099 summary data', () => {
    const parser = getParserById('fidelity-1099')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('fidelity_1099.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    const { f1099s } = result.right
    expect(f1099s).toHaveLength(3)
    const f1099b = f1099s.find(
      (f): f is Income1099B => f.type === Income1099Type.B
    )
    const f1099div = f1099s.find(
      (f): f is Income1099Div => f.type === Income1099Type.DIV
    )
    const f1099int = f1099s.find(
      (f): f is Income1099Int => f.type === Income1099Type.INT
    )
    if (!f1099b || !f1099div || !f1099int) {
      throw new Error('Expected 1099-B, 1099-DIV, and 1099-INT forms')
    }
    expect(f1099b.form.shortTermBasisReportedProceeds).toBeCloseTo(1000)
    expect(f1099b.form.shortTermBasisReportedCostBasis).toBeCloseTo(700)
    expect(f1099b.form.longTermBasisReportedProceeds).toBeCloseTo(2000)
    expect(f1099b.form.longTermBasisReportedCostBasis).toBeCloseTo(1500)
    expect(f1099div.form.dividends).toBeCloseTo(120)
    expect(f1099div.form.qualifiedDividends).toBeCloseTo(80)
    expect(f1099div.form.totalCapitalGainsDistributions).toBeCloseTo(10)
    expect(f1099int.form.income).toBeCloseTo(5)
  })

  test('Schwab parser extracts 1099 summary data', () => {
    const parser = getParserById('schwab-1099')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('schwab_1099.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    expect(result.right.f1099s).toHaveLength(3)
  })

  test('Vanguard parser extracts 1099 summary data', () => {
    const parser = getParserById('vanguard-1099')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('vanguard_1099.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    expect(result.right.f1099s).toHaveLength(3)
  })

  test('Coinbase parser extracts crypto assets', () => {
    const parser = getParserById('coinbase-1099da')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('coinbase_1099da.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    const { assets } = result.right
    expect(assets).toHaveLength(1)
    expect(assets[0].name).toBe('BTC')
    expect(assets[0].quantity).toBeCloseTo(0.5)
    expect(assets[0].openPrice).toBeCloseTo(30000)
    expect(assets[0].closePrice).toBeCloseTo(40000)
  })

  test('Robinhood parser extracts crypto assets', () => {
    const parser = getParserById('robinhood-1099da')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('robinhood_1099da.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    const { assets } = result.right
    expect(assets).toHaveLength(1)
    expect(assets[0].name).toBe('ETH')
    expect(assets[0].quantity).toBeCloseTo(2)
    expect(assets[0].openPrice).toBeCloseTo(1250)
    expect(assets[0].closePrice).toBeCloseTo(2000)
  })

  test('Generic parser handles standard 1099 columns', () => {
    const parser = getParserById('generic-columns')
    expect(parser).toBeDefined()
    if (!parser) {
      return
    }
    const result = parser.parse(loadCsv('generic_1099.csv'))
    expect(isRight(result)).toBe(true)
    if (!isRight(result)) {
      return
    }
    const { f1099s } = result.right
    expect(f1099s).toHaveLength(3)
    const f1099b = f1099s.find(
      (f): f is Income1099B => f.type === Income1099Type.B
    )
    if (!f1099b) {
      throw new Error('Expected 1099-B form')
    }
    expect(f1099b.form.shortTermBasisReportedProceeds).toBeCloseTo(300)
    expect(f1099b.form.longTermBasisReportedProceeds).toBeCloseTo(600)
  })
})
