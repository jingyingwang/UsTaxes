import { FilingStatus, F1098e } from 'ustaxes/core/data'
import StudentLoanInterestWorksheet from '../irsForms/worksheets/StudentLoanInterestWorksheet'
import F1040 from '../irsForms/F1040'

/**
 * Creates a minimal mock F1040 with the fields that
 * StudentLoanInterestWorksheet actually reads.
 */
function mockF1040(opts: {
  filingStatus: FilingStatus
  totalIncome: number
  isTaxpayerDependent?: boolean
  isSpouseDependent?: boolean
  schedule1Deductions?: number
}): F1040 {
  const zeroFn = () => undefined as number | undefined
  return {
    info: {
      taxPayer: {
        filingStatus: opts.filingStatus,
        primaryPerson: {
          isTaxpayerDependent: opts.isTaxpayerDependent ?? false
        },
        spouse:
          opts.filingStatus === FilingStatus.MFJ
            ? { isTaxpayerDependent: opts.isSpouseDependent ?? false }
            : undefined
      }
    },
    l9: () => opts.totalIncome,
    schedule1: {
      l11: zeroFn,
      l12: zeroFn,
      l13: zeroFn,
      l14: zeroFn,
      l15: zeroFn,
      l16: zeroFn,
      l17: () => opts.schedule1Deductions ?? undefined,
      l18: zeroFn,
      l19a: zeroFn,
      l20: zeroFn
    }
  } as unknown as F1040
}

function makeWorksheet(
  filingStatus: FilingStatus,
  totalIncome: number,
  interestAmounts: number[],
  overrides?: {
    isTaxpayerDependent?: boolean
    isSpouseDependent?: boolean
    schedule1Deductions?: number
  }
): StudentLoanInterestWorksheet {
  const f1098es: F1098e[] = interestAmounts.map((interest, i) => ({
    lender: `Lender ${i + 1}`,
    interest
  }))
  const f1040 = mockF1040({
    filingStatus,
    totalIncome,
    ...overrides
  })
  return new StudentLoanInterestWorksheet(f1040, f1098es)
}

describe('StudentLoanInterestWorksheet Y2024', () => {
  describe('full deduction (MAGI below threshold)', () => {
    it('single filer with MAGI below $80K gets full deduction', () => {
      const ws = makeWorksheet(FilingStatus.S, 60000, [1500])
      expect(ws.l1()).toBe(1500)
      expect(ws.l5()).toBe(80000)
      expect(ws.l6()).toBe(0) // 60000 - 80000 = negative, clamped to 0
      expect(ws.l7()).toBe(0)
      expect(ws.l8()).toBe(0)
      expect(ws.l9()).toBe(1500) // full deduction
    })

    it('MFJ filer with MAGI below $165K gets full deduction', () => {
      const ws = makeWorksheet(FilingStatus.MFJ, 150000, [2500])
      expect(ws.l5()).toBe(165000)
      expect(ws.l6()).toBe(0)
      expect(ws.l9()).toBe(2500)
    })

    it('caps interest at $2,500 even with higher amounts', () => {
      const ws = makeWorksheet(FilingStatus.S, 50000, [3000])
      expect(ws.l1()).toBe(2500) // capped
      expect(ws.l9()).toBe(2500)
    })

    it('sums interest from multiple 1098-E forms', () => {
      const ws = makeWorksheet(FilingStatus.S, 50000, [800, 700, 500])
      expect(ws.l1()).toBe(2000)
      expect(ws.l9()).toBe(2000)
    })
  })

  describe('partial deduction (MAGI in phase-out range)', () => {
    it('single filer at midpoint of phase-out ($87,500) loses half', () => {
      // Phase-out: $80K-$95K, range $15K
      // At $87,500: excess = $7,500, fraction = 7500/15000 = 0.5
      const ws = makeWorksheet(FilingStatus.S, 87500, [2500])
      expect(ws.l5()).toBe(80000)
      expect(ws.l6()).toBe(7500)
      expect(ws.l7()).toBeCloseTo(0.5)
      expect(ws.l8()).toBeCloseTo(1250) // 2500 * 0.5
      expect(ws.l9()).toBeCloseTo(1250) // 2500 - 1250
    })

    it('MFJ filer at midpoint of phase-out ($180K) loses half', () => {
      // Phase-out: $165K-$195K, range $30K
      // At $180K: excess = $15K, fraction = 15000/30000 = 0.5
      const ws = makeWorksheet(FilingStatus.MFJ, 180000, [2500])
      expect(ws.l5()).toBe(165000)
      expect(ws.l6()).toBe(15000)
      expect(ws.l7()).toBeCloseTo(0.5)
      expect(ws.l8()).toBeCloseTo(1250)
      expect(ws.l9()).toBeCloseTo(1250)
    })

    it('single filer near bottom of phase-out gets most of deduction', () => {
      // At $82,000: excess = $2K, fraction = 2000/15000 ≈ 0.1333
      const ws = makeWorksheet(FilingStatus.S, 82000, [2500])
      expect(ws.l6()).toBe(2000)
      expect(ws.l7()).toBeCloseTo(2000 / 15000)
      expect(ws.l9()).toBeCloseTo(2500 - 2500 * (2000 / 15000))
    })

    it('MFJ filer near top of phase-out gets small deduction', () => {
      // At $190K: excess = $25K, fraction = 25000/30000 ≈ 0.8333
      const ws = makeWorksheet(FilingStatus.MFJ, 190000, [2500])
      expect(ws.l6()).toBe(25000)
      expect(ws.l7()).toBeCloseTo(25000 / 30000)
      expect(ws.l9()).toBeCloseTo(2500 - 2500 * (25000 / 30000))
    })
  })

  describe('no deduction (MAGI above phase-out)', () => {
    it('single filer above $95K gets no deduction', () => {
      const ws = makeWorksheet(FilingStatus.S, 100000, [2500])
      expect(ws.l6()).toBe(20000) // 100000 - 80000
      expect(ws.l7()).toBe(1) // capped at 1
      expect(ws.l8()).toBe(2500) // full phase-out
      expect(ws.l9()).toBe(0)
    })

    it('MFJ filer above $195K gets no deduction', () => {
      const ws = makeWorksheet(FilingStatus.MFJ, 200000, [2500])
      expect(ws.l6()).toBe(35000) // 200000 - 165000
      expect(ws.l7()).toBe(1) // capped at 1
      expect(ws.l9()).toBe(0)
    })

    it('single filer at exactly $95K (top of range) gets no deduction', () => {
      const ws = makeWorksheet(FilingStatus.S, 95000, [2500])
      expect(ws.l6()).toBe(15000)
      expect(ws.l7()).toBe(1) // 15000/15000 = 1
      expect(ws.l9()).toBe(0)
    })

    it('MFJ filer at exactly $195K (top of range) gets no deduction', () => {
      const ws = makeWorksheet(FilingStatus.MFJ, 195000, [2500])
      expect(ws.l6()).toBe(30000)
      expect(ws.l7()).toBe(1) // 30000/30000 = 1
      expect(ws.l9()).toBe(0)
    })
  })

  describe('MFS disqualification', () => {
    it('returns undefined for Married Filing Separately', () => {
      const ws = makeWorksheet(FilingStatus.MFS, 50000, [2500])
      expect(ws.notMFS()).toBe(false)
      expect(ws.l9()).toBeUndefined()
    })
  })

  describe('dependent checks', () => {
    it('returns undefined if primary person is a dependent', () => {
      const ws = makeWorksheet(FilingStatus.S, 50000, [2500], {
        isTaxpayerDependent: true
      })
      expect(ws.isNotDependentSelf()).toBe(false)
      expect(ws.l9()).toBeUndefined()
    })

    it('returns undefined if MFJ spouse is a dependent', () => {
      const ws = makeWorksheet(FilingStatus.MFJ, 50000, [2500], {
        isSpouseDependent: true
      })
      expect(ws.isNotDependentSpouse()).toBe(false)
      expect(ws.l9()).toBeUndefined()
    })
  })

  describe('Schedule 1 integration', () => {
    it('subtracts Schedule 1 deductions from MAGI calculation', () => {
      // Total income $90K, Schedule 1 deductions $15K => MAGI = $75K
      // $75K < $80K threshold => full deduction
      const ws = makeWorksheet(FilingStatus.S, 90000, [2000], {
        schedule1Deductions: 15000
      })
      expect(ws.l2()).toBe(90000)
      expect(ws.l3()).toBe(15000)
      expect(ws.l4()).toBe(75000) // MAGI
      expect(ws.l9()).toBe(2000) // full deduction
    })
  })
})
