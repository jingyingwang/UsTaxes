import * as fc from 'fast-check'
import { testKit, commonTests } from '.'
import { CapitalLossCarryforward, FilingStatus } from 'ustaxes/core/data'

describe('ScheduleD', () => {
  it('should never pass through more than allowed losses', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          expect(Math.round(f1040.l7() ?? 0)).toBeGreaterThanOrEqual(
            -f1040.scheduleD.l21Min()
          )
        }
        return Promise.resolve()
      })
    )
  })

  it('should enforce $3,000 loss limit for non-MFS filers', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleD.isNeeded()) {
            const l21 = f1040.scheduleD.l21()
            if (l21 !== undefined) {
              expect(l21).toBeGreaterThanOrEqual(-3000)
            }
          }
          return Promise.resolve()
        },
        (info) => info.taxPayer.filingStatus !== FilingStatus.MFS
      )
    )
  })

  it('should enforce $1,500 loss limit for MFS filers', async () => {
    await fc.assert(
      testKit.with1040Property(
        (forms): Promise<void> => {
          const f1040 = commonTests.findF1040OrFail(forms)
          if (f1040.scheduleD.isNeeded()) {
            const l21 = f1040.scheduleD.l21()
            if (l21 !== undefined) {
              expect(l21).toBeGreaterThanOrEqual(-1500)
            }
          }
          return Promise.resolve()
        },
        (info) => info.taxPayer.filingStatus === FilingStatus.MFS
      )
    )
  })

  it('should correctly net short-term and long-term gains on l16', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          const l7 = f1040.scheduleD.l7()
          const l15 = f1040.scheduleD.l15()
          const l16 = f1040.scheduleD.l16()
          // l16 should be exact sum of l7 and l15
          expect(Math.round(l16 * 100)).toEqual(Math.round((l7 + l15) * 100))
        }
        return Promise.resolve()
      })
    )
  })

  it('should have non-negative total loss carryforward', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          expect(f1040.scheduleD.lossCarryForward()).toBeGreaterThanOrEqual(0)
        }
        return Promise.resolve()
      })
    )
  })

  it('should split carryforward by type correctly', async () => {
    await fc.assert(
      testKit.with1040Property((forms): Promise<void> => {
        const f1040 = commonTests.findF1040OrFail(forms)
        if (f1040.scheduleD.isNeeded()) {
          const byType = f1040.scheduleD.lossCarryForwardByType()
          expect(byType.shortTerm).toBeGreaterThanOrEqual(0)
          expect(byType.longTerm).toBeGreaterThanOrEqual(0)
        }
        return Promise.resolve()
      })
    )
  })

  describe('carryforward input', () => {
    it('should incorporate short-term carryforward on line 6', async () => {
      const carryforward: CapitalLossCarryforward = {
        shortTerm: 5000,
        longTerm: 0
      }
      await fc.assert(
        testKit.with1040Property(
          (forms): Promise<void> => {
            const f1040 = commonTests.findF1040OrFail(forms)
            const l6 = f1040.scheduleD.l6()
            // l6 should be -5000 (entered as negative on the form)
            expect(l6).toEqual(-5000)
            return Promise.resolve()
          },
          (info) => {
            info.capitalLossCarryforward = carryforward
            return true
          }
        )
      )
    })

    it('should incorporate long-term carryforward on line 14', async () => {
      const carryforward: CapitalLossCarryforward = {
        shortTerm: 0,
        longTerm: 8000
      }
      await fc.assert(
        testKit.with1040Property(
          (forms): Promise<void> => {
            const f1040 = commonTests.findF1040OrFail(forms)
            const l14 = f1040.scheduleD.l14()
            expect(l14).toEqual(-8000)
            return Promise.resolve()
          },
          (info) => {
            info.capitalLossCarryforward = carryforward
            return true
          }
        )
      )
    })

    it('should be needed when carryforward exists with no other transactions', async () => {
      const carryforward: CapitalLossCarryforward = {
        shortTerm: 1000,
        longTerm: 2000
      }
      await fc.assert(
        testKit.with1040Property(
          (forms): Promise<void> => {
            const f1040 = commonTests.findF1040OrFail(forms)
            expect(f1040.scheduleD.isNeeded()).toBe(true)
            return Promise.resolve()
          },
          (info) => {
            info.capitalLossCarryforward = carryforward
            // Filter to cases with no 1099-B to isolate carryforward trigger
            return info.f1099s.length === 0
          }
        )
      )
    })
  })
})
