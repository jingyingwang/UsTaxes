import * as fc from 'fast-check'
import { testKit, commonTests } from '.'

jest.setTimeout(40000)

describe('NOL Deduction', () => {
  it('should not produce a deduction when no NOL carryforwards exist', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          const ws = f1040.schedule1.nolWorksheet
          // With no carryforwards, worksheet should not exist
          expect(ws).toBeUndefined()
          // Line 8a should be undefined (no NOL)
          expect(f1040.schedule1.l8a()).toBeUndefined()
          return Promise.resolve()
        },
        (info) => info.netOperatingLossCarryforwards.length === 0
      )
    )
  })

  it('should produce a non-positive deduction on line 8a when NOLs exist', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          const l8a = f1040.schedule1.l8a()
          if (l8a !== undefined) {
            // NOL deduction on Schedule 1 line 8a should be negative or zero
            expect(l8a).toBeLessThanOrEqual(0)
          }
          return Promise.resolve()
        },
        (info) =>
          info.netOperatingLossCarryforwards.length > 0 &&
          info.netOperatingLossCarryforwards.some((n) => n.amount > 0)
      )
    )
  })

  it('should not deduct more than 80% of taxable income for post-TCJA NOLs', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          const ws = f1040.schedule1.nolWorksheet
          if (ws !== undefined && ws.totalPreTCJANOL() === 0) {
            // When all NOLs are post-TCJA, deduction should not
            // exceed 80% of taxable income (before NOL)
            const taxableIncome = ws.taxableIncomeBeforeNOL()
            const deduction = ws.allowableDeduction()
            expect(deduction).toBeLessThanOrEqual(
              Math.floor(taxableIncome * 0.8)
            )
          }
          return Promise.resolve()
        },
        (info) =>
          info.netOperatingLossCarryforwards.length > 0 &&
          info.netOperatingLossCarryforwards.some((n) => n.amount > 0)
      )
    )
  })

  it('should never deduct more than the total available NOL', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          const ws = f1040.schedule1.nolWorksheet
          if (ws !== undefined) {
            expect(ws.allowableDeduction()).toBeLessThanOrEqual(
              ws.totalAvailableNOL()
            )
          }
          return Promise.resolve()
        },
        (info) =>
          info.netOperatingLossCarryforwards.length > 0 &&
          info.netOperatingLossCarryforwards.some((n) => n.amount > 0)
      )
    )
  })

  it('remaining carryforwards should sum to total minus deduction', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          const ws = f1040.schedule1.nolWorksheet
          if (ws !== undefined) {
            const remaining = ws
              .remainingCarryforwards()
              .reduce((sum, n) => sum + n.amount, 0)
            expect(remaining).toBe(
              ws.totalAvailableNOL() - ws.allowableDeduction()
            )
          }
          return Promise.resolve()
        },
        (info) =>
          info.netOperatingLossCarryforwards.length > 0 &&
          info.netOperatingLossCarryforwards.some((n) => n.amount > 0)
      )
    )
  })

  it('AGI should never be negative', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        expect(f1040.l11()).toBeGreaterThanOrEqual(0)
        return Promise.resolve()
      })
    )
  })
})
