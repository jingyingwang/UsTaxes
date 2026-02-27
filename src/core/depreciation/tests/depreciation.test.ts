import {
  calculateDepreciation,
  computeSection179,
  getBonusRate,
  DepreciableAsset
} from '../index'
import { getMACRSRate } from '../macrs'

describe('MACRS rate tables', () => {
  it('5-year half-year convention, year 1 = 20%', () => {
    expect(getMACRSRate(5, '200DB', 'half-year', 1)).toBeCloseTo(20.0, 1)
  })

  it('5-year half-year convention, year 2 = 32%', () => {
    expect(getMACRSRate(5, '200DB', 'half-year', 2)).toBeCloseTo(32.0, 1)
  })

  it('7-year half-year convention, year 1 = 14.29%', () => {
    expect(getMACRSRate(7, '200DB', 'half-year', 1)).toBeCloseTo(14.29, 2)
  })

  it('rates sum to 100% for 5-year property', () => {
    let total = 0
    for (let y = 1; y <= 6; y++) {
      total += getMACRSRate(5, '200DB', 'half-year', y)
    }
    expect(total).toBeCloseTo(100.0, 0)
  })

  it('rates sum to 100% for 7-year property', () => {
    let total = 0
    for (let y = 1; y <= 8; y++) {
      total += getMACRSRate(7, '200DB', 'half-year', y)
    }
    expect(total).toBeCloseTo(100.0, 0)
  })

  it('returns 0 for year beyond recovery period', () => {
    expect(getMACRSRate(5, '200DB', 'half-year', 7)).toBe(0)
  })

  it('mid-month convention for 39-year property, month 1', () => {
    const rate = getMACRSRate(39, 'SL', 'mid-month', 1, undefined, 1)
    // First year with January placement: 11.5 months * monthly rate
    expect(rate).toBeGreaterThan(0)
    expect(rate).toBeLessThan(3)
  })

  it('mid-quarter convention Q1 for 5-year property', () => {
    expect(getMACRSRate(5, '200DB', 'mid-quarter', 1, 1)).toBeCloseTo(35.0, 1)
  })

  it('mid-quarter convention Q4 for 5-year property', () => {
    expect(getMACRSRate(5, '200DB', 'mid-quarter', 1, 4)).toBeCloseTo(5.0, 1)
  })
})

describe('Section 179', () => {
  it('allows full deduction within limits', () => {
    const result = computeSection179(2025, 50000, 50000, 100000)
    expect(result).toBe(50000)
  })

  it('limits to business income', () => {
    const result = computeSection179(2025, 50000, 50000, 30000)
    expect(result).toBe(30000)
  })

  it('phases out when cost exceeds threshold', () => {
    // 2025 threshold: $3,130,000, max: $1,250,000
    // Cost exceeds threshold by $100,000 → max reduced to $1,150,000
    const result = computeSection179(2025, 3230000, 1250000, 5000000)
    expect(result).toBe(1150000)
  })

  it('reduces to zero when cost far exceeds threshold', () => {
    const result = computeSection179(2025, 5000000, 1250000, 5000000)
    expect(result).toBe(0)
  })

  it('returns 0 for unsupported year', () => {
    const result = computeSection179(2018, 50000, 50000, 100000)
    expect(result).toBe(0)
  })
})

describe('Bonus depreciation', () => {
  it('2025 rate is 40%', () => {
    expect(getBonusRate(2025)).toBe(40)
  })

  it('2023 rate is 80%', () => {
    expect(getBonusRate(2023)).toBe(80)
  })

  it('2022 rate is 100%', () => {
    expect(getBonusRate(2022)).toBe(100)
  })

  it('2027 rate is 0%', () => {
    expect(getBonusRate(2027)).toBe(0)
  })
})

describe('calculateDepreciation', () => {
  const makeAsset = (
    overrides?: Partial<DepreciableAsset>
  ): DepreciableAsset => ({
    description: 'Office Equipment',
    datePlacedInService: new Date(2025, 0, 15),
    cost: 10000,
    propertyClass: '7-year',
    method: '200DB',
    convention: 'half-year',
    bonusDepreciationEligible: false,
    ...overrides
  })

  it('calculates MACRS-only depreciation for year 1', () => {
    const asset = makeAsset()
    const result = calculateDepreciation(asset, 2025)
    // 7-year property, half-year, year 1 = 14.29%
    expect(result.macrsDepreciation).toBeCloseTo(1429, 0)
    expect(result.section179).toBe(0)
    expect(result.bonusDepreciation).toBe(0)
  })

  it('calculates MACRS depreciation for year 2', () => {
    const asset = makeAsset()
    const result = calculateDepreciation(asset, 2026)
    // 7-year property, half-year, year 2 = 24.49%
    expect(result.macrsDepreciation).toBeCloseTo(2449, 0)
  })

  it('applies Section 179 in year 1', () => {
    const asset = makeAsset()
    const result = calculateDepreciation(asset, 2025, 5000)
    expect(result.section179).toBe(5000)
    // MACRS on remaining $5,000: 14.29% = $714.50
    expect(result.macrsDepreciation).toBeCloseTo(714.5, 0)
    expect(result.totalDepreciation).toBeCloseTo(5714.5, 0)
  })

  it('applies bonus depreciation at 40% for 2025', () => {
    const asset = makeAsset({ bonusDepreciationEligible: true })
    const result = calculateDepreciation(asset, 2025)
    // Bonus: 40% of $10,000 = $4,000
    expect(result.bonusDepreciation).toBe(4000)
    // MACRS on remaining $6,000: 14.29% = $857.40
    expect(result.macrsDepreciation).toBeCloseTo(857.4, 0)
  })

  it('applies Section 179 + bonus + MACRS stack', () => {
    const asset = makeAsset({
      cost: 20000,
      bonusDepreciationEligible: true
    })
    const result = calculateDepreciation(asset, 2025, 5000)
    expect(result.section179).toBe(5000)
    // Bonus: 40% of ($20,000 - $5,000) = $6,000
    expect(result.bonusDepreciation).toBe(6000)
    // MACRS on $20,000 - $5,000 - $6,000 = $9,000 × 14.29% = $1,286.10
    expect(result.macrsDepreciation).toBeCloseTo(1286.1, 0)
  })

  it('returns zero for future assets', () => {
    const asset = makeAsset({
      datePlacedInService: new Date(2026, 5, 1)
    })
    const result = calculateDepreciation(asset, 2025)
    expect(result.totalDepreciation).toBe(0)
  })

  it('only applies Section 179 and bonus in year 1', () => {
    const asset = makeAsset({
      bonusDepreciationEligible: true
    })
    const result = calculateDepreciation(asset, 2026, 0)
    // Year 2: no Section 179, no bonus, just MACRS
    expect(result.section179).toBe(0)
    expect(result.bonusDepreciation).toBe(0)
    // MACRS on $6,000 basis (after bonus): 24.49%
    expect(result.macrsDepreciation).toBeGreaterThan(0)
  })
})
